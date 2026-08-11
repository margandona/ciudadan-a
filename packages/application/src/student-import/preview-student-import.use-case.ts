import {
  DUPLICATE_KIND,
  IMPORT_ISSUE_CODE,
  ISSUE_LEVEL,
  ROLES,
  type CandidateStudent,
  type ColumnMapping,
  type DuplicateKind,
  type ImportIssue,
  type ImportPreview,
  type ImportSummary,
  type ParsedSheet,
  type ParsedWorkbook,
} from "@pclab/shared";
import {
  classifyDuplicate,
  markSeenInFile,
  suggestNameParts,
  validateRawName,
  type ExistingStudentRef,
} from "@pclab/domain";
import { assertRole } from "../auth";
import { deriveCourseId, parseCourseName } from "../courses";
import type { AuthContext, ColumnDetector, SpreadsheetParser, StudentRepository } from "../ports";

export interface PreviewInput {
  fileName: string;
  data: Uint8Array;
  /** Año académico (por defecto 2026). */
  year?: number;
}

const DEFAULT_YEAR = 2026;

/** Interpreta el estado "Matriculado/Retirado" de la nómina. */
export function resolveActiveFromEstado(estado: string | undefined): boolean | undefined {
  if (!estado) return undefined;
  const v = estado
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[º°]/g, "o")
    .trim();
  if (["matriculado", "matriculada", "activo", "activa", "vigente"].includes(v)) return true;
  if (["retirado", "retirada", "inactivo", "inactiva"].includes(v)) return false;
  return undefined;
}

export class PreviewStudentImportUseCase {
  constructor(
    private deps: {
      parser: SpreadsheetParser;
      columnDetector: ColumnDetector;
      students: StudentRepository;
    },
  ) {}

