import * as XLSX from "xlsx";
import type { ParsedRow, ParsedSheet, ParsedWorkbook } from "@pclab/shared";
import type { SpreadsheetParser } from "@pclab/application";

/** Palabras que indican fila de encabezados en una planilla de nómina. */
const HEADER_KEYWORDS = [
  "nombre", "nombres", "apellido", "apellidos", "curso", "seccion", "correo",
  "email", "matricula", "codigo", "rut", "telefono", "lista", "estado",
];

const COURSE_BANNER_RE = /3[º°]?\s*(?:ro|er|to)?\s*medio/i;

function normHeader(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[º°]/g, "o")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeHeaderRow(row: unknown[]): boolean {
  return row.some((c) => {
    if (c === "" || c == null) return false;
    const h = normHeader(String(c));
    return HEADER_KEYWORDS.some((k) => h === k || h.includes(k));
  });
}

/** Parser de planillas Excel/XLSX (SheetJS). Reutilizable con cualquier nómina. */
export class ExcelStudentParser implements SpreadsheetParser {
  async parse(data: Uint8Array): Promise<ParsedWorkbook> {
    const workbook = XLSX.read(data, { type: "array" });
    const sheets: ParsedSheet[] = [];

    for (const sheetName of workbook.SheetNames) {
      const ws = workbook.Sheets[sheetName];
      if (!ws) continue;
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];

      // Filas estructurales (banners institucionales) antes de la fila de encabezados.
      const headerIdx = raw.findIndex(looksLikeHeaderRow);
      const structuralRows = (headerIdx < 0 ? raw : raw.slice(0, headerIdx))
        .filter((r) => r.some((c) => c !== "" && c != null))
        .map((r) => r.filter((c) => c !== "" && c != null).map((c) => String(c)));

      const courseCandidates: string[] = [];
      for (const row of structuralRows) {
        for (const cell of row) {
          if (COURSE_BANNER_RE.test(cell)) {
            courseCandidates.push(cell);
            break;
          }
        }
      }

      let headers: string[] = [];
      const rows: ParsedRow[] = [];
      if (headerIdx >= 0) {
        headers = (raw[headerIdx] as unknown[]).map((c) => String(c ?? "").trim());
        for (let i = headerIdx + 1; i < raw.length; i++) {
          const cells = raw[i];
          if (!cells || cells.every((c) => c === "" || c == null)) continue;
          rows.push({
            rowIndex: i + 1, // número de fila estilo Excel (1-based)
            cells: cells.map((c) => (c == null ? "" : String(c))),
          });
        }
      }

      sheets.push({ name: sheetName, headers, rows, structuralRows, courseCandidates });
    }

    return { fileName: "", sheets };
  }

  /** Lee directamente desde una ruta de archivo (CLI). */
  parseFile(filePath: string): ParsedWorkbook {
    const workbook = XLSX.readFile(filePath, { cellDates: false });
    const sheets: ParsedSheet[] = [];
    for (const sheetName of workbook.SheetNames) {
      const ws = workbook.Sheets[sheetName];
      if (!ws) continue;
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
      const headerIdx = raw.findIndex(looksLikeHeaderRow);
      const structuralRows = (headerIdx < 0 ? raw : raw.slice(0, headerIdx))
        .filter((r) => r.some((c) => c !== "" && c != null))
        .map((r) => r.filter((c) => c !== "" && c != null).map((c) => String(c)));
      const courseCandidates: string[] = [];
      for (const row of structuralRows) {
        for (const cell of row) if (COURSE_BANNER_RE.test(cell)) courseCandidates.push(cell);
      }
      let headers: string[] = [];
      const rows: ParsedRow[] = [];
      if (headerIdx >= 0) {
        headers = (raw[headerIdx] as unknown[]).map((c) => String(c ?? "").trim());
        for (let i = headerIdx + 1; i < raw.length; i++) {
          const cells = raw[i];
          if (!cells || cells.every((c) => c === "" || c == null)) continue;
          rows.push({ rowIndex: i + 1, cells: cells.map((c) => (c == null ? "" : String(c))) });
        }
      }
      sheets.push({ name: sheetName, headers, rows, structuralRows, courseCandidates });
    }
    return { fileName: filePath, sheets };
  }
}
