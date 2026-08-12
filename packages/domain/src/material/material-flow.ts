import { MATERIAL_KIND } from "@pclab/shared";
import { ValidationError } from "../errors";

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
