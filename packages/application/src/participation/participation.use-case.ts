import type { ParticipationLevel, ParticipationOverview, ParticipationRecord } from "@pclab/shared";
import { aggregateParticipation, validateParticipationEntry } from "@pclab/domain";
import { assertCourse, assertRole } from "../auth";
import type { AuthContext, ParticipationRepository } from "../ports";

export interface RegisterParticipationInput {
  courseId: string;
  classId: string;
  /** Registro en lote: mismo tipo/nivel/nota para varias estudiantes. */
  entries: { studentId: string; skill: string; level: number; note?: string }[];
  now?: string;
}

/** Registro rápido de participación en clase (múltiples estudiantes, 1–2 clics). */
export class RegisterParticipationUseCase {
  constructor(private deps: { participation: ParticipationRepository }) {}

  async run(input: RegisterParticipationInput, actor: AuthContext | null): Promise<number> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    assertCourse(actor, input.courseId);
    if (input.entries.length === 0) return 0;

    const now = input.now ?? new Date().toISOString();
    for (const entry of input.entries) {
      validateParticipationEntry(entry);
    }

    // Agrupar por estudiante para una escritura por estudiante.
    const byStudent = new Map<string, (typeof input.entries)[number][]>();
    for (const entry of input.entries) {
      const list = byStudent.get(entry.studentId) ?? [];
      list.push(entry);
      byStudent.set(entry.studentId, list);
    }

    let saved = 0;
    for (const [studentId, entries] of byStudent) {
      const existing = await this.deps.participation.get(input.courseId, input.classId, studentId);
      const record: ParticipationRecord = existing ?? {
        courseId: input.courseId,
        classId: input.classId,
        studentId,
        records: [],
        total: 0,
        updatedAt: now,
      };
      for (const entry of entries) {
        record.records.push({
          at: now,
          skill: entry.skill as ParticipationRecord["records"][number]["skill"],
          level: entry.level as ParticipationLevel,
          note: entry.note ?? null,
          by: actor?.uid ?? "server",
        });
      }
      record.total = record.records.length;
      record.updatedAt = now;
      await this.deps.participation.upsert(record);
      saved += entries.length;
    }
    return saved;
  }
}

/** Resumen agregado de participación de una clase (evolución por habilidad). */
export class GetParticipationOverviewUseCase {
  constructor(private deps: { participation: ParticipationRepository }) {}

  async run(courseId: string, classId: string, actor: AuthContext | null): Promise<ParticipationOverview> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    assertCourse(actor, courseId);
    const records = await this.deps.participation.listByClass(courseId, classId);
    return aggregateParticipation(records);
  }
}

/** Registro individual de una estudiante. */
export class GetStudentParticipationUseCase {
  constructor(private deps: { participation: ParticipationRepository }) {}

  async run(
    courseId: string,
    classId: string,
    studentId: string,
    actor: AuthContext | null,
  ): Promise<ParticipationRecord | null> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    assertCourse(actor, courseId);
    return this.deps.participation.get(courseId, classId, studentId);
  }
}
