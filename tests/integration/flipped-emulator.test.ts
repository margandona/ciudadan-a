process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8088";
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9098";
process.env.GCLOUD_PROJECT = "pclab-integration";

import { beforeAll, describe, expect, it } from "vitest";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  FirestoreClassRepository,
  FirestoreClassScheduleRepository,
  FirestoreFlippedLessonRepository,
  FirestoreFlippedProgressRepository,
} from "@pclab/infrastructure";
import {
  GetFlippedLessonForStudentUseCase,
  GetFlippedOverviewUseCase,
  ListMissionsForStudentUseCase,
  SetClassScheduleUseCase,
  TrackFlippedProgressUseCase,
} from "@pclab/application";
import { CLASS_STATUS, type ClassEntity, type FlippedLesson } from "@pclab/shared";
import type { StudentRepository } from "@pclab/application";

const PROJECT_ID = "pclab-integration";
const COURSE = "course-3med-d-2026";

const TEACHER = { uid: "teach1", role: "PROFESOR", courses: [COURSE] };
const STUDENT = { uid: "studFlipped", role: "ESTUDIANTE", courses: [COURSE] };

let db: ReturnType<typeof getFirestore>;
let classesRepo: FirestoreClassRepository;
let schedulesRepo: FirestoreClassScheduleRepository;
let lessonsRepo: FirestoreFlippedLessonRepository;
let progressRepo: FirestoreFlippedProgressRepository;

