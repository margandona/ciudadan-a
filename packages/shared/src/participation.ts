import type { IsoTimestamp } from "./types";
import { PARTICIPATION_SKILLS, type ParticipationLevel, type ParticipationSkill } from "./constants";

/** Botones rápidos para el registro en vivo (1–2 clics). */
export const PARTICIPATION_QUICK_ACTIONS: { label: string; skill: ParticipationSkill }[] = [
  { label: "Participó", skill: "intervencionOral" },
  { label: "Argumentó", skill: "argumentacion" },
  { label: "Colaboró", skill: "colaboracion" },
  { label: "Evidencia", skill: "aporteEvidencia" },
  { label: "Pregunta", skill: "pensamientoCritico" },
  { label: "Liderazgo", skill: "liderazgo" },
];

export { PARTICIPATION_SKILLS, type ParticipationSkill, type ParticipationLevel };

/** Una intervención registrada. */
export interface ParticipationEntry {
  at: IsoTimestamp;
  skill: ParticipationSkill;
  level: ParticipationLevel;
  note?: string | null;
  by: string;
}

/** Registro de participación de una estudiante en una clase. */
export interface ParticipationRecord {
  courseId: string;
  classId: string;
  studentId: string;
  records: ParticipationEntry[];
  total: number;
  updatedAt: IsoTimestamp;
}

/** Estadística por habilidad. */
export interface SkillStat {
  count: number;
  sum: number;
  avg: number;
}

/** Resumen agregado de participación (por habilidad y total). */
export interface ParticipationOverview {
  bySkill: Record<ParticipationSkill, SkillStat>;
  total: number;
  studentCount: number;
}

/** Resumen del curso para el dashboard del profesor. */
export interface CourseDashboard {
  courseId: string;
  totalStudents: number;
  activeStudents: number;
  flippedTotal: number;
  flippedCompleted: number;
  flippedPercent: number;
  submissions: number;
  pendingEvidences: number;
  exitTickets: number;
  participation: number;
  avgDifficulty: number | null;
}

/** Resumen por clase. */
export interface ClassDashboard {
  classId: string;
  flippedTotal: number;
  flippedCompleted: number;
  flippedPercent: number;
  submissions: number;
  exitTickets: number;
  participation: number;
  avgDifficulty: number | null;
}

/** Estado de alerta del calendario administrativo. */
export const CALENDAR_STATUS = {
  GREEN: "green",
  YELLOW: "yellow",
  RED: "red",
} as const;

export type CalendarStatus = (typeof CALENDAR_STATUS)[keyof typeof CALENDAR_STATUS];

/** Alerta del calendario (impresión −3 días · revisión evaluador −7 días). */
export interface CalendarAlert {
  materialId: string;
  title: string;
  kind: "print" | "review";
  deadline: IsoTimestamp;
  daysLeft: number;
  status: CalendarStatus;
  message: string;
}
