import {
  AUDIT_ACTIONS,
  CLASS_STATUS,
  type ClassAvailability,
  type ClassEntity,
  type ClassSchedule,
  type ClassStatus,
  type FlippedProgress,
} from "@pclab/shared";
import { defaultAvailability, validateScheduleInput } from "@pclab/domain";
import { assertCourse, assertRole } from "../auth";
import type {
  AuditRepository,
  AuthContext,
  ClassRepository,
  ClassScheduleRepository,
  FlippedProgressRepository,
  StudentRepository,
} from "../ports";

export interface TeacherClassRow {
  class: ClassEntity;
  schedule: ClassSchedule;
}

/** Catálogo + programación de las 12 misiones para el profesor de un curso. */
export class ListClassesForTeacherUseCase {
  constructor(
    private deps: {
      classes: ClassRepository;
      schedules: ClassScheduleRepository;
    },
  ) {}

  async run(courseId: string, actor: AuthContext | null): Promise<TeacherClassRow[]> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    assertCourse(actor, courseId);

    const [catalog, schedules] = await Promise.all([
      this.deps.classes.listAll(),
      this.deps.schedules.listByCourse(courseId),
    ]);
    const scheduleByClass = new Map(schedules.map((s) => [s.classId, s]));

    return catalog
      .sort((a, b) => a.order - b.order)
      .map((cls) => ({
        class: cls,
        schedule:
          scheduleByClass.get(cls.id) ??
          ({
            classId: cls.id,
            courseId,
            status: CLASS_STATUS.DRAFT,
            availability: defaultAvailability(),
            updatedAt: "",
            updatedBy: actor?.uid ?? "",
          } satisfies ClassSchedule),
      }));
  }
}

export interface SetClassScheduleInput {
  courseId: string;
  classId: string;
  status?: ClassStatus;
  availability?: Partial<ClassAvailability>;
}

/** El profesor programa una clase: estado, aula invertida y ventana de disponibilidad. */
export class SetClassScheduleUseCase {
  constructor(
    private deps: {
      classes: ClassRepository;
      schedules: ClassScheduleRepository;
      audit: AuditRepository;
    },
  ) {}

  async run(input: SetClassScheduleInput, actor: AuthContext | null): Promise<ClassSchedule> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    assertCourse(actor, input.courseId);

    const cls = await this.deps.classes.getById(input.classId);
    if (!cls) throw new Error("Clase no encontrada.");

    validateScheduleInput({ status: input.status, availability: input.availability });

    const existing = await this.deps.schedules.get(input.courseId, input.classId);
    const now = new Date().toISOString();

    const schedule: ClassSchedule = {
      classId: input.classId,
      courseId: input.courseId,
      status: input.status ?? existing?.status ?? CLASS_STATUS.DRAFT,
      availability: {
        ...defaultAvailability(),
        ...existing?.availability,
        ...input.availability,
      },
      updatedAt: now,
      updatedBy: actor?.uid ?? "server",
    };

    await this.deps.schedules.upsert(schedule);
    await this.deps.audit.log({
      userId: actor?.uid ?? "server",
      action: AUDIT_ACTIONS.CLASS_ACTIVATION,
      entity: "classSchedules",
      entityId: input.classId,
      courseId: input.courseId,
      timestamp: now,
      metadata: {
        status: schedule.status,
        flippedAvailable: schedule.availability.flippedAvailable,
        startAt: schedule.availability.startAt ?? null,
        endAt: schedule.availability.endAt ?? null,
      },
    });

    return schedule;
  }
}

export interface FlippedOverviewRow {
  studentId: string;
  displayName: string;
  progress: FlippedProgress | null;
  completed: boolean;
}

/** Resumen para el profesor: quién completó el aula invertida de una clase. */
export class GetFlippedOverviewUseCase {
  constructor(
    private deps: {
      students: StudentRepository;
      progress: FlippedProgressRepository;
    },
  ) {}

  async run(
    courseId: string,
    classId: string,
    actor: AuthContext | null,
  ): Promise<{ total: number; completed: number; rows: FlippedOverviewRow[] }> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    assertCourse(actor, courseId);

    const [students, progresses] = await Promise.all([
      this.deps.students.findByCourse(courseId),
      this.deps.progress.listByClass(courseId, classId),
    ]);

    const progressByStudent = new Map(progresses.map((p) => [p.studentId, p]));
    const rows: FlippedOverviewRow[] = students
      .filter((s) => s.active)
      .map((s) => {
        const progress = progressByStudent.get(s.id) ?? null;
        return {
          studentId: s.id,
          displayName: s.displayName,
          progress,
          completed: progress?.ready === true,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    return {
      total: rows.length,
      completed: rows.filter((r) => r.completed).length,
      rows,
    };
  }
}
