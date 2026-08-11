import type { IsoTimestamp } from "./types";

/** Equipo de trabajo (ABP/ABJ/ApS). Los miembros pertenecen a un solo curso. */
export interface ProjectTeam {
  id: string;
  courseId: string;
  name: string;
  members: string[]; // studentIds
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

/** Los 11 campos del proyecto Ovalle 2035 (Misión 11). */
export interface ProjectFields {
  problem: string; // 1 problema
  evidence: string; // 2 evidencia
  territory: string; // 3 territorio
  affectedPopulation: string; // 4 población afectada
  citizenParticipation: string; // 5 participación ciudadana
  publicAgency: string; // 6 organismo público
  privateActor: string; // 7 posible actor privado
  resources: string; // 8 recursos necesarios
  socialImpact: string; // 9 impacto social
  environmentalImpact: string; // 10 impacto ambiental
  proposal: string; // 11 propuesta
}

export const PROJECT_FIELD_LABELS: Record<keyof ProjectFields, string> = {
  problem: "Problema",
  evidence: "Evidencia",
  territory: "Territorio",
  affectedPopulation: "Población afectada",
  citizenParticipation: "Participación ciudadana",
  publicAgency: "Organismo público",
  privateActor: "Actor privado",
  resources: "Recursos necesarios",
  socialImpact: "Impacto social",
  environmentalImpact: "Impacto ambiental",
  proposal: "Propuesta",
};

export const PROJECT_STATUS = {
  EN_PROGRESO: "EN_PROGRESO",
  ENTREGADO: "ENTREGADO",
  REVISADO: "REVISADO",
} as const;

export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

/** Proyecto de equipo (una entrega por equipo). */
export interface Project {
  id: string;
  classId: string;
  courseId: string;
  teamId: string;
  fields: ProjectFields;
  status: ProjectStatus;
  attachments: string[];
  submittedAt?: IsoTimestamp | null;
  updatedAt: IsoTimestamp;
}

/** Criterio de una rúbrica. */
export interface RubricCriterion {
  id: string;
  name: string;
  maxPoints: number;
  descriptor: string;
}

/** Rúbrica (evaluación auténtica: Cabildo y Feria). */
export interface Rubric {
  id: string;
  title: string;
  oaIds?: string[];
  criteria: RubricCriterion[];
}

/** Evaluación de un proyecto (docente, autoevaluación o coevaluación). */
export interface ProjectAssessment {
  projectId: string;
  teamId: string;
  courseId: string;
  kind: "teacher" | "self" | "peer";
  by: string; // docente o estudiante
  scores: Record<string, number>; // criterionId -> puntos
  feedback?: string;
  at: IsoTimestamp;
}

/** Resumen de evaluación de un proyecto para el docente. */
export interface ProjectAssessmentSummary {
  teacher: ProjectAssessment | null;
  self: ProjectAssessment | null;
  peer: ProjectAssessment[];
  totalPoints: number | null;
  percent: number | null;
}
