import { SUBMISSION_STATUS, type Submission, type SubmissionStatus } from "@pclab/shared";
import { ValidationError } from "../errors";

/** Transiciones de estado válidas para la revisión del profesor. */
const TEACHER_TRANSITIONS: Record<SubmissionStatus, SubmissionStatus[]> = {
  [SUBMISSION_STATUS.PENDIENTE]: [],
  [SUBMISSION_STATUS.ENTREGADO]: [SUBMISSION_STATUS.REVISADO, SUBMISSION_STATUS.RETROALIMENTADO, SUBMISSION_STATUS.REQUIERE_CORRECCION],
  [SUBMISSION_STATUS.REVISADO]: [SUBMISSION_STATUS.RETROALIMENTADO, SUBMISSION_STATUS.REQUIERE_CORRECCION],
  [SUBMISSION_STATUS.RETROALIMENTADO]: [SUBMISSION_STATUS.REQUIERE_CORRECCION],
  [SUBMISSION_STATUS.REQUIERE_CORRECCION]: [SUBMISSION_STATUS.RETROALIMENTADO, SUBMISSION_STATUS.REVISADO, SUBMISSION_STATUS.ENTREGADO],
};

/** Estados en los que la estudiante puede re-entregar contenido. */
const STUDENT_EDITABLE: SubmissionStatus[] = [SUBMISSION_STATUS.ENTREGADO, SUBMISSION_STATUS.REQUIERE_CORRECCION];

/** ¿Puede el profesor mover la evidencia al nuevo estado? */
export function canTransition(current: SubmissionStatus, next: SubmissionStatus): boolean {
  return TEACHER_TRANSITIONS[current]?.includes(next) ?? false;
}

/** ¿La estudiante puede (re)enviar contenido en este estado? */
export function canStudentSubmit(current: SubmissionStatus): boolean {
  return STUDENT_EDITABLE.includes(current);
}

/** Valida que la evidencia tenga contenido o adjuntos. */
export function validateSubmissionContent(submission: Submission): void {
  const { content, attachments } = submission;
  const hasText = Boolean(content?.text?.trim() || content?.shortAnswer?.trim());
  const hasChoice = typeof content?.choice === "number";
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  if (!hasText && !hasChoice && !hasAttachments) {
    throw new ValidationError("La evidencia debe incluir texto, una selección o un adjunto.");
  }
  const MAX_ATTACHMENTS = 5;
  if (attachments.length > MAX_ATTACHMENTS) {
    throw new ValidationError("Máximo 5 adjuntos por evidencia.");
  }
}

/** La estudiante solo puede escribir campos de contenido, nunca score/feedback/estado de revisión. */
export const STUDENT_WRITABLE_FIELDS = ["content", "attachments", "attempts", "status"] as const;
