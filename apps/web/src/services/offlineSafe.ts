import { enqueue, registerKindHandler } from "@/services/offlineQueue";

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

/**
 * Registra los handlers de reproducción de las acciones de estudiantes.
 * Import dinámico: evita cargar las Cloud Functions en el bundle inicial.
 */
export async function registerOfflineHandlers(): Promise<void> {
  const { submitEvidence, submitExitTicket, submitFeedback, submitQuizAttempt } = await import("@/services/importApi");
  registerKindHandler("submitQuizAttempt", (p) => {
    const { quizId, answers } = p as { quizId: string; answers: unknown[] };
    return submitQuizAttempt(quizId, answers as never);
  });
  registerKindHandler("submitEvidence", (p) => submitEvidence(p as never));
  registerKindHandler("submitExitTicket", (p) => submitExitTicket(p as never));
  registerKindHandler("submitFeedback", (p) => submitFeedback(p as never));
}
