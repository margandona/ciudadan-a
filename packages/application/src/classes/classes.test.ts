import { describe, expect, it } from "vitest";
import {
  CLASS_STATUS,
  type AuditLog,
  type ClassEntity,
  type ClassSchedule,
  type FlippedLesson,
  type FlippedProgress,
} from "@pclab/shared";
import type {
  AuditRepository,
  ClassRepository,
  ClassScheduleRepository,
  FlippedLessonRepository,
  FlippedProgressRepository,
} from "../ports";
import { ListMissionsForStudentUseCase, GetFlippedLessonForStudentUseCase, TrackFlippedProgressUseCase } from "./student-classes.use-case";
import { ListClassesForTeacherUseCase, SetClassScheduleUseCase } from "./teacher-classes.use-case";

const NOW = "2026-08-10T12:00:00.000Z";

function classEntity(id: string, order: number): ClassEntity {
  return {
    id,
    number: order,
    missionId: `mission-${String(order).padStart(2, "0")}`,
    title: `Misión ${String(order).padStart(2, "0")}`,
    unitId: "U3",
    oaIds: ["OA6"],
    order,
    hasFeedback: order === 1,
    flippedEnabled: true,
    estMinutes: 12,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

const CATALOG = [classEntity("class-01", 1), classEntity("class-02", 2), classEntity("class-03", 3)];

const LESSON: FlippedLesson = {
  classId: "class-01",
  title: "Misión 01",
  objective: "obj",
  problemQuestion: "prob",
  concepts: ["ciudadanía"],
  blocks: [
    { type: "title", id: "t", text: "Título" },
    { type: "text", id: "m1", markdown: "micro" },
    { type: "question", id: "q1", kind: "choice", prompt: "¿A?", options: ["a", "b"], correctIndex: 0 },
  ],
  estMinutes: 12,
  readyLabel: "Estoy lista para la misión",
  version: 1,
  updatedAt: NOW,
};

class FakeClasses implements ClassRepository {
  constructor(private items: ClassEntity[] = CATALOG) {}
  async listAll(): Promise<ClassEntity[]> {
    return this.items;
  }
  async getById(id: string): Promise<ClassEntity | null> {
    return this.items.find((c) => c.id === id) ?? null;
  }
}

class FakeSchedules implements ClassScheduleRepository {
  byKey = new Map<string, ClassSchedule>();
  async get(courseId: string, classId: string): Promise<ClassSchedule | null> {
    return this.byKey.get(`${courseId}|${classId}`) ?? null;
  }
  async listByCourse(courseId: string): Promise<ClassSchedule[]> {
    return [...this.byKey.values()].filter((s) => s.courseId === courseId);
  }
  async upsert(s: ClassSchedule): Promise<ClassSchedule> {
    this.byKey.set(`${s.courseId}|${s.classId}`, s);
    return s;
  }
}

class FakeLessons implements FlippedLessonRepository {
  constructor(private items = new Map<string, FlippedLesson>([["class-01", LESSON]])) {}
  async get(classId: string): Promise<FlippedLesson | null> {
    return this.items.get(classId) ?? null;
  }
}

class FakeProgress implements FlippedProgressRepository {
  byKey = new Map<string, FlippedProgress>();
  async get(classId: string, studentId: string): Promise<FlippedProgress | null> {
    return this.byKey.get(`${classId}|${studentId}`) ?? null;
  }
  async upsert(p: FlippedProgress): Promise<FlippedProgress> {
    this.byKey.set(`${p.classId}|${p.studentId}`, p);
    return p;
  }
  async listByClass(courseId: string, classId: string): Promise<FlippedProgress[]> {
    return [...this.byKey.values()].filter((p) => p.courseId === courseId && p.classId === classId);
  }
}

class FakeAudit implements AuditRepository {
  logs: AuditLog[] = [];
  async log(entry: AuditLog): Promise<void> {
    this.logs.push(entry);
  }
}

const STUDENT = { uid: "studA", role: "ESTUDIANTE", courses: ["course-d"] };
const TEACHER = { uid: "teach1", role: "PROFESOR", courses: ["course-d"] };

function schedule(status: ClassSchedule["status"], classId = "class-01"): ClassSchedule {
  return {
    classId,
    courseId: "course-d",
    status,
    availability: {
      enabled: true,
      startAt: null,
      endAt: null,
      flippedAvailable: true,
      activityAvailable: true,
      submissionAvailable: true,
      feedbackAvailable: false,
    },
    updatedAt: NOW,
    updatedBy: "teach1",
  };
}

describe("ListMissionsForStudentUseCase", () => {
  it("muestra misiones abiertas y oculta DRAFT; incluye progreso flipped", async () => {
    const schedules = new FakeSchedules();
    await schedules.upsert(schedule(CLASS_STATUS.OPEN, "class-01"));
    const progress = new FakeProgress();
    await progress.upsert({
      classId: "class-01",
      studentId: "studA",
      courseId: "course-d",
      startedAt: NOW,
      completedAt: null,
      progressPercent: 50,
      blocksVisited: ["m1"],
      interactionSeconds: 20,
      quizAttempts: 0,
      quizScore: null,
      ready: false,
      updatedAt: NOW,
    });

    const uc = new ListMissionsForStudentUseCase({ classes: new FakeClasses(), schedules, progress });
    const missions = await uc.run({ courseId: "course-d", studentId: "studA", now: NOW }, STUDENT);

    expect(missions).toHaveLength(3);
    const m1 = missions[0]!;
    expect(m1.visibility).toBe("open");
    expect(m1.flippedAvailable).toBe(true);
    expect(m1.flippedProgress?.progressPercent).toBe(50);
    expect(missions[1]!.visibility).toBe("hidden"); // DRAFT
  });
});

describe("GetFlippedLessonForStudentUseCase", () => {
  it("devuelve lección + progreso cuando está disponible", async () => {
    const schedules = new FakeSchedules();
    await schedules.upsert(schedule(CLASS_STATUS.OPEN));
    const uc = new GetFlippedLessonForStudentUseCase({
      schedules,
      lessons: new FakeLessons(),
      progress: new FakeProgress(),
    });
    const result = await uc.run({ courseId: "course-d", classId: "class-01", studentId: "studA", now: NOW }, STUDENT);
    expect(result.lesson.classId).toBe("class-01");
    expect(result.progress.startedAt).toBe(NOW);
  });

  it("rechaza cuando la clase está en DRAFT", async () => {
    const schedules = new FakeSchedules();
    await schedules.upsert(schedule(CLASS_STATUS.DRAFT));
    const uc = new GetFlippedLessonForStudentUseCase({
      schedules,
      lessons: new FakeLessons(),
      progress: new FakeProgress(),
    });
    await expect(uc.run({ courseId: "course-d", classId: "class-01", studentId: "studA", now: NOW }, STUDENT)).rejects.toThrow();
  });
});

describe("TrackFlippedProgressUseCase", () => {
  it("registra bloques y completa cuando recorre todo", async () => {
    const schedules = new FakeSchedules();
    await schedules.upsert(schedule(CLASS_STATUS.OPEN));
    const progress = new FakeProgress();
    const uc = new TrackFlippedProgressUseCase({ schedules, lessons: new FakeLessons(), progress });

    await uc.run({ courseId: "course-d", classId: "class-01", studentId: "studA", now: NOW, blockId: "m1" }, STUDENT);
    await uc.run({ courseId: "course-d", classId: "class-01", studentId: "studA", now: NOW, question: { blockId: "q1", correct: true, score: 1 } }, STUDENT);
    const final = await uc.run({ courseId: "course-d", classId: "class-01", studentId: "studA", now: NOW, markReady: true }, STUDENT);

    expect(final.progressPercent).toBe(100);
    expect(final.ready).toBe(true);
    expect(final.completedAt).toBeTruthy();
    expect(final.quizScore).toBe(1);
  });

  it("impide que una estudiante registre progreso ajeno", async () => {
    const schedules = new FakeSchedules();
    await schedules.upsert(schedule(CLASS_STATUS.OPEN));
    const uc = new TrackFlippedProgressUseCase({ schedules, lessons: new FakeLessons(), progress: new FakeProgress() });
    await expect(
      uc.run({ courseId: "course-d", classId: "class-01", studentId: "studB", now: NOW, blockId: "m1" }, STUDENT),
    ).rejects.toThrow();
  });
});

describe("ListClassesForTeacherUseCase", () => {
  it("devuelve catálogo ordenado con horario por defecto", async () => {
    const schedules = new FakeSchedules();
    await schedules.upsert(schedule(CLASS_STATUS.OPEN, "class-01"));
    const uc = new ListClassesForTeacherUseCase({ classes: new FakeClasses(), schedules });
    const rows = await uc.run("course-d", TEACHER);
    expect(rows).toHaveLength(3);
    expect(rows[0]!.class.id).toBe("class-01");
    expect(rows[0]!.schedule.status).toBe(CLASS_STATUS.OPEN);
    expect(rows[1]!.schedule.status).toBe(CLASS_STATUS.DRAFT);
  });
});

describe("SetClassScheduleUseCase", () => {
  it("el profesor de su curso programa y audita", async () => {
    const schedules = new FakeSchedules();
    const audit = new FakeAudit();
    const uc = new SetClassScheduleUseCase({ classes: new FakeClasses(), schedules, audit });
    const updated = await uc.run(
      { courseId: "course-d", classId: "class-01", status: CLASS_STATUS.SCHEDULED, availability: { startAt: "2026-08-12T10:00:00.000Z" } },
      TEACHER,
    );
    expect(updated.status).toBe(CLASS_STATUS.SCHEDULED);
    expect(updated.availability.startAt).toBe("2026-08-12T10:00:00.000Z");
    expect(audit.logs).toHaveLength(1);
    expect(audit.logs[0]?.action).toBe("CLASS_ACTIVATION");
  });

  it("rechaza programar un curso ajeno", async () => {
    const uc = new SetClassScheduleUseCase({ classes: new FakeClasses(), schedules: new FakeSchedules(), audit: new FakeAudit() });
    await expect(
      uc.run({ courseId: "course-other", classId: "class-01", status: CLASS_STATUS.OPEN }, TEACHER),
    ).rejects.toThrow();
  });

  it("rechaza estado inválido", async () => {
    const uc = new SetClassScheduleUseCase({ classes: new FakeClasses(), schedules: new FakeSchedules(), audit: new FakeAudit() });
    await expect(
      uc.run({ courseId: "course-d", classId: "class-01", status: "HACKED" as never }, TEACHER),
    ).rejects.toThrow();
  });
});