  async run(input: PreviewInput, actor: AuthContext | null): Promise<ImportPreview> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);

    const year = input.year ?? DEFAULT_YEAR;
    const workbook: ParsedWorkbook = await this.deps.parser.parse(input.data);

    if (workbook.sheets.length === 0) {
      throw new Error("El archivo no contiene hojas válidas.");
    }

    const rows: CandidateStudent[] = [];
    const issues: ImportIssue[] = [];
    const inFileSeen = new Map<string, DuplicateKind>();
    let courseNotDetermined = false;
    let detectedCourseName: string | null = null;

    for (const sheet of workbook.sheets) {
      const mapping: ColumnMapping = this.deps.columnDetector.detect(sheet);

      // Columnas sensibles detectadas (p. ej. RUN) → no se importan.
      for (const det of mapping.detections) {
        if (det.sensitive) {
          issues.push({
            code: IMPORT_ISSUE_CODE.SENSITIVE_FIELD_DETECTED,
            level: ISSUE_LEVEL.INFO,
            message: `El archivo contiene la columna "${det.header}" con información potencialmente sensible; no se importará.`,
          });
        }
      }

      const courseName = this.resolveCourseName(sheet, mapping, year);
      if (!courseName) courseNotDetermined = true;
      else detectedCourseName = detectedCourseName ?? courseName.displayName;

      let existing: ExistingStudentRef[] = [];
      if (courseName) {
        existing = (await this.deps.students.findByCourse(courseName.courseId)).map((s) => ({
          id: s.id,
          normalizedSearchName: s.normalizedSearchName,
          courseId: s.courseId,
          active: s.active,
        }));
      }

      for (const row of sheet.rows) {
        const nameRaw = this.extractName(row.cells, mapping);
        if (!nameRaw) {
          issues.push({
            code: IMPORT_ISSUE_CODE.MISSING_NAME,
            level: ISSUE_LEVEL.BLOCKER,
            rowIndex: row.rowIndex,
            message: "Fila sin nombre de estudiante.",
          });
          continue;
        }

        const rowIssues = validateRawName(nameRaw).map((i) => ({ ...i, rowIndex: row.rowIndex }));
        if (!courseName) {
          rowIssues.push({
            code: IMPORT_ISSUE_CODE.COURSE_NOT_DETERMINED,
            level: ISSUE_LEVEL.BLOCKER,
            rowIndex: row.rowIndex,
            message: "No se pudo determinar el curso desde el archivo.",
          });
        }

        const parts = suggestNameParts(nameRaw);
        const normalizedSearchName = nameRaw
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();

        const activeFromEstado = resolveActiveFromEstado(this.getCell(row.cells, mapping.columns.estado));
        const active = activeFromEstado ?? true;

        const listNumberRaw = this.getCell(row.cells, mapping.columns.id);
        const listNumber =
          listNumberRaw && /^\d+$/.test(listNumberRaw.trim()) ? Number(listNumberRaw.trim()) : undefined;

        let duplicateKind: DuplicateKind = DUPLICATE_KIND.NEW;
        if (courseName) {
          // Marcar primero para que los duplicados del mismo archivo se detecten.
          markSeenInFile(inFileSeen, normalizedSearchName, courseName.courseId);
          const result = classifyDuplicate(
            {
              normalizedSearchName,
              firstName: parts.firstName,
              paternalSurname: parts.paternalSurname,
              courseId: courseName.courseId,
            },
            existing,
            inFileSeen,
          );
          duplicateKind = result.kind;
          rowIssues.push(...result.issues.map((i) => ({ ...i, rowIndex: row.rowIndex })));
        }

        const displayName = nameRaw.replace(/\s+/g, " ").trim();
        rows.push({
          rowIndex: row.rowIndex,
          originalName: nameRaw,
          displayName,
          normalizedSearchName,
          firstName: parts.firstName,
          middleName: parts.middleName,
          paternalSurname: parts.paternalSurname,
          maternalSurname: parts.maternalSurname,
          courseId: courseName?.courseId ?? "",
          courseName: courseName?.displayName ?? "",
          listNumber,
          active,
          duplicateKind,
          issues: rowIssues,
          editable: {
            displayName,
            active,
          },
        });
      }
    }

    const summary: ImportSummary = {
      fileName: input.fileName,
      courseDetected: detectedCourseName,
      courseNotDetermined,
      totalRows: rows.length,
      newStudents: rows.filter((r) => r.duplicateKind === DUPLICATE_KIND.NEW).length,
      duplicateConfirmed: rows.filter((r) => r.duplicateKind === DUPLICATE_KIND.DUPLICATE_CONFIRMED).length,
      possibleDuplicate: rows.filter((r) => r.duplicateKind === DUPLICATE_KIND.POSSIBLE_DUPLICATE).length,
      withWarnings: rows.filter((r) => r.issues.some((i) => i.level === ISSUE_LEVEL.WARNING)).length,
      blocked: rows.filter((r) => r.issues.some((i) => i.level === ISSUE_LEVEL.BLOCKER)).length,
      readyToImport: rows.filter(
        (r) => r.duplicateKind === DUPLICATE_KIND.NEW && !r.issues.some((i) => i.level === ISSUE_LEVEL.BLOCKER),
      ).length,
      sensitiveFieldsDetected: issues.filter((i) => i.code === IMPORT_ISSUE_CODE.SENSITIVE_FIELD_DETECTED).length,
    };

    return { summary, rows, issues };
  }

  private resolveCourseName(
    sheet: ParsedSheet,
    mapping: ColumnMapping,
    year: number,
  ): { section: string; displayName: string; courseId: string } | null {
    let raw = sheet.courseCandidates[0] ?? null;
    if (!raw && mapping.columns.course !== undefined && sheet.rows[0]) {
      raw = sheet.rows[0].cells[mapping.columns.course] ?? null;
    }
    const parsed = parseCourseName(raw);
    if (!parsed) return null;
    return {
      section: parsed.section,
      displayName: parsed.displayName,
      courseId: deriveCourseId(parsed.section, year),
    };
  }

  private extractName(cells: string[], mapping: ColumnMapping): string {
    if (mapping.columns.fullName !== undefined) {
      const v = cells[mapping.columns.fullName];
      if (v && String(v).trim()) return String(v).trim();
    }
    if (mapping.columns.surnames !== undefined) {
      const v = cells[mapping.columns.surnames];
      if (v && String(v).trim()) return String(v).trim();
    }
    return "";
  }

  private getCell(cells: string[], index: number | undefined): string | undefined {
    if (index === undefined) return undefined;
    const v = cells[index];
    return v !== undefined ? String(v).trim() : undefined;
  }
}
