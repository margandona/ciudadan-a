import type { IsoTimestamp } from "./types";

/** Tipos de pregunta soportados por el motor de quizzes propio. */
export const QUESTION_TYPE = {
  CHOICE: "choice",
  TRUE_FALSE: "truefalse",
  ORDER: "order",
  MATCH: "match",
  FILL: "fill",
  SHORT: "short",
  IDENTIFY: "identify", // identificar sobre imagen
  IMAGE: "image", // pregunta con imagen
  MAP: "map", // pregunta con mapa
} as const;

export type QuestionType = (typeof QUESTION_TYPE)[keyof typeof QUESTION_TYPE];

/** Modos de un quiz. */
export const QUIZ_MODE = {
  INDIVIDUAL: "INDIVIDUAL",
  COLLECTIVE: "COLLECTIVE",
} as const;

export type QuizMode = (typeof QUIZ_MODE)[keyof typeof QUIZ_MODE];

/** Pregunta de un quiz (la `answer`/`correct*` NUNCA se entrega a estudiantes por el cliente). */
export interface QuizQuestion {
  id: string;
  quizId: string;
  type: QuestionType;
  prompt: string;
  options?: string[]; // choice/truefalse/identify/image/map/order
  imageUrl?: string;
  mapId?: string;
  explanation?: string;
  points: number;
  order: number;
  // --- datos de corrección (solo servidor) ---
  correctIndex?: number; // choice/truefalse/identify/image/map
  correctOrder?: string[]; // order: ids de opciones en orden correcto
  correctPairs?: Record<string, string>; // match: leftId -> rightId
  correctText?: string[]; // fill: respuestas aceptadas
  keywords?: string[]; // short: palabras clave para corrección por servidor
}

/** Configuración de un quiz. */
export interface QuizConfig {
  timerSeconds?: number | null; // opcional
  points: number; // puntos base por pregunta
  attempts: number; // intentos permitidos
  immediateFeedback: boolean;
  showExplanation: boolean;
}

/** Quiz (motor propio, sin branding ajeno). */
export interface Quiz {
  id: string;
  classId: string;
  courseId: string;
  title: string;
  mode: QuizMode;
  config: QuizConfig;
  shuffle: boolean;
  active: boolean;
  order: number;
  questionCount: number;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

/** Respuesta dada por la estudiante (formato independiente del tipo). */
export interface QuizAnswerGiven {
  qid: string;
  /** choice/truefalse/identify/image/map: índice de opción · fill/short: texto · order: ids · match: {leftId:rightId} */
  given: string | number | string[] | Record<string, string>;
}

/** Resultado por pregunta tras la corrección server-side. */
export interface QuizAnswerResult {
  qid: string;
  given: QuizAnswerGiven["given"] | null;
  correct: boolean;
  points: number;
}

/** Intento de quiz de una estudiante. */
export interface QuizAttempt {
  quizId: string;
  studentId: string;
  classId: string;
  courseId: string;
  startedAt?: IsoTimestamp | null;
  submittedAt?: IsoTimestamp | null;
  score: number;
  maxScore: number;
  answers: QuizAnswerResult[];
  status: "IN_PROGRESS" | "SUBMITTED";
}

/** Etiquetas en español para el estado de un intento (solo presentación). */
export const QUIZ_ATTEMPT_STATUS_LABELS: Record<QuizAttempt["status"], string> = {
  IN_PROGRESS: "En curso",
  SUBMITTED: "Enviado",
};

/** Pregunta tal como se entrega a la estudiante (SIN datos de corrección). */
export type StudentQuestion = Omit<
  QuizQuestion,
  "correctIndex" | "correctOrder" | "correctPairs" | "correctText" | "keywords"
>;

/** Quiz servido a la estudiante (sin respuestas). */
export interface StudentQuiz {
  quiz: Pick<Quiz, "id" | "title" | "mode" | "config" | "shuffle">;
  questions: StudentQuestion[];
  attempt: QuizAttempt | null;
}
