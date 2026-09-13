import {
  type ClassEntity,
  type ClassSchedule,
  type FlippedLesson,
  type FlippedProgress,
} from "@pclab/shared";
import {
  completeReady,
  newProgress,
  resolveStudentVisibility,
  requiredBlockIds,
  setReflection,
  visitBlock,
  answerQuestion,
  isFlippedAvailable,
  type StudentVisibility,
} from "@pclab/domain";
import { assertRole } from "../auth";
import type {
  AuthContext,
  ClassRepository,
  ClassScheduleRepository,
  FlippedLessonRepository,
  FlippedProgressRepository,
  SubmissionRepository,
} from "../ports";

/** Una misión con su visibilidad y progreso flipped para la estudiante. */
export interface StudentMission {
  class: ClassEntity;
  schedule: ClassSchedule | null;
  visibility: StudentVisibility;
  flippedAvailable: boolean;
  flippedProgress: FlippedProgress | null;
  feedbackReady?: boolean;
}

/** Lista las 12 misiones para la estudiante, ordenadas y con su estado. */
export class ListMissionsForStudentUseCase {
  constructor(
    private deps: {
      classes: ClassRepository;
      schedules: ClassScheduleRepository;
      progress: FlippedProgressRepository;
      submissions?: SubmissionRepository;
    },
  ) {}

  async run(
    input: { courseId: string; studentId: string; now?: string },
    actor: AuthContext | null,
  ): Promise<StudentMission[]> {
    assertRole(actor, ["ESTUDIANTE", "MASTER", "ADMIN"]);
    const now = input.now ?? new Date().toISOString();

    const [catalog, schedules] = await Promise.all([
      this.deps.classes.listAll(),
      this.deps.schedules.listByCourse(input.courseId),
    ]);

    const scheduleByClass = new Map(schedules.map((s) => [s.classId, s]));
    const ownSubmissions = this.deps.submissions?.findByStudent
      ? await this.deps.submissions.findByStudent(input.studentId)
      : [];
    const feedbackByClass = new Map<string, boolean>();
    for (const submission of ownSubmissions) {
      const hasFeedback = Boolean(submission.teacherFeedback?.trim()) || submission.score !== null;
      if (hasFeedback && !feedbackByClass.has(submission.classId)) {
        feedbackByClass.set(submission.classId, true);
      }
    }
    const missions: StudentMission[] = [];
    const pending: { cls: ClassEntity; schedule: ClassSchedule | null; visibility: StudentVisibility; flippedAvailable: boolean; progress: Promise<FlippedProgress | null> }[] = [];

    for (const cls of catalog.sort((a, b) => a.order - b.order)) {
      const schedule = scheduleByClass.get(cls.id) ?? null;
      const visibility = resolveStudentVisibility(schedule, now);
      const flippedAvailable = isFlippedAvailable(schedule, now);
      const progressTask =
        flippedAvailable && schedule ? this.deps.progress.get(cls.id, input.studentId) : Promise.resolve(null);
      pending.push({ cls, schedule, visibility, flippedAvailable, progress: progressTask });
    }

    const rows = await Promise.all(pending.map((item) => item.progress.then((flippedProgress) => ({ ...item, flippedProgress }))));
    for (const row of rows) {
      missions.push({
        class: row.cls,
        schedule: row.schedule,
        visibility: row.visibility,
        flippedAvailable: row.flippedAvailable,
        flippedProgress: row.flippedProgress,
        feedbackReady: feedbackByClass.get(row.cls.id) ?? false,
      });
    }
    return missions;
  }
}

/** Devuelve el aula invertida + el progreso de la estudiante (si está disponible). */
export class GetFlippedLessonForStudentUseCase {
  constructor(
    private deps: {
      schedules: ClassScheduleRepository;
      lessons: FlippedLessonRepository;
      progress: FlippedProgressRepository;
    },
  ) {}

  async run(
    input: { courseId: string; classId: string; studentId: string; now?: string },
    actor: AuthContext | null,
  ): Promise<{ lesson: FlippedLesson; progress: FlippedProgress }> {
    assertRole(actor, ["ESTUDIANTE", "MASTER", "ADMIN"]);
    const now = input.now ?? new Date().toISOString();

    const schedule = await this.deps.schedules.get(input.courseId, input.classId);
    if (!isFlippedAvailable(schedule, now)) {
      throw new Error("El aula invertida de esta clase aún no está disponible.");
    }
    const lesson = await this.deps.lessons.get(input.classId);
    if (!lesson) throw new Error("Contenido no disponible.");
    const existing = await this.deps.progress.get(input.classId, input.studentId);
    const progress = existing ?? newProgress(input.classId, input.studentId, input.courseId, now);
    return { lesson, progress };
  }
}

/** Registra avance del aula invertida (bloques, quiz, reflexión, botón listo). */
export class TrackFlippedProgressUseCase {
  constructor(
    private deps: {
      schedules: ClassScheduleRepository;
      lessons: FlippedLessonRepository;
      progress: FlippedProgressRepository;
    },
  ) {}

  async run(
    input: {
      courseId: string;
      classId: string;
      studentId: string;
      now?: string;
      blockId?: string;
      question?: { blockId: string; correct: boolean; score: number };
      reflection?: { blockId: string; text: string };
      markReady?: boolean;
      interactionSeconds?: number;
    },
    actor: AuthContext | null,
  ): Promise<FlippedProgress> {
    assertRole(actor, ["ESTUDIANTE", "MASTER", "ADMIN"]);
    if (actor && !actor.isServer && actor.role === "ESTUDIANTE" && actor.uid !== input.studentId) {
      throw new Error("Solo puedes registrar tu propio progreso.");
    }
    const now = input.now ?? new Date().toISOString();

    const schedule = await this.deps.schedules.get(input.courseId, input.classId);
    if (!isFlippedAvailable(schedule, now)) {
      throw new Error("El aula invertida ya no está disponible.");
    }
    const lesson = await this.deps.lessons.get(input.classId);
    if (!lesson) throw new Error("Contenido no disponible.");
    const required = requiredBlockIds(lesson.blocks);

    const existing = await this.deps.progress.get(input.classId, input.studentId);
    let progress = existing ?? newProgress(input.classId, input.studentId, input.courseId, now);

    if (input.interactionSeconds) {
      progress = { ...progress, interactionSeconds: progress.interactionSeconds + input.interactionSeconds };
    }
    if (input.blockId) progress = visitBlock(progress, input.blockId, required.length, now);
    if (input.question) {
      progress = answerQuestion(progress, input.question.blockId, input.question.correct, input.question.score, required.length, now);
    }
    if (input.reflection) {
      progress = setReflection(progress, input.reflection.blockId, input.reflection.text, required.length, now);
    }
    if (input.markReady) progress = completeReady(progress, required.length, now);

    return this.deps.progress.upsert(progress);
  }
}
