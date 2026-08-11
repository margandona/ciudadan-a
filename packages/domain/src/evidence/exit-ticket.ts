import type { ExitTicket } from "@pclab/shared";
import { ValidationError } from "../errors";

/** Valida el ticket de salida (5 respuestas + dificultad 1..5). */
export function validateExitTicket(ticket: ExitTicket): void {
  const required: (keyof ExitTicket["answers"])[] = ["learned", "evidence", "concept", "question", "relationOvalle"];
  for (const key of required) {
    const value = ticket.answers[key]?.trim();
    if (!value) {
      throw new ValidationError(`El campo "${key}" es obligatorio en el ticket de salida.`);
    }
  }
  if (!Number.isInteger(ticket.difficulty) || ticket.difficulty < 1 || ticket.difficulty > 5) {
    throw new ValidationError("La dificultad debe estar entre 1 y 5.");
  }
}
