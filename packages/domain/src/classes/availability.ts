import {
  CLASS_STATUS,
  STUDENT_VISIBLE_STATUS,
  type ClassAvailability,
  type ClassSchedule,
} from "@pclab/shared";
import { ValidationError } from "../errors";

/** Visibilidad de una clase para la estudiante en un instante dado. */
export type StudentVisibility = "hidden" | "locked" | "open" | "done";

/** Disponibilidad por defecto al abrir una clase. */
export function defaultAvailability(): ClassAvailability {
  return {
    enabled: true,
    startAt: null,
    endAt: null,
    flippedAvailable: true,
    activityAvailable: true,
    submissionAvailable: true,
    feedbackAvailable: false,
  };
}

/** Resuelve la visibilidad de una clase para la estudiante. */
export function resolveStudentVisibility(
  schedule: ClassSchedule | null,
  nowIso: string,
): StudentVisibility {
  if (!schedule) return "hidden";
  if (schedule.status === CLASS_STATUS.DRAFT || schedule.status === CLASS_STATUS.ARCHIVED) {
    return "hidden";
  }
  // Completadas o cerradas: accesibles como «done» (se puede reingresar al material).
  if (schedule.status === CLASS_STATUS.COMPLETED || schedule.status === CLASS_STATUS.CLOSED) return "done";
  if (!STUDENT_VISIBLE_STATUS.includes(schedule.status)) return "hidden";
  if (!schedule.availability.enabled) return "hidden";

  const now = new Date(nowIso).getTime();
  const start = schedule.availability.startAt ? new Date(schedule.availability.startAt).getTime() : null;
  const end = schedule.availability.endAt ? new Date(schedule.availability.endAt).getTime() : null;
  if (start !== null && now < start) return "locked";
  // Misiones ya pasadas: siguen accesibles (marcadas como completadas).
  if (end !== null && now > end) return "done";
  return "open";
}

/** ¿El aula invertida está disponible para la estudiante ahora? */
export function isFlippedAvailable(schedule: ClassSchedule | null, nowIso: string): boolean {
  if (!schedule) return false;
  if (schedule.status === CLASS_STATUS.DRAFT || schedule.status === CLASS_STATUS.ARCHIVED) return false;
  if (!schedule.availability.flippedAvailable) return false;
  const visibility = resolveStudentVisibility(schedule, nowIso);
  return visibility === "open" || visibility === "done";
}

/** Valida un input de programación de clase del profesor. */
export function validateScheduleInput(input: {
  status?: string;
  availability?: Partial<ClassAvailability>;
}): void {
  if (input.status !== undefined && !(input.status in CLASS_STATUS)) {
    throw new ValidationError(`Estado de clase inválido: ${input.status}`);
  }
  if (input.availability) {
    const { startAt, endAt } = input.availability;
    if (startAt && endAt && new Date(startAt).getTime() >= new Date(endAt).getTime()) {
      throw new ValidationError("La fecha de inicio debe ser anterior a la de cierre.");
    }
  }
}
