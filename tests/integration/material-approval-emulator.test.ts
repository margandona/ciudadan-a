process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8088";
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9098";
process.env.GCLOUD_PROJECT = "pclab-integration";

import { beforeAll, describe, expect, it } from "vitest";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { FirestoreMaterialRepository } from "@pclab/infrastructure";
import {
  ApproveMaterialUseCase,
  CorrectMaterialUseCase,
  GenerateMaterialUseCase,
  ReadyToPrintUseCase,
  ResubmitMaterialUseCase,
  SendMaterialForReviewV2UseCase,
} from "@pclab/application";
import { MATERIAL_STATUS, MATERIAL_TYPE } from "@pclab/shared";
import type { UserDirectoryRepository } from "@pclab/application";

const COURSE = "course-apr-2026";
const EV = "evaluadora-apr@demo.cl";
const PIE = "pie-apr@demo.cl";
const UTP = "utp-apr@demo.cl";

const TEACHER = { uid: "teachApr", role: "PROFESOR", courses: [COURSE] };

let db: ReturnType<typeof getFirestore>;
const uids: Record<string, string> = {};

class AdminUserDirectory implements UserDirectoryRepository {
  async uidByEmail(email: string): Promise<string | null> {
    return uids[email] ?? null;
  }
}

async function ensureUser(email: string, role: string): Promise<string> {
  const existing = await getAuth().getUserByEmail(email).catch(() => null);
  const uid = existing?.uid ?? (await getAuth().createUser({ email, password: "Demo1234", displayName: role })).uid;
  await getAuth().setCustomUserClaims(uid, { role, courses: [COURSE] });
  uids[email] = uid;
  return uid;
}

beforeAll(async () => {
  if (getApps().length === 0) initializeApp({ projectId: "pclab-integration" });
  db = getFirestore();
  await ensureUser(EV, "EVALUADOR");
  await ensureUser(PIE, "PIE");
  await ensureUser(UTP, "UTP");
  const snap = await db.collection("materials").where("courseId", "==", COURSE).get();
  for (const d of snap.docs) {
    await d.ref.collection("versions").get().then((s) => Promise.all(s.docs.map((x) => x.ref.delete())));
    await d.ref.collection("reviewComments").get().then((s) => Promise.all(s.docs.map((x) => x.ref.delete())));
    await d.ref.collection("reviewRequests").get().then((s) => Promise.all(s.docs.map((x) => x.ref.delete())));
    await d.ref.collection("approvals").get().then((s) => Promise.all(s.docs.map((x) => x.ref.delete())));
    await d.ref.delete();
  }
});

const AUDIT = { log: async () => undefined };

describe("Flujo de revisión institucional (multi-actor, integración)", () => {
  it("FLOW 1: genera → envía → evaluadora solicita cambios → corrige → reenvía → aprueban → READY_TO_PRINT", async () => {
    const repo = new FirestoreMaterialRepository(db);
    const m = await new GenerateMaterialUseCase({ materials: repo }).run(
      { courseId: COURSE, classId: "class-06", type: MATERIAL_TYPE.WRITTEN_TEST, title: "Prueba U3 (aprobación)", classDate: "2026-08-20T18:00:00.000Z", requiresPrinting: true },
      TEACHER,
    );
    expect(m.status).toBe(MATERIAL_STATUS.BORRADOR);
    expect(m.content?.items?.length).toBeGreaterThan(0);
    expect(m.reviewDeadline?.slice(0, 10)).toBe("2026-08-13");

    const send = new SendMaterialForReviewV2UseCase({ materials: repo, users: new AdminUserDirectory(), audit: AUDIT });
    const sent = await send.run({ materialId: m.id, courseId: COURSE, evaluatorEmail: EV, pieEmail: PIE, utpEmail: UTP }, TEACHER);
    expect(sent.status).toBe(MATERIAL_STATUS.EN_REVISION);

    const approve = new ApproveMaterialUseCase({ materials: repo, audit: AUDIT });
    const actor = (role: string, uid: string) => ({ uid, role, courses: [COURSE] });
    await approve.run({ materialId: m.id, courseId: COURSE, decision: "SOLICITA_CAMBIOS", comment: "Segmenta el ítem 3." }, actor("EVALUADOR", uids[EV]!));
    let current = await repo.getById(m.id);
    expect(current?.status).toBe(MATERIAL_STATUS.REQUIERE_CAMBIOS);

    const correct = new CorrectMaterialUseCase({ materials: repo, audit: AUDIT });
    const corrected = await correct.run({ materialId: m.id, courseId: COURSE, content: m.content!, changeSummary: "Ítem 3 segmentado" }, TEACHER);
    expect(corrected.status).toBe(MATERIAL_STATUS.CORREGIDO);
    expect(corrected.version).toBe(2);

    const resubmit = new ResubmitMaterialUseCase({ materials: repo, audit: AUDIT });
    await resubmit.run({ materialId: m.id, courseId: COURSE }, TEACHER);

    for (const [role, email] of [["EVALUADOR", EV], ["PIE", PIE], ["UTP", UTP]] as const) {
      await approve.run({ materialId: m.id, courseId: COURSE, decision: "APROBADO", comment: "OK" }, actor(role, uids[email]!));
    }
    current = await repo.getById(m.id);
    expect(current?.status).toBe(MATERIAL_STATUS.APROBADO_FINAL);

    const ready = new ReadyToPrintUseCase({ materials: repo, audit: AUDIT });
    const printable = await ready.run({ materialId: m.id, courseId: COURSE }, TEACHER);
    expect(printable.status).toBe(MATERIAL_STATUS.READY_TO_PRINT);
    expect(printable.printDeadline?.slice(0, 10)).toBe("2026-08-17");
  });

  it("FLOW 3: no imprime sin aprobación PIE (bloqueado)", async () => {
    const repo = new FirestoreMaterialRepository(db);
    const m = await new GenerateMaterialUseCase({ materials: repo }).run(
      { courseId: COURSE, type: MATERIAL_TYPE.WRITTEN_TEST, title: "Prueba bloqueada", classDate: "2026-08-20T18:00:00.000Z" },
      TEACHER,
    );
    const send = new SendMaterialForReviewV2UseCase({ materials: repo, users: new AdminUserDirectory(), audit: AUDIT });
    await send.run({ materialId: m.id, courseId: COURSE, evaluatorEmail: EV, pieEmail: PIE, utpEmail: UTP }, TEACHER);
    const approve = new ApproveMaterialUseCase({ materials: repo, audit: AUDIT });
    await approve.run({ materialId: m.id, courseId: COURSE, decision: "APROBADO", comment: "OK" }, { uid: uids[EV]!, role: "EVALUADOR", courses: [COURSE] });
    // PIE sigue PENDIENTE → no es APROBADO_FINAL → bloqueado
    await expect(new ReadyToPrintUseCase({ materials: repo, audit: AUDIT }).run({ materialId: m.id, courseId: COURSE }, TEACHER)).rejects.toThrow();
  });
});
