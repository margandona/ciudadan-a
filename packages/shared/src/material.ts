import type { IsoTimestamp } from "./types";
import { MATERIAL_STATUS, MATERIAL_TYPE, type MaterialStatus, type MaterialType } from "./constants";

export { MATERIAL_STATUS, MATERIAL_TYPE, type MaterialStatus, type MaterialType };

/** Etiquetas en español para el estado del material (solo presentación). */
export const MATERIAL_STATUS_LABELS: Record<MaterialStatus, string> = {
  [MATERIAL_STATUS.BORRADOR]: "Borrador",
  [MATERIAL_STATUS.LISTO_PARA_REVISION]: "Listo para revisión",
  [MATERIAL_STATUS.ENVIADO_A_REVISION]: "Enviado a revisión",
  [MATERIAL_STATUS.EN_REVISION]: "En revisión",
  [MATERIAL_STATUS.OBSERVACIONES]: "Con observaciones",
  [MATERIAL_STATUS.REQUIERE_CAMBIOS]: "Requiere cambios",
  [MATERIAL_STATUS.CORREGIDO]: "Corregido",
  [MATERIAL_STATUS.REENVIADO]: "Reenviado",
  [MATERIAL_STATUS.APROBADO]: "Aprobado",
  [MATERIAL_STATUS.APROBADO_FINAL]: "Aprobado final",
  [MATERIAL_STATUS.READY_TO_PRINT]: "Listo para imprimir",
  [MATERIAL_STATUS.RECHAZADO]: "Rechazado",
  [MATERIAL_STATUS.ARCHIVED]: "Archivado",
  // Compatibilidad FASE 7.
  [MATERIAL_STATUS.CON_OBSERVACIONES]: "Con observaciones",
  [MATERIAL_STATUS.CORREGIR_Y_REENVIAR]: "Corregir y reenviar",
};

/** Roles que participan en la revisión institucional. */
export const REVIEWER_ROLES = ["EVALUADOR", "PIE", "UTP"] as const;
export type ReviewerRole = (typeof REVIEWER_ROLES)[number];

/** Configuración de revisiones requeridas por tipo de material (configurable). */
export interface ReviewConfig {
  evaluatorRequired: boolean;
  pieRequired: boolean;
  utpRequired: boolean;
}

/** Estado de la aprobación de cada revisor. */
export const APPROVAL_STATUS = {
  PENDIENTE: "PENDIENTE",
  APROBADO: "APROBADO",
  CON_OBSERVACIONES: "CON_OBSERVACIONES",
  SOLICITA_CAMBIOS: "SOLICITA_CAMBIOS",
} as const;
export type ApprovalStatus = (typeof APPROVAL_STATUS)[keyof typeof APPROVAL_STATUS];

/** Aprobación por rol (materials/{id}/approvals/{role}). */
export interface MaterialApproval {
  role: ReviewerRole;
  status: ApprovalStatus;
  by: string;
  at: IsoTimestamp;
  commentId?: string;
}

/** Bloques editables del contenido de un material. */
export interface MaterialTableRow {
  cells: string[];
}
export interface MaterialContentBlock {
  id: string;
  kind: "heading" | "text" | "list" | "table" | "response" | "quote";
  text?: string;
  items?: string[];
  // Firestore no admite arrays anidados: cada fila es un objeto con `cells`.
  table?: { headers: string[]; rows: MaterialTableRow[] };
}

/** Ítem de una evaluación escrita. */
export interface AssessmentItem {
  id: string;
  type: "choice" | "truefalse" | "short" | "case" | "source" | "graph" | "match" | "fill";
  prompt: string;
  options?: string[];
  correctIndex?: number;
  correctText?: string[];
  points: number;
  answer?: string;
  justification?: string;
  skill?: string;
  oa?: string;
  indicator?: string;
}

/** Rúbrica (escala configurable con descriptores por nivel). */
export interface RubricLevel {
  score: number;
  label: string;
}
export interface RubricCriterionLevel {
  score: number;
  descriptor: string;
}
export interface RubricDoc {
  id?: string;
  title: string;
  scale: RubricLevel[];
  criteria: { id: string; name: string; descriptor: string; levels: RubricCriterionLevel[] }[];
}

/** Solucionario / pauta de una evaluación. */
export interface AnswerKeyItem {
  itemId: string;
  correct: string;
  points: number;
  justification: string;
}

/** Tabla de especificaciones. */
export interface SpecificationRow {
  oa: string;
  indicator: string;
  content: string;
  skill: string;
  itemId: string;
  points: number;
  level: string;
}

