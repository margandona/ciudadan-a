import type { ProjectAssessment, ProjectFields, Rubric } from "@pclab/shared";
import { PROJECT_FIELD_LABELS } from "@pclab/shared";
import { ValidationError } from "../errors";

/** Valida que los 11 campos del proyecto estén completos. */
export function validateProjectFields(fields: ProjectFields): void {
  const keys = Object.keys(PROJECT_FIELD_LABELS) as (keyof ProjectFields)[];
  for (const key of keys) {
    const value = fields[key]?.trim();
    if (!value) {
      throw new ValidationError(`El campo "${PROJECT_FIELD_LABELS[key]}" es obligatorio.`);
    }
    if (value.length > 4000) {
      throw new ValidationError(`El campo "${PROJECT_FIELD_LABELS[key]}" es demasiado largo.`);
    }
  }
}

/** Puntos totales posibles de la rúbrica. */
export function rubricTotalPoints(rubric: Rubric): number {
  return rubric.criteria.reduce((acc, c) => acc + c.maxPoints, 0);
}

/** Valida una evaluación contra la rúbrica (puntos dentro de máximos). */
export function validateAssessment(rubric: Rubric, assessment: ProjectAssessment): number {
  let total = 0;
  for (const criterion of rubric.criteria) {
    const score = assessment.scores[criterion.id];
    if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > criterion.maxPoints) {
      throw new ValidationError(`Puntaje inválido para "${criterion.name}".`);
    }
    total += score;
  }
  return total;
}

/** Porcentaje de logro de una evaluación. */
export function assessmentPercent(total: number, max: number): number {
  return max > 0 ? Math.round((total / max) * 100) : 0;
}

/** Reglas de equipos: un miembro no puede pertenecer a dos equipos del curso. */
export function validateTeamMembership(
  members: string[],
  existingTeams: { id: string; members: string[] }[],
  excludeTeamId?: string,
): void {
  if (members.length === 0) throw new ValidationError("El equipo debe tener al menos una integrante.");
  const seen = new Set<string>();
  for (const member of members) {
    if (seen.has(member)) throw new ValidationError("Hay integrantes repetidas en el equipo.");
    seen.add(member);
    const conflict = existingTeams.find(
      (t) => t.id !== excludeTeamId && t.members.includes(member),
    );
    if (conflict) {
      throw new ValidationError("Una integrante ya pertenece a otro equipo del curso.");
    }
  }
}
