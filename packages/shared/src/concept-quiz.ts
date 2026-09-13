/** Quiz de conceptos clave por nivel ("Desafío de Saberes"). */

/** Último nivel con desafío de conceptos (debe coincidir con content/concept-quizzes.json). */
export const CONCEPT_QUIZ_MAX_LEVEL = 12;

export interface ConceptQuestion {
  id: string;
  prompt: string;
  options: string[];
  /** Concepto clave que evalúa la pregunta. */
  concept: string;
  explanation?: string;
}

/** Versión con respuesta (solo servidor). */
export interface ConceptQuestionWithAnswer extends ConceptQuestion {
  correctIndex: number;
}

export interface ConceptQuiz {
  level: number;
  title: string;
  /** Porcentaje mínimo para aprobar (p. ej. 70). */
  passPercent: number;
  /** XP de granja otorgado la primera vez que se aprueba. */
  xpReward: number;
  questions: ConceptQuestionWithAnswer[];
}

/** Versión enviada a la web (sin respuestas). */
export interface ConceptQuizPublic {
  level: number;
  title: string;
  passPercent: number;
  xpReward: number;
  questions: ConceptQuestion[];
}

export interface ConceptQuizAnswerResult {
  id: string;
  correct: boolean;
  correctIndex: number;
  concept: string;
  explanation?: string;
}

export interface ConceptQuizResult {
  level: number;
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  alreadyPassed: boolean;
  xpAwarded: number;
  results: ConceptQuizAnswerResult[];
}

export interface SubmitConceptQuizPayload {
  level: number;
  answers: { id: string; given: number }[];
}
