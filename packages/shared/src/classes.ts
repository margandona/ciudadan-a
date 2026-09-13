import type { IsoTimestamp } from "./types";
import { CLASS_STATUS, type ClassStatus } from "./constants";

export { CLASS_STATUS, type ClassStatus };

/** Etiquetas en español para los estados de clase (solo presentación). */
export const CLASS_STATUS_LABELS: Record<ClassStatus, string> = {
  [CLASS_STATUS.DRAFT]: "Borrador",
  [CLASS_STATUS.READY]: "Lista",
  [CLASS_STATUS.SCHEDULED]: "Programada",
  [CLASS_STATUS.OPEN]: "Abierta",
  [CLASS_STATUS.IN_PROGRESS]: "En curso",
  [CLASS_STATUS.CLOSED]: "Cerrada",
  [CLASS_STATUS.COMPLETED]: "Completada",
  [CLASS_STATUS.ARCHIVED]: "Archivada",
};

/** Estados visibles para la estudiante. */
export const STUDENT_VISIBLE_STATUS: readonly ClassStatus[] = [
  CLASS_STATUS.READY,
  CLASS_STATUS.SCHEDULED,
  CLASS_STATUS.OPEN,
  CLASS_STATUS.IN_PROGRESS,
];

/** Estados en los que el aula invertida está habilitada. */
export const FLIPPED_AVAILABLE_STATUS: readonly ClassStatus[] = [
  CLASS_STATUS.READY,
  CLASS_STATUS.SCHEDULED,
  CLASS_STATUS.OPEN,
  CLASS_STATUS.IN_PROGRESS,
];

/** Catálogo de misiones (mismo para todos los cursos). */
export interface ClassEntity {
  id: string; // 'class-01' … 'class-12', alternativas 'class-13'…
  number: number; // 1..12 (orden de la ruta); alternativas pueden usar 13+
  missionId: string; // 'mission-01'
  /** True si es una misión alternativa (fuera de la ruta de 12). */
  alternative?: boolean;
  title: string; // 'Misión 01 — ¿Qué significa ser ciudadana?'
  subtitle?: string;
  unitId: string; // 'U3' | 'U4'
  oaIds: string[];
  learningGoal?: string;
  order: number;
  hasFeedback: boolean; // clases 1, 4, 7, 10
  flippedEnabled: boolean;
  estMinutes: number; // 10–15
  rubricId?: string;
  materialIds?: string[];
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

/** Disponibilidad de una clase en un curso (programada por el profesor). */
export interface ClassAvailability {
  enabled: boolean;
  startAt?: IsoTimestamp | null;
  endAt?: IsoTimestamp | null;
  flippedAvailable: boolean; // flippedLessonAvailable
  activityAvailable: boolean; // classActivityAvailable
  submissionAvailable: boolean;
  feedbackAvailable: boolean;
}

/** Horario/estado de una clase para un curso concreto. */
export interface ClassSchedule {
  classId: string;
  courseId: string;
  status: ClassStatus;
  availability: ClassAvailability;
  updatedAt: IsoTimestamp;
  updatedBy: string;
}

/** Atribución de recursos externos (derechos verificados requeridos). */
export interface Attribution {
  author?: string;
  license?: string;
  source?: string;
  originalUrl?: string;
  verified?: boolean;
}

/** Bloques del aula invertida (contenido estructurado, no HTML arbitrario). */
export type FlippedBlock =
  | { type: "title"; id: string; text: string }
  | { type: "objective"; id: string; text: string }
  | { type: "problem"; id: string; text: string }
  | { type: "concepts"; id: string; items: string[] }
  | { type: "text"; id: string; markdown: string; readingLevel?: "simple" | "standard" }
  | { type: "image"; id: string; url: string; alt: string; caption?: string; attribution?: Attribution; note?: string }
  | { type: "video"; id: string; url: string; title?: string; subtitles?: boolean; note?: string }
  | { type: "map"; id: string; ref: string; alt?: string; attribution?: Attribution; note?: string }
  | { type: "infographic"; id: string; url: string; alt: string; attribution?: Attribution; note?: string }
  | { type: "reading"; id: string; title: string; text: string; source?: Attribution }
  | {
      type: "question";
      id: string;
      prompt: string;
      options: string[];
      correctIndex: number;
      explanation?: string;
      kind: "choice" | "truefalse";
    }
  | { type: "reflection"; id: string; prompt: string }
  | { type: "resource"; id: string; title: string; url?: string; note?: string; attribution?: Attribution }
  | { type: "gameRef"; id: string; gameId: string; title?: string };

/** Bloques que la estudiante debe recorrer para habilitar "Estoy lista para la misión". */
export const INTERACTIVE_BLOCK_TYPES = new Set<FlippedBlock["type"]>([
  "text",
  "image",
  "video",
  "map",
  "infographic",
  "reading",
  "question",
  "reflection",
  "gameRef",
]);

/** Aula invertida de una clase (contenido global). */
export interface FlippedLesson {
  classId: string;
  title: string;
  objective: string;
  problemQuestion: string;
  concepts: string[];
  blocks: FlippedBlock[];
  estMinutes: number; // 10–15
  readyLabel: string; // «Estoy lista para la misión»
  version: number;
  updatedAt: IsoTimestamp;
}

/** Progreso individual del aula invertida. El tiempo no es punitivo. */
export interface FlippedProgress {
  classId: string;
  studentId: string;
  courseId: string;
  startedAt?: IsoTimestamp | null;
  completedAt?: IsoTimestamp | null;
  progressPercent: number;
  blocksVisited: string[];
  interactionSeconds: number;
  quizAttempts: number;
  quizScore?: number | null;
  reflection?: string;
  ready: boolean;
  updatedAt: IsoTimestamp;
}
