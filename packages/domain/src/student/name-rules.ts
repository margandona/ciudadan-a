/**
 * Reglas de nombres (dominio).
 * La interfaz SIEMPRE muestra el nombre original (con tildes y Ñ).
 * `normalizedSearchName` es solo interno para búsqueda y comparaciones.
 */

export interface NameParts {
  firstName?: string;
  middleName?: string;
  paternalSurname?: string;
  maternalSurname?: string;
  /** true cuando el reparto entre nombres/apellidos es incierto (p. ej. nombres compuestos). */
  ambiguous: boolean;
}

/** Nombre normalizado interno: minúsculas, sin tildes, espacios colapsados. */
export function normalizeSearchName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Detecta espacios duplicados en el nombre original. */
export function hasDoubleSpace(raw: string): boolean {
  return /\s{2,}/.test(raw);
}

/** Detecta espacios al inicio/final. */
export function hasLeadingOrTrailingSpace(raw: string): boolean {
  return /^\s|\s$/.test(raw);
}

/** Indica si el texto parece estar en mayúsculas completas (posible fuente de error). */
export function isAllCaps(raw: string): boolean {
  const letters = raw.replace(/[^\p{L}]/gu, "");
  return letters.length >= 4 && letters === letters.toUpperCase();
}

const COMPOUND_START_WORDS = new Set([
  "maria", "jose", "mari", "ana", "juan", "angel", "rosa", "carmen", "luis",
  "marta", "pedro", "pablo", "julia", "mario", "rosa maria",
]);

/**
 * Reparto conservador de un nombre completo en partes.
 * Nunca corrige el original: devuelve una SUGERENCIA editable en preview.
 */
export function suggestNameParts(fullName: string): NameParts {
  const cleaned = fullName.replace(/\s+/g, " ").trim();
  const tokens = cleaned.split(" ").filter((t) => t.length > 0);
  const parts: NameParts = { ambiguous: false };

  if (tokens.length === 0) return parts;

  if (tokens.length === 1) {
    parts.firstName = tokens[0];
    parts.ambiguous = true;
    return parts;
  }

  if (tokens.length === 2) {
    parts.firstName = tokens[0];
    parts.paternalSurname = tokens[1];
    return parts;
  }

  // 3+ tokens: suponemos 1 nombre + apellidos, o nombre compuesto + apellidos.
  const last = tokens.length - 1;
  parts.maternalSurname = tokens[last];
  parts.paternalSurname = tokens[last - 1];

  const nameTokens = tokens.slice(0, last - 1);
  parts.firstName = nameTokens[0];

  const rest = nameTokens.slice(1);
  if (rest.length > 0) {
    // No sabemos si `rest` es segundo nombre o primer apellido compuesto.
    parts.middleName = rest.join(" ");
    parts.ambiguous = true;
  } else if (COMPOUND_START_WORDS.has(normalizeSearchName(nameTokens[0] ?? ""))) {
    // Un solo token inicial que suele iniciar nombres compuestos → incierto.
    parts.ambiguous = true;
  }

  return parts;
}

/** Máximos de longitud de campos (protección de datos). */
export const NAME_LIMITS = {
  displayName: 200,
  firstName: 80,
  middleName: 80,
  paternalSurname: 80,
  maternalSurname: 80,
  preferredName: 80,
} as const;
