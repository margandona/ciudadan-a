import type { DuplicateKind, ImportIssue } from "@pclab/shared";
import { DUPLICATE_KIND, IMPORT_ISSUE_CODE, ISSUE_LEVEL } from "@pclab/shared";
import { hasDoubleSpace, hasLeadingOrTrailingSpace, isAllCaps } from "./name-rules";

/** Referencia a una estudiante existente (solo lo necesario para comparar). */
export interface ExistingStudentRef {
  id: string;
  normalizedSearchName: string;
  courseId: string;
  active: boolean;
}

/** Clave estable de comparación: nombre normalizado + curso. */
export function studentMatchKey(normalizedSearchName: string, courseId: string): string {
  return `${courseId}|${normalizedSearchName}`;
}

/**
 * Valida y produce advertencias sobre un nombre en bruto.
 * NUNCA corrige el nombre silenciosamente.
 */
export function validateRawName(raw: string): ImportIssue[] {
  const issues: ImportIssue[] = [];
  if (!raw || raw.trim().length === 0) {
    issues.push({
      code: IMPORT_ISSUE_CODE.MISSING_NAME,
      level: ISSUE_LEVEL.BLOCKER,
      message: "Nombre faltante en la fila.",
    });
    return issues;
  }
  if (hasDoubleSpace(raw)) {
    issues.push({
      code: IMPORT_ISSUE_CODE.DOUBLE_SPACE,
      level: ISSUE_LEVEL.WARNING,
      message: "Doble espacio detectado en el nombre.",
    });
  }
  if (hasLeadingOrTrailingSpace(raw)) {
    issues.push({
      code: IMPORT_ISSUE_CODE.LEADING_TRAILING_SPACE,
      level: ISSUE_LEVEL.WARNING,
      message: "Espacios al inicio o final del nombre.",
    });
  }
  if (isAllCaps(raw)) {
    issues.push({
      code: IMPORT_ISSUE_CODE.SUSPICIOUS_NAME,
      level: ISSUE_LEVEL.INFO,
      message: "El nombre está en mayúsculas completas; verificar formato.",
    });
  }
  return issues;
}

/**
 * Clasifica una candidata respecto a la población existente y al propio archivo.
 * - DUPLICATE_CONFIRMED: coincidencia exacta (nombre normalizado + curso).
 * - POSSIBLE_DUPLICATE: primer nombre + último apellido iguales pero no exacto.
 * - NEW: no coincide.
 * Nunca se fusionan automáticamente los "posibles duplicados".
 */
export function classifyDuplicate(
  candidate: {
    normalizedSearchName: string;
    firstName?: string;
    paternalSurname?: string;
    courseId: string;
  },
  existing: ExistingStudentRef[],
  inFileSeen: Map<string, DuplicateKind>,
): { kind: DuplicateKind; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const key = studentMatchKey(candidate.normalizedSearchName, candidate.courseId);

  // 1) Dentro del mismo archivo
  const inFile = inFileSeen.get(key);
  if (inFile === DUPLICATE_KIND.DUPLICATE_CONFIRMED) {
    issues.push({
      code: IMPORT_ISSUE_CODE.DUPLICATE_CONFIRMED,
      level: ISSUE_LEVEL.WARNING,
      message: "Nombre duplicado dentro del mismo archivo.",
    });
    return { kind: DUPLICATE_KIND.DUPLICATE_CONFIRMED, issues };
  }

  // 2) Contra la base existente
  const exact = existing.find((e) => studentMatchKey(e.normalizedSearchName, e.courseId) === key);
  if (exact) {
    issues.push({
      code: IMPORT_ISSUE_CODE.DUPLICATE_CONFIRMED,
      level: ISSUE_LEVEL.WARNING,
      message: exact.active
        ? "Estudiante ya registrada en el curso."
        : "Estudiante ya registrada y desactivada; se reactivará.",
    });
    return { kind: DUPLICATE_KIND.DUPLICATE_CONFIRMED, issues };
  }

  // 3) Posible duplicado: mismo primer nombre y al menos un apellido compartido,
  //    dentro del mismo curso. Nunca se fusiona automáticamente.
  const candTokens = candidate.normalizedSearchName.split(" ").filter(Boolean);
  if (candTokens.length >= 2) {
    const candRest = new Set(candTokens.slice(1));
    const possible = existing.find((e) => {
      if (e.courseId !== candidate.courseId) return false;
      const exTokens = e.normalizedSearchName.split(" ").filter(Boolean);
      if (exTokens[0] !== candTokens[0]) return false;
      return exTokens.slice(1).some((t) => candRest.has(t));
    });
    if (possible) {
      issues.push({
        code: IMPORT_ISSUE_CODE.POSSIBLE_DUPLICATE,
        level: ISSUE_LEVEL.WARNING,
        message: "Posible duplicado por nombre y apellido similar.",
      });
      return { kind: DUPLICATE_KIND.POSSIBLE_DUPLICATE, issues };
    }
  }

  return { kind: DUPLICATE_KIND.NEW, issues };
}

/** Registra una clave como vista dentro del archivo. */
export function markSeenInFile(
  inFileSeen: Map<string, DuplicateKind>,
  normalizedSearchName: string,
  courseId: string,
): void {
  const key = studentMatchKey(normalizedSearchName, courseId);
  const current = inFileSeen.get(key);
  if (!current) inFileSeen.set(key, DUPLICATE_KIND.NEW);
  else inFileSeen.set(key, DUPLICATE_KIND.DUPLICATE_CONFIRMED);
}
