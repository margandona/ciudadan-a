import { Timestamp } from "firebase/firestore";
import type {
  Activity,
  ClassEntity,
  ClassSchedule,
  Course,
  ExitTicket,
  FlippedLesson,
  FlippedProgress,
  Quiz,
  QuizAttempt,
  QuizQuestion,
  Student,
  Submission,
} from "@pclab/shared";

/** Conversión de datos entre Firestore (cliente) y entidades de dominio. */

export function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "string") return value;
  return null;
}

export function toTimestamp(value: string | null | undefined): Timestamp | null {
  if (!value) return null;
  return Timestamp.fromDate(new Date(value));
}

export function studentFromDoc(id: string, data: Record<string, unknown>): Student {
  const academicProfile = (data.academicProfile ?? {
    participationTrackingEnabled: true,
    gamificationEnabled: true,
  }) as Student["academicProfile"];

  return {
    id,
    userId: (data.userId as string | null) ?? undefined,
    firstName: (data.firstName as string | null) ?? undefined,
    middleName: (data.middleName as string | null) ?? undefined,
    paternalSurname: (data.paternalSurname as string | null) ?? undefined,
    maternalSurname: (data.maternalSurname as string | null) ?? undefined,
    displayName: (data.displayName as string) ?? "",
    preferredName: (data.preferredName as string | null) ?? undefined,
    normalizedSearchName: (data.normalizedSearchName as string) ?? "",
    courseId: (data.courseId as string) ?? "",
    listNumber: (data.listNumber as number | null) ?? undefined,
    active: (data.active as boolean) ?? true,
    archivedAt: toIso(data.archivedAt),
    createdAt: toIso(data.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(data.updatedAt) ?? new Date().toISOString(),
    academicProfile,
    stats: (data.stats as Student["stats"] | null) ?? undefined,
  };
}

export function courseFromDoc(id: string, data: Record<string, unknown>): Course {
  return {
    id,
    name: (data.name as string) ?? "",
    level: (data.level as Course["level"]) ?? "Tercero Medio",
    section: (data.section as string) ?? "",
    subject: (data.subject as string) ?? "Educación Ciudadana",
    year: (data.year as number) ?? 0,
    teacherId: (data.teacherId as string | null) ?? undefined,
    active: (data.active as boolean) ?? true,
    createdAt: toIso(data.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(data.updatedAt) ?? new Date().toISOString(),
    settings: data.settings as Course["settings"],
  };
}

export function courseToRecord(course: Course): Record<string, unknown> {
  return {
    name: course.name,
    level: course.level,
    section: course.section,
    subject: course.subject,
    year: course.year,
    teacherId: course.teacherId ?? null,
    active: course.active,
    createdAt: toTimestamp(course.createdAt),
    updatedAt: toTimestamp(course.updatedAt),
    settings: course.settings ?? null,
  };
}

export function classFromDoc(id: string, data: Record<string, unknown>): ClassEntity {
  return {
    id,
    number: (data.number as number) ?? 0,
    missionId: (data.missionId as string) ?? "",
    alternative: (data.alternative as boolean) ?? false,
    title: (data.title as string) ?? "",
    subtitle: (data.subtitle as string) ?? undefined,
    unitId: (data.unitId as string) ?? "",
    oaIds: (data.oaIds as string[]) ?? [],
    learningGoal: (data.learningGoal as string) ?? undefined,
    order: (data.order as number) ?? 0,
    hasFeedback: (data.hasFeedback as boolean) ?? false,
    flippedEnabled: (data.flippedEnabled as boolean) ?? true,
    estMinutes: (data.estMinutes as number) ?? 15,
    rubricId: (data.rubricId as string) ?? undefined,
    materialIds: (data.materialIds as string[]) ?? undefined,
    createdAt: toIso(data.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(data.updatedAt) ?? new Date().toISOString(),
  };
}

export function scheduleFromDoc(courseId: string, classId: string, data: Record<string, unknown>): ClassSchedule {
  const availability = (data.availability ?? {}) as Record<string, unknown>;
  return {
    classId,
    courseId,
    status: (data.status as ClassSchedule["status"]) ?? "DRAFT",
    availability: {
      enabled: (availability.enabled as boolean) ?? true,
      startAt: toIso(availability.startAt) ?? null,
      endAt: toIso(availability.endAt) ?? null,
      flippedAvailable: (availability.flippedAvailable as boolean) ?? true,
      activityAvailable: (availability.activityAvailable as boolean) ?? true,
      submissionAvailable: (availability.submissionAvailable as boolean) ?? true,
      feedbackAvailable: (availability.feedbackAvailable as boolean) ?? false,
    },
    updatedAt: toIso(data.updatedAt) ?? new Date().toISOString(),
    updatedBy: (data.updatedBy as string) ?? "",
  };
}

export function flippedLessonFromDoc(classId: string, data: Record<string, unknown>): FlippedLesson {
  return {
    classId,
    title: (data.title as string) ?? "",
    objective: (data.objective as string) ?? "",
    problemQuestion: (data.problemQuestion as string) ?? "",
    concepts: (data.concepts as string[]) ?? [],
    blocks: (data.blocks as FlippedLesson["blocks"]) ?? [],
    estMinutes: (data.estMinutes as number) ?? 15,
    readyLabel: (data.readyLabel as string) ?? "Estoy lista para la misión",
    version: (data.version as number) ?? 1,
    updatedAt: toIso(data.updatedAt) ?? new Date().toISOString(),
  };
}

export function progressFromDoc(classId: string, studentId: string, data: Record<string, unknown>): FlippedProgress {
  return {
    classId,
    studentId,
    courseId: (data.courseId as string) ?? "",
    startedAt: toIso(data.startedAt) ?? null,
    completedAt: toIso(data.completedAt) ?? null,
    progressPercent: (data.progressPercent as number) ?? 0,
    blocksVisited: (data.blocksVisited as string[]) ?? [],
    interactionSeconds: (data.interactionSeconds as number) ?? 0,
    quizAttempts: (data.quizAttempts as number) ?? 0,
    quizScore: (data.quizScore as number | null) ?? null,
    reflection: (data.reflection as string | undefined) ?? undefined,
    ready: (data.ready as boolean) ?? false,
    updatedAt: toIso(data.updatedAt) ?? new Date().toISOString(),
  };
}

export function progressToRecord(p: FlippedProgress): Record<string, unknown> {
  return {
    classId: p.classId,
    studentId: p.studentId,
    courseId: p.courseId,
    startedAt: toTimestamp(p.startedAt ?? null),
    completedAt: toTimestamp(p.completedAt ?? null),
    progressPercent: p.progressPercent,
    blocksVisited: p.blocksVisited,
    interactionSeconds: p.interactionSeconds,
    quizAttempts: p.quizAttempts,
    quizScore: p.quizScore ?? null,
    reflection: p.reflection ?? null,
    ready: p.ready,
    updatedAt: toTimestamp(p.updatedAt),
  };
}

export function quizFromDoc(id: string, data: Record<string, unknown>): Quiz {
  const config = (data.config ?? {}) as Record<string, unknown>;
  return {
    id,
    classId: (data.classId as string) ?? "",
    courseId: (data.courseId as string) ?? "",
    title: (data.title as string) ?? "",
    mode: (data.mode as Quiz["mode"]) ?? "INDIVIDUAL",
    config: {
      timerSeconds: (config.timerSeconds as number | null) ?? null,
      points: (config.points as number) ?? 1,
      attempts: (config.attempts as number) ?? 1,
      immediateFeedback: (config.immediateFeedback as boolean) ?? true,
      showExplanation: (config.showExplanation as boolean) ?? true,
    },
    shuffle: (data.shuffle as boolean) ?? false,
    active: (data.active as boolean) ?? true,
    order: (data.order as number) ?? 0,
    questionCount: (data.questionCount as number) ?? 0,
    createdAt: toIso(data.createdAt) ?? new Date().toISOString(),
    updatedAt: toIso(data.updatedAt) ?? new Date().toISOString(),
  };
}

export function questionFromDoc(quizId: string, id: string, data: Record<string, unknown>): QuizQuestion {
  return {
    id,
    quizId,
    type: (data.type as QuizQuestion["type"]) ?? "choice",
    prompt: (data.prompt as string) ?? "",
    options: (data.options as string[] | undefined) ?? undefined,
    imageUrl: (data.imageUrl as string | undefined) ?? undefined,
    mapId: (data.mapId as string | undefined) ?? undefined,
    explanation: (data.explanation as string | undefined) ?? undefined,
    points: (data.points as number) ?? 1,
    order: (data.order as number) ?? 0,
    correctIndex: (data.correctIndex as number | undefined) ?? undefined,
    correctOrder: (data.correctOrder as string[] | undefined) ?? undefined,
    correctPairs: (data.correctPairs as Record<string, string> | undefined) ?? undefined,
    correctText: (data.correctText as string[] | undefined) ?? undefined,
    keywords: (data.keywords as string[] | undefined) ?? undefined,
  };
}

export function attemptFromDoc(quizId: string, studentId: string, data: Record<string, unknown>): QuizAttempt {
  return {
    quizId,
    studentId,
    classId: (data.classId as string) ?? "",
    courseId: (data.courseId as string) ?? "",
    startedAt: toIso(data.startedAt) ?? null,
    submittedAt: toIso(data.submittedAt) ?? null,
    score: (data.score as number) ?? 0,
    maxScore: (data.maxScore as number) ?? 0,
    answers: (data.answers as QuizAttempt["answers"]) ?? [],
    status: (data.status as QuizAttempt["status"]) ?? "IN_PROGRESS",
  };
}

export function activityFromDoc(id: string, data: Record<string, unknown>): Activity {
  return {
    id,
    classId: (data.classId as string) ?? "",
    courseId: (data.courseId as string) ?? "",
    title: (data.title as string) ?? "",
    type: (data.type as string) ?? "",
    description: (data.description as string) ?? "",
    instructions: (data.instructions as string[]) ?? [],
    evidenceRequired: (data.evidenceRequired as boolean) ?? true,
    evidenceTypes: (data.evidenceTypes as string[]) ?? [],
    rubricId: (data.rubricId as string | undefined) ?? undefined,
    maxScore: (data.maxScore as number | undefined) ?? undefined,
    order: (data.order as number) ?? 0,
    active: (data.active as boolean) ?? true,
  };
}

export function submissionFromDoc(id: string, data: Record<string, unknown>): Submission {
  return {
    id,
    activityId: (data.activityId as string) ?? "",
    studentId: (data.studentId as string) ?? "",
    classId: (data.classId as string) ?? "",
    courseId: (data.courseId as string) ?? "",
    status: (data.status as Submission["status"]) ?? "PENDIENTE",
    content: (data.content ?? {}) as Submission["content"],
    attachments: (data.attachments ?? []) as Submission["attachments"],
    score: (data.score as number | null) ?? null,
    teacherFeedback: (data.teacherFeedback as string | undefined) ?? undefined,
    rubricData: (data.rubricData as Record<string, unknown> | null) ?? null,
    attempts: (data.attempts as number) ?? 0,
    submittedAt: toIso(data.submittedAt) ?? null,
    updatedAt: toIso(data.updatedAt) ?? new Date().toISOString(),
  };
}

export function exitTicketFromDoc(classId: string, studentId: string, data: Record<string, unknown>): ExitTicket {
  return {
    classId,
    courseId: (data.courseId as string) ?? "",
    studentId,
    answers: (data.answers as ExitTicket["answers"]) ?? { learned: "", evidence: "", concept: "", question: "", relationOvalle: "" },
    difficulty: (data.difficulty as number) ?? 3,
    submittedAt: toIso(data.submittedAt) ?? new Date().toISOString(),
  };
}
