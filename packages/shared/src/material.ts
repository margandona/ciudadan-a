import type { IsoTimestamp } from "./types";
import { MATERIAL_STATUS, type MaterialStatus } from "./constants";

export { MATERIAL_STATUS, type MaterialStatus };

/** Etiquetas en español para el estado del material (solo presentación). */
export const MATERIAL_STATUS_LABELS: Record<MaterialStatus, string> = {
  [MATERIAL_STATUS.BORRADOR]: "Borrador",
  [MATERIAL_STATUS.EN_REVISION]: "En revisión",
  [MATERIAL_STATUS.CON_OBSERVACIONES]: "Con observaciones",
  [MATERIAL_STATUS.APROBADO]: "Aprobado",
  [MATERIAL_STATUS.RECHAZADO]: "Rechazado",
  [MATERIAL_STATUS.CORREGIR_Y_REENVIAR]: "Corregir y reenviar",
};

/** Material didáctico (guía/evaluación/rúbrica/pauta/solucionario/lectura/complementario). */
export interface Material {
  id: string;
  courseId: string;
  classId?: string;
  type: "guia" | "evaluacion" | "rubrica" | "pauta" | "solucionario" | "lectura" | "complementario";
  title: string;
  oaIds?: string[];
  status: MaterialStatus;
  hasDUA: boolean;
  evaluatorId?: string;
  sentAt?: IsoTimestamp | null;
  reviewAt?: IsoTimestamp | null;
  /** Plazo de impresión (−3 días antes de la clase). */
  printDeadline?: IsoTimestamp | null;
  /** Plazo de envío al evaluador (−7 días antes). */
  reviewDeadline?: IsoTimestamp | null;
  updatedAt: IsoTimestamp;
}

/** Versión general o DUA/adecuada de un material (mismo OA). */
export const MATERIAL_KIND = {
  GENERAL: "GENERAL",
  DUA: "DUA",
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
  uploadedAt: IsoTimestamp;
  by: string;
}

/** Comentario del evaluador (historial de observaciones). */
export interface ReviewComment {
  id: string;
  materialId: string;
  text: string;
  by: string;
  role: string;
  at: IsoTimestamp;
}

/** Solicitud de revisión (evaluador asignado). */
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

/** Detalle completo para el evaluador/profesor. */
export interface MaterialDetail {
  material: Material;
  versions: MaterialVersion[];
  comments: ReviewComment[];
  request: ReviewRequest | null;
}
