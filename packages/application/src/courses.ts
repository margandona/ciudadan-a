/** Utilidades de identificación de cursos a partir de nombres de nómina. */

const MEDIO_RE = /3[º°]?\s*(?:ro|er|to)?\s*medio/i;
const SECTION_RE = /\b([a-h])\b/i;

/** Id estable y determinístico de curso. */
export function deriveCourseId(section: string, year: number): string {
  return `course-3med-${section.toLowerCase()}-${year}`;
}

export interface ParsedCourseName {
  section: string;
  displayName: string;
}

/** Extrae sección y nombre de un texto tipo "3º Medio D". */
export function parseCourseName(raw: string | null | undefined): ParsedCourseName | null {
  if (!raw) return null;
  const m = raw.match(MEDIO_RE);
  if (!m) return null;
  const s = raw.match(SECTION_RE);
  const section = s?.[1]?.toUpperCase() ?? "";
  const displayName = section ? `3º Medio ${section}` : "3º Medio";
  return { section, displayName };
}
