import type { IsoTimestamp } from "./types";

/** Dimensión A: experiencia con la aplicación (escala 1..5). */
export interface FeedbackApp {
  easyToFind: number;
  clear: number;
  working: number;
  open: string; // ¿qué mejorarías?
}

/** Dimensión B: experiencia de aprendizaje y docencia (escala 1..5). */
export interface FeedbackLearning {
  objective: number; // entendí el objetivo de la clase
  clarity: number; // explicaciones claras
  helpful: number; // actividades me ayudaron
  participated: number; // pude participar
  comfortable: number; // me sentí cómoda preguntando
  bestActivity: string;
  change: string;
  keep: string;
}

/** Feedback privado de la estudiante (anonimato configurable por curso). */
export interface Feedback {
  classId: string;
  courseId: string;
  studentId: string;
  anon: boolean;
  app: FeedbackApp;
  learning: FeedbackLearning;
  submittedAt: IsoTimestamp;
}

/** Promedios por clase (agregados; sin datos individuales si es anónimo). */
export interface FeedbackTendency {
  classId: string;
  responses: number;
  avg: {
    appEasy: number;
    appClear: number;
    appWorking: number;
    objective: number;
    clarity: number;
    helpful: number;
    participated: number;
    comfortable: number;
  };
  /** Comentarios abiertos. Si `anon` true se muestran sin identidad. */
  openComments: { anon: boolean; bestActivity: string; change: string; keep: string; appOpen: string }[];
}

export interface FeedbackTendencies {
  courseId: string;
  tendencies: FeedbackTendency[];
  totalResponses: number;
}

/** Rendimiento de una pregunta de quiz entre todos los intentos. */
export interface QuestionPerformance {
  quizId: string;
  quizTitle: string;
  questionId: string;
  prompt: string;
  correctRate: number; // 0..1
  attempts: number;
  /** Retroalimentación sugerida automáticamente según el rendimiento. */
  suggestion?: string;
}

/** Analítica pedagógica de una clase (descriptiva, sin etiquetas). */
export interface ClassAnalytics {
  classId: string;
  flippedPercent: number;
  pendingEvidences: number;
  exitTickets: number;
  avgDifficulty: number | null;
  participation: number;
  lowPerformance: QuestionPerformance[];
  /** Duración promedio de los quizzes (minutos). */
  avgQuizMinutes: number | null;
}

export interface CourseAnalytics {
  courseId: string;
  classes: ClassAnalytics[];
  /** Alertas descriptivas ("N estudiantes perciben dificultad alta…"). */
  alerts: string[];
}
