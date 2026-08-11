import type { ColumnDetection, ColumnMapping, ParsedSheet } from "@pclab/shared";
import type { ColumnDetector } from "@pclab/application";

const HEADER_ALIASES: Record<string, string[]> = {
  fullName: [
    "nombre alumna", "nombre alumno", "nombre del alumno", "nombre de la alumna",
    "nombre del estudiante", "nombre de la estudiante", "nombre estudiante",
    "nombre completo", "nombre", "nombres", "estudiante", "alumna", "alumno",
  ],
  surnames: ["apellidos", "apellido"],
  course: ["curso", "seccion", "seccion curso", "nivel", "grado"],
  estado: ["estado", "situacion"],
  email: ["correo", "email", "e-mail", "correo electronico", "correo institucional"],
  id: ["no", "nro", "numero", "numero de lista", "matricula", "codigo", "codigo alumno", "lista", "n de lista"],
};

/** Palabras que indican una columna con datos potencialmente sensibles (PII). */
const SENSITIVE_KEYS = ["rut", "run", "pie", "telefono", "celular", "fono", "direccion", "nacimiento", "padre", "madre", "apoderado", "salud", "integracion", "adecuacion", "nea", "observaciones", "diagnostico", "discapacidad"];

function normHeader(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[º°]/g, "o")
    .replace(/\s+/g, " ")
    .trim();
}

/** Detecta columnas equivalentes en la planilla (tolerante a variaciones). */
export class StudentColumnMapper implements ColumnDetector {
  detect(sheet: ParsedSheet): ColumnMapping {
    const detections: ColumnDetection[] = [];
    const columns: ColumnMapping["columns"] = {};

    for (let i = 0; i < sheet.headers.length; i++) {
      const header = sheet.headers[i];
      if (!header) continue;
      const h = normHeader(header);

      const sensitive = SENSITIVE_KEYS.some((k) => h === k || h.includes(k));

      let field = "other";
      let confidence: ColumnDetection["confidence"] = "low";
      for (const [target, aliases] of Object.entries(HEADER_ALIASES)) {
        if (aliases.includes(h)) {
          field = target;
          confidence = "alta";
          if (columns[target as keyof ColumnMapping["columns"]] === undefined) {
            columns[target as keyof ColumnMapping["columns"]] = i;
          }
          break;
        }
      }
      if (field === "other") {
        // coincidencia parcial (p. ej. "NOMBRE ALUMNA" → fullName)
        for (const [target, aliases] of Object.entries(HEADER_ALIASES)) {
          if (aliases.some((a) => h.includes(a) && h.length >= 4)) {
            field = target;
            confidence = "media";
            if (columns[target as keyof ColumnMapping["columns"]] === undefined) {
              columns[target as keyof ColumnMapping["columns"]] = i;
            }
            break;
          }
        }
      }

      detections.push({ index: i, header, field, confidence, sensitive });
    }

    return { sheetName: sheet.name, detections, columns };
  }
}
