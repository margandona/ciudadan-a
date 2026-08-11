process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8088";
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9098";
process.env.GCLOUD_PROJECT = "pclab-integration";

import { beforeAll, describe, expect, it } from "vitest";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  FirestoreClassRepository,
  FirestoreExitTicketRepository,
  FirestoreFlippedProgressRepository,
  FirestoreMaterialRepository,
  FirestoreParticipationRepository,
  FirestoreStudentRepository,
  FirestoreSubmissionRepository,
} from "@pclab/infrastructure";
import {
  GetCalendarAlertsUseCase,
  GetClassDashboardUseCase,
  GetCourseDashboardUseCase,
  GetParticipationOverviewUseCase,
  RegisterParticipationUseCase,
} from "@pclab/application";

const COURSE = "course-part-dash-2026";

const TEACHER = { uid: "teachDash", role: "PROFESOR", courses: [COURSE] };
const NOW = "2026-08-10T12:00:00.000Z";

let db: ReturnType<typeof getFirestore>;

beforeAll(async () => {
  if (getApps().length === 0) initializeApp({ projectId: "pclab-integration" });
  db = getFirestore();

  // Limpieza
  await db.collection("courses").doc(COURSE).delete().catch(() => undefined);
  const students = await db.collection("students").where("courseId", "==", COURSE).get();
  await Promise.all(students.docs.map((d) => d.ref.delete()));
  await db.collection("flippedProgress").doc("class-01").collection("records").where("courseId", "==", COURSE).get().then(async (s) => {
    await Promise.all(s.docs.map((d) => d.ref.delete()));
  }).catch(() => undefined);
  const subs = await db.collection("submissions").where("courseId", "==", COURSE).get();
  await Promise.all(subs.docs.map((d) => d.ref.delete()));
  const participation = await db.collection("participation").doc(COURSE).collection("class-01").get();
  await Promise.all(participation.docs.map((d) => d.ref.delete()));
  await db.collection("materials").where("courseId", "==", COURSE).get().then(async (s) => {
    await Promise.all(s.docs.map((d) => d.ref.delete()));
  }).catch(() => undefined);

  await db.collection("courses").doc(COURSE).set({ name: "Curso Dash", section: "Z", year: 2026, active: true });
  await db.collection("students").doc("sd1").set({ id: "sd1", displayName: "Dash Uno", normalizedSearchName: "dash uno", courseId: COURSE, active: true, createdAt: new Date(), updatedAt: new Date(), academicProfile: { participationTrackingEnabled: true, gamificationEnabled: true } });
  await db.collection("students").doc("sd2").set({ id: "sd2", displayName: "Dash Dos", normalizedSearchName: "dash dos", courseId: COURSE, active: true, createdAt: new Date(), updatedAt: new Date(), academicProfile: { participationTrackingEnabled: true, gamificationEnabled: true } });
  await db.collection("flippedProgress").doc("class-01").collection("records").doc("sd1").set({ classId: "class-01", studentId: "sd1", courseId: COURSE, ready: true, progressPercent: 100, blocksVisited: ["a"], interactionSeconds: 10, quizAttempts: 0, quizScore: null, updatedAt: new Date() });
  await db.collection("submissions").add({ activityId: "act-1", studentId: "sd1", classId: "class-01", courseId: COURSE, status: "ENTREGADO", content: { text: "x" }, attachments: [], attempts: 1, updatedAt: new Date() });
  await db.collection("exitTickets").doc("class-01").collection("tickets").doc("sd1").set({ classId: "class-01", courseId: COURSE, studentId: "sd1", answers: { learned: "a", evidence: "b", concept: "c", question: "d", relationOvalle: "e" }, difficulty: 3, submittedAt: new Date() });
  await db.collection("materials").doc("mat-1").set({ id: "mat-1", courseId: COURSE, classId: "class-05", type: "guia", title: "Guía vencida", status: "BORRADOR", hasDUA: false, printDeadline: new Date("2026-08-07T18:00:00.000Z"), updatedAt: new Date() });
});

describe("FASE 5 — participación y dashboards (integración)", () => {
  it("registra participación en lote y agrega el resumen", async () => {
    const repo = new FirestoreParticipationRepository(db);
    const register = new RegisterParticipationUseCase({ participation: repo });
    const saved = await register.run(
      { courseId: COURSE, classId: "class-01", entries: [
        { studentId: "sd1", skill: "argumentacion", level: 3 },
        { studentId: "sd2", skill: "colaboracion", level: 2 },
      ] },
      TEACHER,
    );
    expect(saved).toBe(2);

    const overview = new GetParticipationOverviewUseCase({ participation: repo });
    const result = await overview.run(COURSE, "class-01", TEACHER);
    expect(result.total).toBe(2);
    expect(result.studentCount).toBe(2);
    expect(result.bySkill.argumentacion.count).toBe(1);
  });

  it("el dashboard del curso agrega flipped, evidencias, tickets y participación", async () => {
    const uc = new GetCourseDashboardUseCase({
      students: new FirestoreStudentRepository(db),
      classes: new FirestoreClassRepository(db),
      flipped: new FirestoreFlippedProgressRepository(db),
      submissions: new FirestoreSubmissionRepository(db),
      exitTickets: new FirestoreExitTicketRepository(db),
      participation: new FirestoreParticipationRepository(db),
    });
    const dash = await uc.run(COURSE, TEACHER);
    expect(dash.totalStudents).toBe(2);
    expect(dash.flippedCompleted).toBe(1);
    expect(dash.submissions).toBe(1);
    expect(dash.pendingEvidences).toBe(1);
    expect(dash.exitTickets).toBe(1);
    expect(dash.participation).toBe(2);
    expect(dash.avgDifficulty).toBe(3);
  });

  it("el dashboard de clase y el calendario reportan", async () => {
    const classDash = new GetClassDashboardUseCase({
      flipped: new FirestoreFlippedProgressRepository(db),
      submissions: new FirestoreSubmissionRepository(db),
      exitTickets: new FirestoreExitTicketRepository(db),
      participation: new FirestoreParticipationRepository(db),
    });
    const dash = await classDash.run(COURSE, "class-01", TEACHER);
    expect(dash.flippedCompleted).toBe(1);
    expect(dash.submissions).toBe(1);

    const calendar = new GetCalendarAlertsUseCase({ materials: new FirestoreMaterialRepository(db) });
    const alerts = await calendar.run(COURSE, TEACHER, NOW);
    expect(alerts.length).toBe(1);
    expect(alerts[0]?.status).toBe("red");
  });
});
