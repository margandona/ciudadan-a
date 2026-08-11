process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8088";
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9098";
process.env.GCLOUD_PROJECT = "pclab-integration";

import { beforeAll, describe, expect, it } from "vitest";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  FirestorePresentationRepository,
  FirestoreProjectionTokenRepository,
  FirestoreVoteRepository,
} from "@pclab/infrastructure";
import {
  CreateProjectionTokenUseCase,
  GetPresentationUseCase,
  GetVotesUseCase,
  RecordManualVotesUseCase,
  SubmitVoteUseCase,
} from "@pclab/application";
import type { Slide, SlideDeck, SlideKind } from "@pclab/shared";

const COURSE = "course-proj-2026";
const CLASS = "class-01";

const TEACHER = { uid: "teachProj", role: "PROFESOR", courses: [COURSE] };
const STUDENT = { uid: "studProj", role: "ESTUDIANTE", courses: [COURSE] };

let db: ReturnType<typeof getFirestore>;

function makeDeck(): SlideDeck {
  const slides: Slide[] = (["portada", "aprendizaje", "objetivo", "ruta", "activacion", "contenido"] as SlideKind[]).map((kind, i) => ({
    id: `s${i}`,
    kind,
    blocks: [{ id: `b${i}`, type: "text", text: kind }],
  }));
  slides.push({
    id: "sq",
    kind: "pregunta",
    blocks: [{ id: "bq", type: "question", title: "Q", text: "¿Quién resuelve?", options: ["Estado", "Mercado"], correctIndex: 0 }],
  });
  slides.push({ id: "st", kind: "ticket", blocks: [{ id: "bt", type: "text", text: "ticket" }] });
  return { classId: CLASS, courseId: COURSE, version: 1, config: { showAnswers: true }, updatedAt: new Date().toISOString(), updatedBy: "t", slides };
}

beforeAll(async () => {
  if (getApps().length === 0) initializeApp({ projectId: "pclab-integration" });
  db = getFirestore();
  await db.collection("presentations").doc(CLASS).delete().catch(() => undefined);
  await db.collection("projectionTokens").doc(CLASS).collection("tokens").get().then(async (s) => {
    await Promise.all(s.docs.map((d) => d.ref.delete()));
  }).catch(() => undefined);
  await db.collection("projections").doc(CLASS).collection("votes").doc("bq").delete().catch(() => undefined);
});

describe("FASE 6 — modo proyección (integración)", () => {
  it("guarda el deck y lo entrega con token de proyección", async () => {
    const presentations = new FirestorePresentationRepository(db);
    await presentations.upsert(makeDeck());

    const tokensRepo = new FirestoreProjectionTokenRepository(db);
    const token = await new CreateProjectionTokenUseCase({ tokens: tokensRepo }).run(
      { classId: CLASS, courseId: COURSE },
      TEACHER,
    );
    expect(token.expiresAt).toBeTruthy();

    const getter = new GetPresentationUseCase({ presentations, tokens: tokensRepo });
    const { deck, isProjection } = await getter.run({ classId: CLASS, tokenId: token.tokenId }, null);
    expect(isProjection).toBe(true);
    expect(deck.slides[deck.slides.length - 1]!.kind).toBe("ticket");
  });

  it("la estudiante vota sin identidad y el profesor ve el agregado", async () => {
    const presentations = new FirestorePresentationRepository(db);
    const votes = new FirestoreVoteRepository(db);
    const submitter = new SubmitVoteUseCase({ presentations, votes });
    const vote = await submitter.run({ classId: CLASS, questionId: "bq", option: 0 }, STUDENT);
    expect(vote.total).toBe(1);
    expect(vote.counts["0"]).toBe(1);

    const viewer = new GetVotesUseCase({ votes });
    const result = await viewer.run({ classId: CLASS, questionId: "bq" }, TEACHER);
    expect(result?.total).toBe(1);
    expect(result).not.toHaveProperty("voters");
  });

  it("el profesor registra conteo manual (modo sin dispositivos)", async () => {
    const presentations = new FirestorePresentationRepository(db);
    const votes = new FirestoreVoteRepository(db);
    const recorder = new RecordManualVotesUseCase({ presentations, votes });
    const result = await recorder.run({ classId: CLASS, questionId: "bq", counts: { "0": 8, "1": 5 } }, TEACHER);
    expect(result.total).toBe(13);
  });
});
