import type { Badge, PositiveMessage, StudentActivityStats } from "@pclab/shared";

/** Evalúa si una medalla se cumple con las estadísticas de la estudiante. */
export function evaluateBadge(stats: StudentActivityStats, badge: Badge): boolean {
  return badge.criteria.every((criteria) => {
    switch (criteria.kind) {
      case "FLIPPED_COMPLETED":
        return stats.flippedCompleted >= criteria.threshold;
      case "QUIZ_PASSED":
        return stats.quizzesPassed >= criteria.threshold;
      case "EVIDENCE_SUBMITTED":
        return stats.evidenceCount >= criteria.threshold;
      case "PARTICIPATION":
        if (criteria.skill) return (stats.participationBySkill[criteria.skill] ?? 0) >= criteria.threshold;
        return stats.participationTotal >= criteria.threshold;
      case "EXIT_TICKETS":
        return stats.exitTickets >= criteria.threshold;
      default:
        return false;
    }
  });
}

/** Medallas del catálogo que la estudiante ya cumple. */
export function qualifyingBadges(stats: StudentActivityStats, badges: Badge[]): Badge[] {
  return badges.filter((b) => evaluateBadge(stats, b));
}

/** Progreso por medalla (fracción de criterios cumplidos). */
export function badgeProgress(stats: StudentActivityStats, badge: Badge): number {
  if (badge.criteria.length === 0) return 0;
  const met = badge.criteria.filter((c) => evaluateBadge(stats, { ...badge, criteria: [c] })).length;
  return Math.round((met / badge.criteria.length) * 100);
}

/** Selecciona un mensaje positivo para el contexto (rotación simple por id). */
export function pickMessage(messages: PositiveMessage[], context: string): string | null {
  const pool = messages.filter((m) => m.context === context);
  if (pool.length === 0) return null;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx]!.text;
}
