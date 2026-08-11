process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8088";
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9098";
process.env.GCLOUD_PROJECT = "pclab-integration";

import { beforeAll, describe, expect, it } from "vitest";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  FirestoreClassRepository,
  FirestoreExitTicketRepository,
  FirestoreFeedbackRepository,
  FirestoreFlippedProgressRepository,
  FirestoreParticipationRepository,
  FirestoreQuizAttemptRepository,
  FirestoreQuizRepository,
  FirestoreSubmissionRepository,
} from "@pclab/infrastructure";
import { GetCourseAnalyticsUseCase, GetFeedbackTendenciesUseCase, SubmitFeedbackUseCase } from "@pclab/application";
import { ROLES } from "@pclab/shared";

const COURSE = "course-fb-2026";

const TEACHER = { uid: "teachFb", role: ROLES.PROFESOR, courses: [COURSE] };
const STUDENT_1 = { uid: "s1", role: ROLES.ESTUDIANTE, courses: [COURSE] };

let db: ReturnType<typeof getFirestore>;

const feedbackInput = {
  classId: "class-01",
  courseId: COURSE,
  anon: true,
  app: { easyToFind: 4, clear: 5, working: 5, open: "todo bien" },
  learning: { objective: 5, clarity: 5, helpful: 4, participated: 3, comfortable: 4, bestActivity: "dilemas", change: "", keep: "la votación" },
};

beforeAll(async () => {
  if (getApps().length === 0) initializeApp({ projectId: "pclab-integration" });
  db = getFirestore();

  await db.collection("feedback").doc("class-01").collection("records").where("courseId", "==", COURSE).get().then(async (s) => {
    await Promise.all(s.docs.map((d) => d.ref.delete()));
  }).catch(() => undefined);
  const oldSubs = await db.collection("submissions").where("courseId", "==", COURSE).get();
  await Promise.all(oldSubs.docs.map((d) => d.ref.delete()));
  await db.collection("classes").doc("class-01").set({ id: "class-01", number: 1, missionId: "class-01", title: "C1", unitId: "U3", oaIds: ["OA6"], order: 1, hasFeedback: true, flippedEnabled: true, estMinutes: 12, createdAt: new Date(), updatedAt: new Date() }, { merge: true });
  await db.collection("classes").doc("class-04").set({ id: "class-04", number: 4, missionId: "class-04", title: "C4", unitId: "U3", oaIds: ["OA7"], order: 4, hasFeedback: true, flippedEnabled: true, estMinutes: 12, createdAt: new Date(), updatedAt: new Date() }, { merge: true });

  await db.collection("flippedProgress").doc("class-01").collection("records").doc("s1").set({ classId: "class-01", studentId: "s1", courseId: COURSE, ready: true, progressPercent: 100, blocksVisited: ["a"], interactionSeconds: 5, quizAttempts: 0, quizScore: null, updatedAt: new Date() }, { merge: true });
  await db.collection("submissions").add({ activityId: "a", studentId: "s1", classId: "class-01", courseId: COURSE, status: "ENTREGADO", content: { text: "x" }, attachments: [], attempts: 1, updatedAt: new Date() });
  await db.collection("exitTickets").doc("class-01").collection("tickets").doc("s1").set({ classId: "class-01", courseId: COURSE, studentId: "s1", answers: { learned: "a", evidence: "b", concept: "c", question: "d", relationOvalle: "e" }, difficulty: 4, submittedAt: new Date() }, { merge: true });

  await db.collection("quizzes").doc("qf1").set({ id: "qf1", classId: "class-01", courseId: COURSE, title: "Quiz F1", mode: "INDIVIDUAL", config: { attempts: 1, points: 1, immediateFeedback: true, showExplanation: true }, shuffle: false, active: true, order: 1, questionCount: 2, createdAt: new Date(), updatedAt: new Date() }, { merge: true });
  await db.collection("quizAttempts").doc("qf1").collection("attempts").doc("s1").set({ quizId: "qf1", studentId: "s1", classId: "class-01", courseId: COURSE, score: 1, maxScore: 2, answers: [{ qid: "p1", given: 0, correct: false, points: 0 }, { qid: "p2", given: 1, correct: true, points: 1 }], status: "SUBMITTED", submittedAt: new Date() }, { merge: true });
});

describe("FASE 9 — feedback y analítica (integración)", () => {
  it("la estudiante envía feedback privado y el profesor ve tendencias agregadas", async () => {
    const repo = new FirestoreFeedbackRepository(db);
    const submit = new SubmitFeedbackUseCase({ feedback: repo });
    const saved = await submit.run({ ...feedbackInput, studentId: STUDENT_1.uid }, STUDENT_1);
    expect(saved.anon).toBe(true);

    const tendencies = await new GetFeedbackTendenciesUseCase({ feedback: repo }).run(COURSE, TEACHER);
    expect(tendencies.totalResponses).toBe(1);
    expect(tendencies.tendencies[0]!.classId).toBe("class-01");
    expect(tendencies.tendencies[0]!.avg.appEasy).toBe(4);
    expect(tendencies.tendencies[0]!.openComments[0]!.anon).toBe(true);
  });

  it("la analítica reporta alertas descriptivas y preguntas de menor rendimiento", async () => {
    const analytics = await new GetCourseAnalyticsUseCase({
      classes: new FirestoreClassRepository(db),
      flipped: new FirestoreFlippedProgressRepository(db),
      submissions: new FirestoreSubmissionRepository(db),
      exitTickets: new FirestoreExitTicketRepository(db),
      participation: new FirestoreParticipationRepository(db),
      quizzes: new FirestoreQuizRepository(db),
      quizAttempts: new FirestoreQuizAttemptRepository(db),
    }).run(COURSE, TEACHER);

    const cls = analytics.classes.find((c) => c.classId === "class-01")!;
    expect(cls.flippedPercent).toBe(100);
    expect(cls.pendingEvidences).toBe(1);
    expect(cls.avgDifficulty).toBe(4);
    expect(cls.lowPerformance.some((q) => q.questionId === "p1" && q.correctRate < 0.6)).toBe(true);
    expect(analytics.alerts.some((a) => a.includes("menor rendimiento"))).toBe(true);
    expect(analytics.alerts.join(" ")).not.toMatch(/problem[áa]tica|bajo potencial/i);
  });
});
