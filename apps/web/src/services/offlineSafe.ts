import { enqueue, registerKindHandler } from "@/services/offlineQueue";
import { submitEvidence, submitExitTicket, submitFeedback, submitQuizAttempt } from "@/services/importApi";

export type OfflineResult<T> = { data: T; queued: false } | { queued: true };

/**
 * Ejecuta una acción; si no hay conexión, la encola para sincronizar después.
 * El handler debe ser idempotente.
 */
export async function offlineSafe<T>(
  kind: string,
  payload: unknown,
  fn: (payload: unknown) => Promise<T>,
): Promise<OfflineResult<T>> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    await enqueue(kind, payload);
    return { queued: true };
  }
  return { data: await fn(payload), queued: false };
}

/** Registra los handlers de reproducción de las acciones de estudiantes. */
export function registerOfflineHandlers(): void {
  registerKindHandler("submitQuizAttempt", (p) => {
    const { quizId, answers } = p as { quizId: string; answers: unknown[] };
    return submitQuizAttempt(quizId, answers as never);
  });
  registerKindHandler("submitEvidence", (p) => submitEvidence(p as never));
  registerKindHandler("submitExitTicket", (p) => submitExitTicket(p as never));
  registerKindHandler("submitFeedback", (p) => submitFeedback(p as never));
}
