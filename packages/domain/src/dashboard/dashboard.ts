import { CALENDAR_STATUS, type CalendarStatus } from "@pclab/shared";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Porcentaje redondeado. */
export function percent(completed: number, total: number): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

/** Días (redondeados) entre now y deadline. */
export function daysLeft(deadlineIso: string, nowIso: string): number {
  return Math.round((new Date(deadlineIso).getTime() - new Date(nowIso).getTime()) / DAY_MS);
}

/**
 * Estado de alerta del calendario:
 * - días >= leadDays → verde (listo)
 * - 0 <= días < leadDays → amarillo (plazo próximo)
 * - días < 0 → rojo (vencido)
 */
export function calendarStatus(deadlineIso: string, nowIso: string, leadDays: number): {
  daysLeft: number;
  status: CalendarStatus;
} {
  const days = daysLeft(deadlineIso, nowIso);
  if (days < 0) return { daysLeft: days, status: CALENDAR_STATUS.RED };
  if (days < leadDays) return { daysLeft: days, status: CALENDAR_STATUS.YELLOW };
  return { daysLeft: days, status: CALENDAR_STATUS.GREEN };
}
