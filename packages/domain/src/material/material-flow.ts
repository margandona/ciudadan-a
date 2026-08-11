import { MATERIAL_KIND, MATERIAL_STATUS, type MaterialStatus } from "@pclab/shared";
import { ValidationError } from "../errors";

/** Transiciones de estado válidas del flujo de revisión de materiales. */
export const MATERIAL_TRANSITIONS: Record<MaterialStatus, MaterialStatus[]> = {
  [MATERIAL_STATUS.BORRADOR]: [MATERIAL_STATUS.EN_REVISION],
  [MATERIAL_STATUS.EN_REVISION]: [
    MATERIAL_STATUS.CON_OBSERVACIONES,
    MATERIAL_STATUS.APROBADO,
    MATERIAL_STATUS.RECHAZADO,
    MATERIAL_STATUS.CORREGIR_Y_REENVIAR,
  ],
  [MATERIAL_STATUS.CON_OBSERVACIONES]: [MATERIAL_STATUS.EN_REVISION],
  [MATERIAL_STATUS.CORREGIR_Y_REENVIAR]: [MATERIAL_STATUS.EN_REVISION],
  [MATERIAL_STATUS.APROBADO]: [],
  [MATERIAL_STATUS.RECHAZADO]: [],
};

/** ¿Se puede mover el material al nuevo estado? */
export function canTransitionMaterial(current: MaterialStatus, next: MaterialStatus): boolean {
  return MATERIAL_TRANSITIONS[current]?.includes(next) ?? false;
}

/** MIME permitidos para versiones de material. */
export const ALLOWED_MATERIAL_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

/** Valida una versión de material (tipo, mime permitido, tamaño, nombre). */
export function validateMaterialVersion(version: {
  kind: string;
  fileName: string;
  mime?: string;
  size?: number;
}): void {
  if (version.kind !== MATERIAL_KIND.GENERAL && version.kind !== MATERIAL_KIND.DUA) {
    throw new ValidationError("La versión debe ser GENERAL o DUA.");
  }
  if (!version.fileName?.trim()) {
    throw new ValidationError("El nombre del archivo es obligatorio.");
  }
  if (version.mime && !ALLOWED_MATERIAL_MIMES.includes(version.mime)) {
    throw new ValidationError("Formato no permitido (usar PDF o DOCX).");
  }
  if (version.size && version.size > MAX_SIZE) {
    throw new ValidationError("El archivo supera el tamaño máximo (50 MB).");
  }
}