const CLASS: ClassEntity = {
  id: "class-01",
  number: 1,
  missionId: "mission-01",
  title: "Misión 01 — ¿Qué significa ser ciudadana?",
  unitId: "U3",
  oaIds: ["OA6"],
  order: 1,
  hasFeedback: true,
  flippedEnabled: true,
  estMinutes: 12,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const LESSON: FlippedLesson = {
  classId: "class-01",
  title: "Misión 01",
  objective: "Comprender la ciudadanía.",
  problemQuestion: "¿Qué es ser ciudadana?",
  concepts: ["ciudadanía"],
  blocks: [
    { type: "title", id: "t", text: "Título" },
    { type: "text", id: "m1", markdown: "Microcontenido" },
    { type: "question", id: "q1", kind: "choice", prompt: "¿Participar?", options: ["Sí", "No"], correctIndex: 0 },
  ],
  estMinutes: 12,
  readyLabel: "Estoy lista para la misión",
  version: 1,
  updatedAt: new Date().toISOString(),
};

beforeAll(async () => {
  if (getApps().length === 0) initializeApp({ projectId: PROJECT_ID });
  db = getFirestore();
  classesRepo = new FirestoreClassRepository(db);
  schedulesRepo = new FirestoreClassScheduleRepository(db);
  lessonsRepo = new FirestoreFlippedLessonRepository(db);
  progressRepo = new FirestoreFlippedProgressRepository(db);

  // Limpieza para repetibilidad
  await db.collection("classes").doc(CLASS.id).delete().catch(() => undefined);
  await db.collection("flippedLesson").doc(CLASS.id).delete().catch(() => undefined);
  await db.collection("flippedProgress").doc(CLASS.id).collection("records").doc(STUDENT.uid).delete().catch(() => undefined);
  const audits = await db.collection("auditLogs").where("entity", "==", "classSchedules").limit(50).get();
  await Promise.all(audits.docs.map((d) => d.ref.delete()));

  // Semilla de catálogo + lección (como haría pnpm seed:content)
  await db.collection("classes").doc(CLASS.id).set(CLASS, { merge: true });
  await db.collection("flippedLesson").doc(LESSON.classId).set(LESSON, { merge: true });
});

describe("FASE 3 — clases y aula invertida (integración)", () => {
  it("el profesor programa la clase OPEN con aula invertida", async () => {
    const setter = new SetClassScheduleUseCase({ classes: classesRepo, schedules: schedulesRepo, audit: { log: async () => undefined } });
    const schedule = await setter.run({ courseId: COURSE, classId: CLASS.id, status: CLASS_STATUS.OPEN }, TEACHER);
    expect(schedule.status).toBe(CLASS_STATUS.OPEN);
    expect(schedule.availability.flippedAvailable).toBe(true);
  });

  it("la estudiante ve la misión disponible en su home", async () => {
    const uc = new ListMissionsForStudentUseCase({ classes: classesRepo, schedules: schedulesRepo, progress: progressRepo });
    const missions = await uc.run({ courseId: COURSE, studentId: STUDENT.uid }, STUDENT);
    const m1 = missions.find((m) => m.class.id === CLASS.id)!;
    expect(m1.visibility).toBe("open");
    expect(m1.flippedAvailable).toBe(true);
  });

  it("la estudiante recorre el aula invertida y llega lista", async () => {
    const getter = new GetFlippedLessonForStudentUseCase({ schedules: schedulesRepo, lessons: lessonsRepo, progress: progressRepo });
    const { lesson, progress } = await getter.run({ courseId: COURSE, classId: CLASS.id, studentId: STUDENT.uid }, STUDENT);
    expect(lesson.classId).toBe(CLASS.id);
    expect(progress.startedAt).toBeTruthy();

    const tracker = new TrackFlippedProgressUseCase({ schedules: schedulesRepo, lessons: lessonsRepo, progress: progressRepo });
    await tracker.run({ courseId: COURSE, classId: CLASS.id, studentId: STUDENT.uid, blockId: "m1" }, STUDENT);
    await tracker.run({ courseId: COURSE, classId: CLASS.id, studentId: STUDENT.uid, question: { blockId: "q1", correct: true, score: 1 } }, STUDENT);
    const final = await tracker.run({ courseId: COURSE, classId: CLASS.id, studentId: STUDENT.uid, markReady: true }, STUDENT);

    expect(final.ready).toBe(true);
    expect(final.completedAt).toBeTruthy();
    expect(final.progressPercent).toBe(100);
    expect(final.quizScore).toBe(1);

    // Persistido en Firestore
    const persisted = await progressRepo.get(CLASS.id, STUDENT.uid);
    expect(persisted?.ready).toBe(true);
  });

  it("el profesor ve el resumen de completitud (sin cruzar cursos)", async () => {
    const student = {
      id: STUDENT.uid,
      displayName: "Estudiante Demo Flipped",
      normalizedSearchName: "estudiante demo flipped",
      courseId: COURSE,
      active: true,
      archivedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      academicProfile: { participationTrackingEnabled: true, gamificationEnabled: true },
    };
    const fakeStudents: StudentRepository = {
      findByCourse: async () => [student],
      getById: async () => null,
      upsertMany: async () => ({ createdIds: [], updatedIds: [] }),
      softDelete: async () => undefined,
    };
    const overview = new GetFlippedOverviewUseCase({ students: fakeStudents, progress: progressRepo });
    const result = await overview.run(COURSE, CLASS.id, TEACHER);
    expect(result.total).toBe(1);
    expect(result.completed).toBe(1);
    expect(result.rows[0]?.displayName).toBe("Estudiante Demo Flipped");
  });

  it("una clase DRAFT no permite acceder al aula invertida", async () => {
    const setter = new SetClassScheduleUseCase({ classes: classesRepo, schedules: schedulesRepo, audit: { log: async () => undefined } });
    await setter.run({ courseId: COURSE, classId: CLASS.id, status: CLASS_STATUS.DRAFT }, TEACHER);
    const getter = new GetFlippedLessonForStudentUseCase({ schedules: schedulesRepo, lessons: lessonsRepo, progress: progressRepo });
    await expect(
      getter.run({ courseId: COURSE, classId: CLASS.id, studentId: STUDENT.uid }, STUDENT),
    ).rejects.toThrow();
  });
});
