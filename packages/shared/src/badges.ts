import type { IsoTimestamp } from "./types";

/** Criterio de una medalla (datos por defecto; configurables en content/badges.json). */
export interface BadgeCriteria {
  kind: "FLIPPED_COMPLETED" | "QUIZ_PASSED" | "EVIDENCE_SUBMITTED" | "PARTICIPATION" | "EXIT_TICKETS";
  threshold: number;
  /** Para PARTICIPATION: habilidad específica (opcional). */
  skill?: string;
}

/** Medalla del Observatorio Ciudadano. NUNCA modifica la nota. */
export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  order: number;
  level: number;
  criteria: BadgeCriteria[];
}

/** Medalla otorgada a una estudiante. */
export interface StudentBadge {
  badgeId: string;
  studentId: string;
  earnedAt: IsoTimestamp;
  via: "auto" | "teacher";
}

/** Estadísticas de actividad de la estudiante (para evaluar criterios). */
export interface StudentActivityStats {
  flippedCompleted: number;
  quizzesPassed: number;
  evidenceCount: number;
  participationTotal: number;
  participationBySkill: Record<string, number>;
  exitTickets: number;
}

/** Vista de una medalla para la estudiante (estado + progreso). */
export interface StudentBadgeView {
  badge: Badge;
  earned: boolean;
  via?: "auto" | "teacher";
  earnedAt?: IsoTimestamp;
}

/** Resumen de gamificación de la estudiante. */
export interface StudentBadgesOverview {
  badges: StudentBadgeView[];
  earnedCount: number;
  totalCount: number;
  stats: StudentActivityStats;
}

/** Mensaje positivo (biblioteca configurable, específico al aprendizaje). */
export interface PositiveMessage {
  id: string;
  context: string; // p. ej. "participacion.argumentacion", "quiz", "flipped"
  text: string;
}