/** Contenido estructurado de un material (editable desde la app). */
export interface MaterialContent {
  curricular?: {
    oa: string[];
    objective: string;
    indicators: string[];
  };
  /** Párrafos de lectura/explicación del tema (guías y evaluaciones). */
  contenido?: string[];
  /** Referencias bibliográficas y académicas (fuentes reales). */
  referencias?: string[];
  sections: MaterialContentBlock[];
  items?: AssessmentItem[];
  rubric?: RubricDoc;
  answerKey?: AnswerKeyItem[];
  specTable?: SpecificationRow[];
  pauta?: string;
}

/** Material didáctico (v2): guía, evaluación, rúbrica, pauta, solucionario, DUA/PIE, etc. */
export interface Material {
  id: string;
  courseId: string;
  courseIds?: string[];
  classId?: string;
  unitId?: string;
  type: MaterialType;
  title: string;
  description?: string;
  status: MaterialStatus;
  oaIds?: string[];
  learningObjectives?: string[];
  classObjective?: string;
  indicators?: string[];
  duration?: number;
  estimatedPages?: number;
  /** v1, v2, v3… (cada corrección del profesor genera una versión nueva). */
  version: number;
  /** Apunta al material general (versiones DUA/PIE/adaptadas). */
  parentMaterialId?: string;
  hasDUA: boolean;
  hasPIE?: boolean;
  requiresPrinting?: boolean;
  requiresReview?: boolean;
  reviewConfig?: ReviewConfig;
  content?: MaterialContent;
  evaluatorId?: string;
  pieReviewerId?: string;
  utpReviewerId?: string;
  sentAt?: IsoTimestamp | null;
  reviewAt?: IsoTimestamp | null;
  /** Fecha de aplicación de la clase (base para calcular plazos). */
  classDate?: IsoTimestamp | null;
  /** Plazo de impresión (−3 días antes de la clase). */
  printDeadline?: IsoTimestamp | null;
  /** Plazo de envío al evaluador (−7 días antes). */
  reviewDeadline?: IsoTimestamp | null;
  archivedAt?: IsoTimestamp | null;
  createdBy?: string;
  createdAt?: IsoTimestamp | null;
  updatedAt: IsoTimestamp;
}

/** Versión general, DUA o PIE de un material (mismo OA central). */
export const MATERIAL_KIND = {
  GENERAL: "GENERAL",
  DUA: "DUA",
  PIE: "PIE",
} as const;
export type MaterialKind = (typeof MATERIAL_KIND)[keyof typeof MATERIAL_KIND];

export interface MaterialVersion {
  id: string;
  materialId: string;
  version: number;
  kind: MaterialKind;
  fileName: string;
  mime?: string;
  size?: number;
  url?: string;
  storagePath?: string;
  note?: string;
  changeSummary?: string;
  uploadedAt: IsoTimestamp;
  by: string;
}

/** Comentario de revisión (por sección/versión, resoluble). */
export interface ReviewComment {
  id: string;
  materialId: string;
  versionId?: string;
  section?: string;
  text: string;
  by: string;
  role: string;
  at: IsoTimestamp;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: IsoTimestamp | null;
}

/** Solicitud de revisión (se conserva para compatibilidad con el flujo FASE 7). */
export interface ReviewRequest {
  id: string;
  materialId: string;
  courseId: string;
  requestedBy: string;
  evaluatorId: string;
  state: "PENDING" | "RESPONDED";
  requestedAt: IsoTimestamp;
  respondedAt?: IsoTimestamp | null;
}

/** Detalle completo de un material para revisores/profesor. */
export interface MaterialDetail {
  material: Material;
  versions: MaterialVersion[];
  comments: ReviewComment[];
  approvals: MaterialApproval[];
  request: ReviewRequest | null;
}

/** Plantilla de evaluación reutilizable (misma prueba aplicada a varios cursos). */
export interface AssessmentTemplate {
  id: string;
  type: MaterialType;
  title: string;
  content: MaterialContent;
  reviewConfig?: ReviewConfig;
  version: number;
  updatedAt: IsoTimestamp;
}

/** Aplicación de una plantilla a un curso/clase con sus fechas. */
export interface AssessmentApplication {
  id: string;
  templateId: string;
  courseId: string;
  classId?: string;
  materialId?: string;
  dates: { reviewDeadline?: IsoTimestamp | null; printDeadline?: IsoTimestamp | null; appliedAt?: IsoTimestamp | null };
}
