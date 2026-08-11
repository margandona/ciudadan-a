import { Firestore } from "firebase-admin/firestore";
import type {
  ClassEntity,
  ClassSchedule,
  FlippedLesson,
  FlippedProgress,
} from "@pclab/shared";
import type {
  ClassRepository,
  ClassScheduleRepository,
  FlippedLessonRepository,
  FlippedProgressRepository,
} from "@pclab/application";
import { isoToTimestamp, timestampToIso } from "./converters";

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return {};
}

export class FirestoreClassRepository implements ClassRepository {
  constructor(private readonly db: Firestore) {}

  private get collection() {
    return this.db.collection("classes");
  }

  async listAll(): Promise<ClassEntity[]> {
    const snap = await this.collection.orderBy("order", "asc").get();
    return snap.docs.map((d) => recordToClass(d.id, d.data() ?? {}));
  }

  async getById(id: string): Promise<ClassEntity | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return recordToClass(doc.id, doc.data() ?? {});
  }
}

export class FirestoreClassScheduleRepository implements ClassScheduleRepository {
  constructor(private readonly db: Firestore) {}

  private ref(courseId: string, classId: string) {
    return this.db.collection("classSchedules").doc(courseId).collection("schedules").doc(classId);
  }

  async get(courseId: string, classId: string): Promise<ClassSchedule | null> {
    const doc = await this.ref(courseId, classId).get();
    if (!doc.exists) return null;
    return recordToSchedule(courseId, classId, doc.data() ?? {});
  }

  async listByCourse(courseId: string): Promise<ClassSchedule[]> {
    const snap = await this.db.collection("classSchedules").doc(courseId).collection("schedules").get();
    return snap.docs.map((d) => recordToSchedule(courseId, d.id, d.data() ?? {}));
  }

  async upsert(schedule: ClassSchedule): Promise<ClassSchedule> {
    await this.ref(schedule.courseId, schedule.classId).set(scheduleToRecord(schedule), { merge: true });
    return schedule;
  }
}

export class FirestoreFlippedLessonRepository implements FlippedLessonRepository {
  constructor(private readonly db: Firestore) {}

  async get(classId: string): Promise<FlippedLesson | null> {
    const doc = await this.db.collection("flippedLesson").doc(classId).get();
    if (!doc.exists) return null;
    return recordToFlippedLesson(classId, doc.data() ?? {});
  }
}

export class FirestoreFlippedProgressRepository implements FlippedProgressRepository {
  constructor(private readonly db: Firestore) {}

  private ref(classId: string, studentId: string) {
    return this.db.collection("flippedProgress").doc(classId).collection("records").doc(studentId);
  }

  async get(classId: string, studentId: string): Promise<FlippedProgress | null> {
    const doc = await this.ref(classId, studentId).get();
    if (!doc.exists) return null;
    return recordToProgress(classId, studentId, doc.data() ?? {});
  }

  async upsert(progress: FlippedProgress): Promise<FlippedProgress> {
    await this.ref(progress.classId, progress.studentId).set(progressToRecord(progress), { merge: true });
    return progress;
  }

  async listByClass(courseId: string, classId: string): Promise<FlippedProgress[]> {
    const snap = await this.db
      .collection("flippedProgress")
      .doc(classId)
      .collection("records")
      .where("courseId", "==", courseId)
      .get();
    return snap.docs.map((d) => recordToProgress(classId, d.id, d.data() ?? {}));
  }
}

// ---------------------------------------------------------------- convertidores

export function recordToClass(id: string, data: Record<string, unknown>): ClassEntity {
  return {
    id,
    number: (data.number as number) ?? 0,
    missionId: (data.missionId as string) ?? "",
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
    createdAt: timestampToIso(data.createdAt) ?? new Date().toISOString(),
    updatedAt: timestampToIso(data.updatedAt) ?? new Date().toISOString(),
  };
}

export function recordToSchedule(courseId: string, classId: string, data: Record<string, unknown>): ClassSchedule {
  const availability = toRecord(data.availability);
  return {
    classId,
    courseId,
    status: (data.status as ClassSchedule["status"]) ?? "DRAFT",
    availability: {
      enabled: (availability.enabled as boolean) ?? true,
      startAt: timestampToIso(availability.startAt as never) ?? null,
      endAt: timestampToIso(availability.endAt as never) ?? null,
      flippedAvailable: (availability.flippedAvailable as boolean) ?? true,
      activityAvailable: (availability.activityAvailable as boolean) ?? true,
      submissionAvailable: (availability.submissionAvailable as boolean) ?? true,
      feedbackAvailable: (availability.feedbackAvailable as boolean) ?? false,
    },
    updatedAt: timestampToIso(data.updatedAt) ?? new Date().toISOString(),
    updatedBy: (data.updatedBy as string) ?? "",
  };
}

export function scheduleToRecord(schedule: ClassSchedule): Record<string, unknown> {
  return {
    classId: schedule.classId,
    courseId: schedule.courseId,
    status: schedule.status,
    availability: {
      enabled: schedule.availability.enabled,
      startAt: isoToTimestamp(schedule.availability.startAt ?? null),
      endAt: isoToTimestamp(schedule.availability.endAt ?? null),
      flippedAvailable: schedule.availability.flippedAvailable,
      activityAvailable: schedule.availability.activityAvailable,
      submissionAvailable: schedule.availability.submissionAvailable,
      feedbackAvailable: schedule.availability.feedbackAvailable,
    },
    updatedAt: isoToTimestamp(schedule.updatedAt),
    updatedBy: schedule.updatedBy,
  };
}

export function recordToFlippedLesson(classId: string, data: Record<string, unknown>): FlippedLesson {
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
    updatedAt: timestampToIso(data.updatedAt) ?? new Date().toISOString(),
  };
}

export function recordToProgress(classId: string, studentId: string, data: Record<string, unknown>): FlippedProgress {
  return {
    classId,
    studentId,
    courseId: (data.courseId as string) ?? "",
    startedAt: timestampToIso(data.startedAt as never) ?? null,
    completedAt: timestampToIso(data.completedAt as never) ?? null,
    progressPercent: (data.progressPercent as number) ?? 0,
    blocksVisited: (data.blocksVisited as string[]) ?? [],
    interactionSeconds: (data.interactionSeconds as number) ?? 0,
    quizAttempts: (data.quizAttempts as number) ?? 0,
    quizScore: (data.quizScore as number | null) ?? null,
    reflection: (data.reflection as string | undefined) ?? undefined,
    ready: (data.ready as boolean) ?? false,
    updatedAt: timestampToIso(data.updatedAt) ?? new Date().toISOString(),
  };
}

export function progressToRecord(p: FlippedProgress): Record<string, unknown> {
  return {
    classId: p.classId,
    studentId: p.studentId,
    courseId: p.courseId,
    startedAt: isoToTimestamp(p.startedAt ?? null),
    completedAt: isoToTimestamp(p.completedAt ?? null),
    progressPercent: p.progressPercent,
    blocksVisited: p.blocksVisited,
    interactionSeconds: p.interactionSeconds,
    quizAttempts: p.quizAttempts,
    quizScore: p.quizScore ?? null,
    reflection: p.reflection ?? null,
    ready: p.ready,
    updatedAt: isoToTimestamp(p.updatedAt),
  };
}
