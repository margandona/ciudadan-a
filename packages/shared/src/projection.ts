import type { IsoTimestamp } from "./types";

/** Kinds de diapositiva en la secuencia pedagógica obligatoria. */
export const SLIDE_KINDS = [
  "portada",
  "aprendizaje",
  "objetivo",
  "ruta",
  "activacion",
  "contenido",
  "actividad",
  "pregunta",
  "quiz",
  "discusion",
  "actividadPrincipal",
  "evaluacion",
  "sintesis",
  "ticket",
] as const;

export type SlideKind = (typeof SLIDE_KINDS)[number];

/** Kinds obligatorios y en este orden (el resto puede repetirse/intercalarse). */
export const MANDATORY_SLIDE_KINDS: readonly SlideKind[] = [
  "portada",
  "aprendizaje",
  "objetivo",
  "ruta",
  "activacion",
  "ticket",
];

export const SLIDE_BLOCK_TYPES = [
  "title",
  "text",
  "image",
  "video",
  "quote",
  "question",
  "instruction",
  "timer",
  "callout",
  "compare",
  "resource",
] as const;

export type SlideBlockType = (typeof SLIDE_BLOCK_TYPES)[number];

/** Bloque de una diapositiva (contenido estructurado; se sanitiza en servidor). */
export interface SlideBlock {
  id: string;
  type: SlideBlockType;
  title?: string;
  text?: string;
  url?: string;
  options?: string[];
  /** Solo para preguntas; NUNCA se entrega a estudiantes por el cliente. */
  correctIndex?: number;
  explanation?: string;
  hidden?: boolean;
  timerSeconds?: number;
  a?: string;
  b?: string;
  note?: string;
}

export interface Slide {
  id: string;
  kind: SlideKind;
  title?: string;
  blocks: SlideBlock[];
}

export interface ProjectionConfig {
  timerDefault?: number | null;
  theme?: string;
  showAnswers?: boolean;
}

/** Presentación proyectable de una clase (DeckPlayer). */
export interface SlideDeck {
  classId: string;
  courseId: string;
  version: number;
  slides: Slide[];
  config: ProjectionConfig;
  updatedAt: IsoTimestamp;
  updatedBy: string;
}

/** Token de proyección (expiración corta; sin cuentas por estudiante). */
export interface ProjectionToken {
  tokenId: string;
  classId: string;
  courseId: string;
  expiresAt: IsoTimestamp;
  createdBy: string;
  createdAt: IsoTimestamp;
}

/** Resultados agregados de una votación/pregunta colectiva. */
export interface VoteResult {
  classId: string;
  questionId: string;
  counts: Record<string, number>;
  total: number;
  updatedAt: IsoTimestamp;
}
