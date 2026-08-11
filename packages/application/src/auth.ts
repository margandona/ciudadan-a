import { ROLES } from "@pclab/shared";
import { ValidationError } from "@pclab/domain";
import type { AuthContext } from "./ports";

/** Verifica que el actor tenga alguno de los roles indicados. */
export function assertRole(actor: AuthContext | null, roles: readonly string[]): void {
  if (!actor || actor.isServer) return;
  if (!roles.includes(actor.role)) {
    throw new ValidationError("No tienes permisos para esta acción.", "FORBIDDEN");
  }
}

/** Verifica que el actor pertenezca al curso (o sea admin/master/server). */
export function assertCourse(actor: AuthContext | null, courseId: string): void {
  if (!actor || actor.isServer) return;
  if (actor.role === ROLES.MASTER || actor.role === ROLES.ADMIN) return;
  if (!actor.courses.includes(courseId)) {
    throw new ValidationError("No tienes acceso a este curso.", "COURSE_FORBIDDEN");
  }
}
