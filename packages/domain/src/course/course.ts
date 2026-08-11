import type { AcademicProfile, Course, IsoTimestamp } from "@pclab/shared";
import { COURSE_LEVELS, SUBJECT_EDUCACION_CIUDADANA } from "@pclab/shared";
import { ValidationError } from "../errors";

/** Datos mínimos para crear un curso real. */
export interface CreateCourseInput {
  name: string;
  section: string;
  level?: string;
  subject?: string;
  year: number;
  teacherId?: string;
}

/**
 * Crea la entidad Course validando las reglas de negocio.
 * No genera el id (lo asigna el repositorio/Firestore).
 */
export function createCourse(input: CreateCourseInput): Omit<Course, "id" | "createdAt" | "updatedAt"> {
  const name = input.name.trim();
  const section = input.section.trim();

  if (!name) throw new ValidationError("El nombre del curso es obligatorio.");
  if (!section) throw new ValidationError("La sección del curso es obligatoria.");
  if (!Number.isInteger(input.year) || input.year < 2000 || input.year > 2100) {
    throw new ValidationError("Año académico inválido.");
  }

  return {
    name,
    level: (input.level ?? COURSE_LEVELS.TERCERO_MEDIO) as Course["level"],
    section,
    subject: input.subject ?? SUBJECT_EDUCACION_CIUDADANA,
    year: input.year,
    teacherId: input.teacherId,
    active: true,
    settings: {
      participationScale: [0, 1, 2, 3],
      feedbackAnonymous: false,
    },
  };
}

/** Convierte la entidad a una representación serializable para Firestore. */
export function courseToRecord(course: Course): Record<string, unknown> {
  return { ...course };
}

export type { IsoTimestamp, AcademicProfile };
