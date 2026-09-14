import type { IsoTimestamp } from "./types";
import { SUBMISSION_STATUS, type SubmissionStatus } from "./constants";

export { SUBMISSION_STATUS, type SubmissionStatus };

/** Dilema o caso de la clase (asignado por el docente, visible para las estudiantes). */
export interface ActivityDilemma {
  title: string;
  text: string;
  /** Perspectivas o actores para analizar (opcional, p. ej. las 3 tradiciones). */
  perspectives?: { label: string; text: string }[];
  /** Pregunta de cierre para la evidencia. */
  question?: string;
}

/** Actividad de una clase (instrucciones + evidencia esperada). */
export interface Activity {
  id: string;
  classId: string;
  courseId: string;
  title: string;
  type: string; // dilemma | council | map | investigation | cabildo | budgetSim | dataLab | project | fair | ...
  description: string;
  instructions: string[];
  /** Dilema/caso de la clase (opcional). */
  dilemma?: ActivityDilemma;
  evidenceRequired: boolean;
  evidenceTypes: string[];
  rubricId?: string;
  maxScore?: number;
  order: number;
  active: boolean;
}

/** Adjunto de una evidencia. */
export interface EvidenceAttachment {
  type: "pdf" | "image" | "doc" | "audio" | "link" | "file";
  url: string;
  name?: string;
  mime?: string;
  size?: number;
  storagePath?: string;
}

/** Evidencia entregada (submission). */
export interface Submission {
  id: string;
  activityId: string;
  studentId: string;
  classId: string;
  courseId: string;
  status: SubmissionStatus;
  content: {
    text?: string;
    shortAnswer?: string;
    choice?: number;
    formFields?: Record<string, string>;
  };
  attachments: EvidenceAttachment[];
  score?: number | null;
  teacherFeedback?: string;
  rubricData?: Record<string, unknown> | null;
  attempts: number;
  submittedAt?: IsoTimestamp | null;
  updatedAt: IsoTimestamp;
}

/** Ticket de salida de una clase. */
export interface ExitTicket {
  classId: string;
  courseId: string;
  studentId: string;
  answers: {
    learned: string; // ¿Qué aprendí hoy?
    evidence: string; // ¿Qué evidencia me ayudó?
    concept: string; // ¿Qué concepto puedo explicar?
    question: string; // ¿Qué pregunta todavía tengo?
    relationOvalle: string; // ¿Cómo se relaciona esto con Ovalle?
  };
  difficulty: number; // 1..5
  submittedAt: IsoTimestamp;
}
