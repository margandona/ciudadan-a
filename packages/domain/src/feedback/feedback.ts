import type { ClassAnalytics, Feedback, FeedbackTendencies, FeedbackTendency, QuestionPerformance } from "@pclab/shared";
import { percent } from "../dashboard/dashboard";
import { averageDifficulty } from "../participation/participation";
import { ValidationError } from "../errors";

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

/** Valida el feedback (escalas 1..5 y comentarios). */
export function validateFeedback(feedback: Feedback): void {
  const scales = [
    feedback.app.easyToFind,
    feedback.app.clear,
    feedback.app.working,
    feedback.learning.objective,
    feedback.learning.clarity,
    feedback.learning.helpful,
    feedback.learning.participated,
    feedback.learning.comfortable,
  ];
  for (const value of scales) {
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      throw new ValidationError("Las escalas del feedback deben estar entre 1 y 5.");
    }
  }
  const open = [feedback.app.open, feedback.learning.bestActivity, feedback.learning.change, feedback.learning.keep];
  for (const text of open) {
    if (text && text.length > 2000) throw new ValidationError("Comentario demasiado largo.");
  }
}

/** Agrega feedback por clase (sin exponer identidades cuando anon=true). */
export function aggregateFeedbackTendencies(courseId: string, feedback: Feedback[]): FeedbackTendencies {
  const byClass = new Map<string, Feedback[]>();
  for (const f of feedback) {
    const list = byClass.get(f.classId) ?? [];
    list.push(f);
    byClass.set(f.classId, list);
  }

  const tendencies: FeedbackTendency[] = [...byClass.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([classId, items]) => ({
      classId,
      responses: items.length,
      avg: {
        appEasy: avg(items.map((f) => f.app.easyToFind)),
        appClear: avg(items.map((f) => f.app.clear)),
        appWorking: avg(items.map((f) => f.app.working)),
        objective: avg(items.map((f) => f.learning.objective)),
        clarity: avg(items.map((f) => f.learning.clarity)),
        helpful: avg(items.map((f) => f.learning.helpful)),
        participated: avg(items.map((f) => f.learning.participated)),
        comfortable: avg(items.map((f) => f.learning.comfortable)),
      },
      // El comentario abierto se muestra tal cual; la identidad depende de anon.
      openComments: items.map((f) => ({
        anon: f.anon,
        bestActivity: f.learning.bestActivity,
        change: f.learning.change,
        keep: f.learning.keep,
        appOpen: f.app.open,
      })),
    }));

  return { courseId, tendencies, totalResponses: feedback.length };
}

/** Rendimiento de preguntas de quiz (tasa de acierto por pregunta). */
export function questionPerformance(
  quiz: { id: string; title: string },
  attempts: { answers: { qid: string; correct: boolean }[] }[],
): QuestionPerformance[] {
  const byQuestion = new Map<string, { correct: number; attempts: number }>();
  for (const attempt of attempts) {
    for (const answer of attempt.answers) {
      const stat = byQuestion.get(answer.qid) ?? { correct: 0, attempts: 0 };
      stat.attempts += 1;
      if (answer.correct) stat.correct += 1;
      byQuestion.set(answer.qid, stat);
    }
  }
  return [...byQuestion.entries()].map(([questionId, stat]) => ({
    quizId: quiz.id,
    quizTitle: quiz.title,
    questionId,
    prompt: questionId,
    correctRate: stat.attempts > 0 ? Math.round((stat.correct / stat.attempts) * 100) / 100 : 0,
    attempts: stat.attempts,
  }));
}

const LOW_PERFORMANCE_THRESHOLD = 0.6;

/** Construye alertas pedagógicas DESCRIPTIVAS (sin etiquetas ni juicios). */
export function buildAlerts(classes: ClassAnalytics[]): string[] {
  const alerts: string[] = [];
  for (const cls of classes) {
    if (cls.pendingEvidences > 0) {
      alerts.push(`${cls.pendingEvidences} evidencia(s) sin revisar en ${cls.classId}.`);
    }
    if (cls.avgDifficulty !== null && cls.avgDifficulty >= 4) {
      alerts.push(`Dificultad percibida alta (${cls.avgDifficulty}/5) en ${cls.classId}.`);
    }
    for (const question of cls.lowPerformance) {
      if (question.correctRate < LOW_PERFORMANCE_THRESHOLD) {
        const pct = Math.round(question.correctRate * 100);
        alerts.push(`Pregunta con menor rendimiento en ${question.quizTitle}: "${question.prompt?.slice(0, 60)}" (${pct}% acierto).`);
      }
    }
  }
  return alerts;
}

export { percent, averageDifficulty };
