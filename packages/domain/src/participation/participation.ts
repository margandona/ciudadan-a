import {
  PARTICIPATION_SKILLS,
  type ParticipationEntry,
  type ParticipationOverview,
  type ParticipationRecord,
  type ParticipationSkill,
  type SkillStat,
} from "@pclab/shared";
import { ValidationError } from "../errors";

/** Valida una entrada de participación (habilidad válida, nivel 0–3, nota breve). */
export function validateParticipationEntry(entry: {
  skill: string;
  level: number;
  note?: string;
}): void {
  if (!PARTICIPATION_SKILLS.includes(entry.skill as ParticipationSkill)) {
    throw new ValidationError(`Habilidad de participación inválida: ${entry.skill}`);
  }
  if (!Number.isInteger(entry.level) || entry.level < 0 || entry.level > 3) {
    throw new ValidationError("El nivel de participación debe ser un entero entre 0 y 3.");
  }
  if (entry.note && entry.note.length > 300) {
    throw new ValidationError("La observación no puede superar 300 caracteres.");
  }
}

function emptyStat(): SkillStat {
  return { count: 0, sum: 0, avg: 0 };
}

/** Agrega registros de participación en un resumen por habilidad. */
export function aggregateParticipation(records: ParticipationRecord[]): ParticipationOverview {
  const bySkill = Object.fromEntries(
    PARTICIPATION_SKILLS.map((skill) => [skill, emptyStat()]),
  ) as Record<ParticipationSkill, SkillStat>;

  const studentIds = new Set<string>();
  for (const record of records) {
    studentIds.add(record.studentId);
    for (const entry of record.records) {
      const stat = bySkill[entry.skill];
      if (!stat) continue;
      stat.count += 1;
      stat.sum += entry.level;
      stat.avg = stat.count > 0 ? Math.round((stat.sum / stat.count) * 100) / 100 : 0;
    }
  }

  const total = records.reduce((acc, r) => acc + r.total, 0);
  return { bySkill, total, studentCount: studentIds.size };
}

/** Promedio simple de dificultad percibida desde tickets de salida. */
export function averageDifficulty(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

export type { ParticipationEntry, ParticipationRecord };
