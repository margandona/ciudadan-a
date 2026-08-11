process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8088";
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9098";
process.env.GCLOUD_PROJECT = "pclab-integration";

import { beforeAll, describe, expect, it } from "vitest";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { FirestoreMaterialRepository } from "@pclab/infrastructure";
import {
  AddMaterialVersionUseCase,
  CreateMaterialUseCase,
  GetMaterialDetailUseCase,
  ListMaterialsForEvaluatorUseCase,
  ReviewMaterialUseCase,
  SendMaterialForReviewUseCase,
} from "@pclab/application";
import { MATERIAL_STATUS } from "@pclab/shared";
import type { UserDirectoryRepository } from "@pclab/application";

const COURSE = "course-mat-2026";
const EVALUATOR_EMAIL = "evaluadora-review@demo.cl";

const TEACHER = { uid: "teachMat", role: "PROFESOR", courses: [COURSE] };

let db: ReturnType<typeof getFirestore>;

class AdminUserDirectory implements UserDirectoryRepository {
  async uidByEmail(email: string): Promise<string | null> {
    const user = await getAuth().getUserByEmail(email).catch(() => null);
    return user?.uid ?? null;
  }
}

beforeAll(async () => {
  if (getApps().length === 0) initializeApp({ projectId: "pclab-integration" });
  db = getFirestore();

  // Evaluador demo con claims EVALUADOR
  const evaluator = await getAuth().getUserByEmail(EVALUATOR_EMAIL).catch(() => null);
  const evaluatorUid = evaluator?.uid ?? (await getAuth().createUser({ email: EVALUATOR_EMAIL, password: "Demo1234", displayName: "Evaluadora Review" })).uid;
  await getAuth().setCustomUserClaims(evaluatorUid, { role: "EVALUADOR", courses: [COURSE] });

  // Limpieza de materiales del curso
  const snap = await db.collection("materials").where("courseId", "==", COURSE).get();
  for (const d of snap.docs) {
    await db.collection("materials").doc(d.id).collection("versions").get().then((s) => Promise.all(s.docs.map((x) => x.ref.delete())));
    await db.collection("materials").doc(d.id).collection("reviewComments").get().then((s) => Promise.all(s.docs.map((x) => x.ref.delete())));
    await db.collection("materials").doc(d.id).collection("reviewRequests").get().then((s) => Promise.all(s.docs.map((x) => x.ref.delete())));
    await d.ref.delete();
  }
});

const EVALUATOR_ACTOR = { uid: "ignored", role: "EVALUADOR", courses: [COURSE] };

describe("FASE 7 — materiales y revisión del evaluador (integración)", () => {
  it("crea, versiona (general + DUA), envía y el evaluador aprueba", async () => {
    const repo = new FirestoreMaterialRepository(db);

    const created = await new CreateMaterialUseCase({ materials: repo }).run(
      { courseId: COURSE, type: "evaluacion", title: "Evaluación Cabildo", hasDUA: true, classId: "class-06" },
      TEACHER,
    );
    expect(created.status).toBe(MATERIAL_STATUS.BORRADOR);

    const adder = new AddMaterialVersionUseCase({ materials: repo });
    await adder.run({ materialId: created.id, courseId: COURSE, kind: "GENERAL", fileName: "eval.pdf", mime: "application/pdf", url: "https://example.com/eval.pdf" }, TEACHER);
    await adder.run({ materialId: created.id, courseId: COURSE, kind: "DUA", fileName: "eval-dua.pdf", mime: "application/pdf", url: "https://example.com/eval-dua.pdf" }, TEACHER);

    const sent = await new SendMaterialForReviewUseCase({ materials: repo, users: new AdminUserDirectory(), audit: { log: async () => undefined } }).run(
      { materialId: created.id, courseId: COURSE, evaluatorEmail: EVALUATOR_EMAIL },
      TEACHER,
    );
    expect(sent.status).toBe(MATERIAL_STATUS.EN_REVISION);

    // El evaluador la ve en su portal
    const evaluatorUid = (await getAuth().getUserByEmail(EVALUATOR_EMAIL)).uid;
    const evaluatorActor = { uid: evaluatorUid, role: "EVALUADOR", courses: [COURSE] };
    const list = await new ListMaterialsForEvaluatorUseCase({ materials: repo }).run(evaluatorActor);
    expect(list.map((m) => m.id)).toContain(created.id);

    // Aprueba con comentario
    const detail = await new ReviewMaterialUseCase({ materials: repo, audit: { log: async () => undefined } }).run(
      { materialId: created.id, courseId: COURSE, status: MATERIAL_STATUS.APROBADO, comment: "Aprobada con rúbrica clara." },
      evaluatorActor,
    );
    expect(detail.material.status).toBe(MATERIAL_STATUS.APROBADO);
    expect(detail.versions).toHaveLength(2);
    expect(detail.comments).toHaveLength(1);
    expect(detail.versions[0]!.kind).toBe("GENERAL");
    expect(detail.versions[1]!.kind).toBe("DUA");
  });

  it("el detalle no expone datos de estudiantes", async () => {
    const repo = new FirestoreMaterialRepository(db);
    const list = await new ListMaterialsForEvaluatorUseCase({ materials: repo }).run(EVALUATOR_ACTOR);
    if (list[0]) {
      const detail = await new GetMaterialDetailUseCase({ materials: repo }).run(list[0].id, EVALUATOR_ACTOR);
      expect(detail).not.toHaveProperty("students");
    }
  });
});
