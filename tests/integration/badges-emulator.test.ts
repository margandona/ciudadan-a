process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8088";
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9098";
process.env.GCLOUD_PROJECT = "pclab-integration";

import { beforeAll, describe, expect, it } from "vitest";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  FirestoreActivityStatsRepository,
  FirestoreBadgeRepository,
  FirestoreClassRepository,
  FirestoreExitTicketRepository,
  FirestoreFlippedProgressRepository,
  FirestoreParticipationRepository,
  FirestoreQuizAttemptRepository,
  FirestoreQuizRepository,
  FirestoreStudentBadgeRepository,
  FirestoreSubmissionRepository,
} from "@pclab/infrastructure";
import { AwardBadgeUseCase, EvaluateAndAwardBadgesUseCase, GetBadgesForStudentUseCase } from "@pclab/application";
import { ROLES } from "@pclab/shared";
import type { Badge } from "@pclab/shared";

const COURSE = "course-badges-2026";
const STUDENT_UID = "studBadge";

const BADGES: Badge[] = [
  { id: "b1", code: "ANALISTA", name: "Analista", description: "", icon: "spyglass", order: 1, level: 1, criteria: [{ kind: "QUIZ_PASSED", threshold: 2 }] },
  { id: "b2", code: "CARTOGRAFA", name: "Cartógrafa", description: "", icon: "map", order: 2, level: 1, criteria: [{ kind: "FLIPPED_COMPLETED", threshold: 3 }] },
  { id: "b3", code: "CIUDADANA", name: "Ciudadana", description: "", icon: "people", order: 3, level: 1, criteria: [{ kind: "PARTICIPATION", threshold: 99 }] },
];

let db: ReturnType<typeof getFirestore>;
let stats: FirestoreActivityStatsRepository;

beforeAll(async () => {
  if (getApps().length === 0) initializeApp({ projectId: "pclab-integration" });
  db = getFirestore();
  stats = new FirestoreActivityStatsRepository({
    classes: new FirestoreClassRepository(db),
    flipped: new FirestoreFlippedProgressRepository(db),
    submissions: new FirestoreSubmissionRepository(db),
    participation: new FirestoreParticipationRepository(db),
    exitTickets: new FirestoreExitTicketRepository(db),
    quizzes: new FirestoreQuizRepository(db),
    quizAttempts: new FirestoreQuizAttemptRepository(db),
  });

  await Promise.all(["b1","b2","b3"].map((b) => db.collection("badges").doc(b).delete()).map((p) => p.catch(() => undefined)));
  for (const b of BADGES) await db.collection("badges").doc(b.id).set(b, { merge: true });

  // Limpieza
  await db.collection("students").doc(STUDENT_UID).delete().catch(() => undefined);
  await db.collection("studentBadges").doc(STUDENT_UID).collection("badges").get().then(async (s) => {
    await Promise.all(s.docs.map((d) => d.ref.delete()));
  }).catch(() => undefined);

  for (const cls of ["class-01", "class-02", "class-03"]) {
    await db.collection("classes").doc(cls).set({ id: cls, number: Number(cls.slice(-2)), missionId: cls, title: cls, unitId: "U3", oaIds: ["OA6"], order: Number(cls.slice(-2)), hasFeedback: false, flippedEnabled: true, estMinutes: 12, createdAt: new Date(), updatedAt: new Date() }, { merge: true });
    await db.collection("flippedProgress").doc(cls).collection("records").doc(STUDENT_UID).set({ classId: cls, studentId: STUDENT_UID, courseId: COURSE, ready: true, progressPercent: 100, blocksVisited: ["a"], interactionSeconds: 10, quizAttempts: 0, quizScore: null, updatedAt: new Date() }, { merge: true });
  }
  for (const quiz of ["q1", "q2"]) {
    await db.collection("quizzes").doc(quiz).set({ id: quiz, classId: "class-01", courseId: COURSE, title: quiz, mode: "INDIVIDUAL", config: { attempts: 1, points: 1, immediateFeedback: true, showExplanation: true }, shuffle: false, active: true, order: 1, questionCount: 3, createdAt: new Date(), updatedAt: new Date() }, { merge: true });
    await db.collection("quizAttempts").doc(quiz).collection("attempts").doc(STUDENT_UID).set({ quizId: quiz, studentId: STUDENT_UID, classId: "class-01", courseId: COURSE, score: 2, maxScore: 3, answers: [], status: "SUBMITTED", submittedAt: new Date() }, { merge: true });
  }
});

describe("FASE 8 — gamificación (integración)", () => {
  it("otorga medallas automáticamente según criterios y es idempotente", async () => {
    const uc = new EvaluateAndAwardBadgesUseCase({
      badges: new FirestoreBadgeRepository(db),
      studentBadges: new FirestoreStudentBadgeRepository(db),
      stats,
    });
    const first = await uc.run({ courseId: COURSE, studentId: STUDENT_UID }, { uid: "srv", role: ROLES.MASTER, courses: [] });
    expect(first.awarded.sort()).toEqual(["ANALISTA", "CARTOGRAFA"]);

    const second = await uc.run({ courseId: COURSE, studentId: STUDENT_UID }, { uid: "srv", role: ROLES.MASTER, courses: [] });
    expect(second.awarded).toEqual([]);
  });

  it("el docente otorga una medalla manualmente", async () => {
    const uc = new AwardBadgeUseCase({
      badges: new FirestoreBadgeRepository(db),
      studentBadges: new FirestoreStudentBadgeRepository(db),
      students: {
        getById: async () => ({ id: STUDENT_UID, courseId: COURSE }),
        findByCourse: async () => [],
        upsertMany: async () => ({ createdIds: [], updatedIds: [] }),
        softDelete: async () => undefined,
      } as never,
      audit: { log: async () => undefined },
    });
    const badge = await uc.run(
      { courseId: COURSE, studentId: STUDENT_UID, badgeId: "b3" },
      { uid: "teach", role: ROLES.PROFESOR, courses: [COURSE] },
    );
    expect(badge.via).toBe("teacher"); expect(badge.badgeId).toBe("b3");

    const overview = await new GetBadgesForStudentUseCase({
      badges: new FirestoreBadgeRepository(db),
      studentBadges: new FirestoreStudentBadgeRepository(db),
      stats,
    }).run({ courseId: COURSE, studentId: STUDENT_UID }, { uid: "teach", role: ROLES.PROFESOR, courses: [COURSE] });
    expect(overview.earnedCount).toBe(3);
  });
});
