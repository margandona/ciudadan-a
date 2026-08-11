import type { AcademicProfile, IsoTimestamp, Student } from "@pclab/shared";
import { ValidationError } from "../errors";
import { NAME_LIMITS, normalizeSearchName } from "./name-rules";

/** Datos mínimos para construir una entidad Student (registro académico). */
export interface CreateStudentInput {
  displayName: string;
  courseId: string;
  /** Id de Firestore/Auto-ID, nunca RUT/correo/nombre. */
  id?: string;
  firstName?: string;
  middleName?: string;
  paternalSurname?: string;
  maternalSurname?: string;
  preferredName?: string;
  listNumber?: number;
  active?: boolean;
  archivedAt?: IsoTimestamp | null;
  now?: IsoTimestamp;
}

/** Crea la entidad aplicando reglas de dominio (mínimos y longitudes). */
export function createStudent(input: CreateStudentInput): Student {
  const displayName = input.displayName.trim();
  if (!displayName) throw new ValidationError("El nombre de la estudiante es obligatorio.");
  if (!input.courseId) throw new ValidationError("La estudiante debe pertenecer a un curso.");

  for (const field of ["firstName", "middleName", "paternalSurname", "maternalSurname", "preferredName"] as const) {
    const value = input[field];
    if (value !== undefined && value.length > NAME_LIMITS[field]) {
      throw new ValidationError(`El campo ${field} excede el largo máximo.`);
    }
  }
  if (displayName.length > NAME_LIMITS.displayName) {
    throw new ValidationError("El nombre visible excede el largo máximo.");
  }

  const now = input.now ?? new Date().toISOString();

  return {
    id: input.id ?? "",
    displayName,
    normalizedSearchName: normalizeSearchName(displayName),
    firstName: input.firstName,
    middleName: input.middleName,
    paternalSurname: input.paternalSurname,
    maternalSurname: input.maternalSurname,
    preferredName: input.preferredName,
    courseId: input.courseId,
    listNumber: input.listNumber,
    active: input.active ?? true,
    archivedAt: input.archivedAt ?? null,
    createdAt: now,
    updatedAt: now,
    academicProfile: {
      participationTrackingEnabled: true,
      gamificationEnabled: true,
    },
  };
}

/** Perfil académico por defecto. */
export function defaultAcademicProfile(): AcademicProfile {
  return {
    participationTrackingEnabled: true,
    gamificationEnabled: true,
  };
}

export { NAME_LIMITS, normalizeSearchName };
