import { QUESTION_TYPE, type QuizAnswerGiven, type QuizAnswerResult, type QuizQuestion } from "@pclab/shared";

/** Porcentaje mínimo para considerar un quiz aprobado. */
export const QUIZ_PASS_RATIO = 0.6;
/** XP de actividad otorgado por cada quiz aprobado (primera vez). */
export const QUIZ_PASS_XP = 25;

/** ¿El intento alcanza el mínimo para aprobar? */
export function isQuizPassing(attempt: { score: number; maxScore: number }): boolean {
  return attempt.maxScore > 0 && attempt.score / attempt.maxScore >= QUIZ_PASS_RATIO;
}

/**
 * XP que otorga aprobar un quiz: solo la primera vez (si el intento anterior ya
 * estaba aprobado, no vuelve a sumar).
 */
export function quizXpAward(
  previous: { score: number; maxScore: number } | null | undefined,
  next: { score: number; maxScore: number },
): number {
  const wasPassing = !!previous && isQuizPassing(previous);
  return isQuizPassing(next) && !wasPassing ? QUIZ_PASS_XP : 0;
}

/** Normaliza texto para comparar respuestas de tipo fill/short. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function recordsEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => a[k] === b[k]);
}

/** Corrige una pregunta según su tipo (lógica pura, usada server-side). */
export function gradeQuestion(question: QuizQuestion, given: QuizAnswerGiven["given"]): QuizAnswerResult {
  let correct = false;
  switch (question.type) {
    case QUESTION_TYPE.CHOICE:
    case QUESTION_TYPE.TRUE_FALSE:
    case QUESTION_TYPE.IDENTIFY:
    case QUESTION_TYPE.IMAGE:
    case QUESTION_TYPE.MAP:
      correct = typeof given === "number" && given === question.correctIndex;
      break;
    case QUESTION_TYPE.ORDER:
      correct =
        Array.isArray(given) &&
        typeof question.correctOrder !== "undefined" &&
        arraysEqual(given as string[], question.correctOrder);
      break;
    case QUESTION_TYPE.MATCH:
      correct =
        given !== null &&
        typeof given === "object" &&
        !Array.isArray(given) &&
        typeof question.correctPairs !== "undefined" &&
        recordsEqual(given as Record<string, string>, question.correctPairs);
      break;
    case QUESTION_TYPE.FILL: {
      const accepted = (question.correctText ?? []).map(normalizeText);
      correct = typeof given === "string" && accepted.includes(normalizeText(given));
      break;
    }
    case QUESTION_TYPE.SHORT: {
      const keywords = question.keywords ?? [];
      const text = normalizeText(typeof given === "string" ? given : "");
      correct = keywords.length > 0 && keywords.some((k) => text.includes(normalizeText(k)));
      break;
    }
  }
  return {
    qid: question.id,
    given,
    correct,
    points: correct ? question.points : 0,
  };
}

/** Corrige todas las preguntas de un intento (las sin respuesta cuentan como incorrectas). */
export function gradeAttempt(
  questions: QuizQuestion[],
  answers: QuizAnswerGiven[],
): QuizAnswerResult[] {
  const byQid = new Map(answers.map((a) => [a.qid, a.given]));
  return questions.map((q) => {
    const given = byQid.get(q.id);
    return given === undefined
      ? { qid: q.id, given: null, correct: false, points: 0 }
      : gradeQuestion(q, given);
  });
}

/** Máximo de puntos posible para un set de preguntas. */
export function maxPoints(questions: QuizQuestion[]): number {
  return questions.reduce((acc, q) => acc + q.points, 0);
}

/** Valida que la forma de `given` corresponda al tipo de la pregunta. */
export function validateGiven(question: QuizQuestion, given: unknown): boolean {
  switch (question.type) {
    case QUESTION_TYPE.CHOICE:
    case QUESTION_TYPE.TRUE_FALSE:
    case QUESTION_TYPE.IDENTIFY:
    case QUESTION_TYPE.IMAGE:
    case QUESTION_TYPE.MAP:
      return typeof given === "number";
    case QUESTION_TYPE.ORDER:
      return Array.isArray(given) && (given as unknown[]).every((v) => typeof v === "string");
    case QUESTION_TYPE.MATCH:
      return (
        given !== null &&
        typeof given === "object" &&
        !Array.isArray(given) &&
        Object.values(given as Record<string, unknown>).every((v) => typeof v === "string")
      );
    case QUESTION_TYPE.FILL:
    case QUESTION_TYPE.SHORT:
      return typeof given === "string";
    default:
      return false;
  }
}
