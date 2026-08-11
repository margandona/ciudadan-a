import { describe, expect, it } from "vitest";
import { DUPLICATE_KIND, ISSUE_LEVEL } from "@pclab/shared";
import { ExcelStudentParser, StudentColumnMapper } from "@pclab/infrastructure";
import type { StudentRepository } from "../ports";
import { PreviewStudentImportUseCase, resolveActiveFromEstado } from "./preview-student-import.use-case";
import { demoRosterD, demoRosterE, makeRosterBuffer } from "../test-fixtures";

class EmptyStudents implements StudentRepository {
  async findByCourse(): Promise<never[]> {
    return [];
  }
  async getById(): Promise<null> {
    return null;
  }
  async upsertMany(): Promise<{ createdIds: string[]; updatedIds: string[] }> {
    return { createdIds: [], updatedIds: [] };
  }
  async softDelete(): Promise<void> {
    return undefined;
  }
}

describe("resolveActiveFromEstado", () => {
  it("interpreta Matriculado/Retirado (con/sin tildes)", () => {
    expect(resolveActiveFromEstado("Matriculado")).toBe(true);
    expect(resolveActiveFromEstado("matriculada")).toBe(true);
    expect(resolveActiveFromEstado("Retirado")).toBe(false);
    expect(resolveActiveFromEstado(undefined)).toBeUndefined();
  });
});

describe("PreviewStudentImportUseCase", () => {
  const deps = {
    parser: new ExcelStudentParser(),
    columnDetector: new StudentColumnMapper(),
    students: new EmptyStudents(),
  };

  it("detecta curso, cuenta estudiantes y marca RUN como sensible (Curso D)", async () => {
    const useCase = new PreviewStudentImportUseCase(deps);
    const preview = await useCase.run(
      { fileName: "curso-d.xlsx", data: makeRosterBuffer("3º Medio D", demoRosterD()) },
      { uid: "teacher", role: "PROFESOR", courses: ["course-3med-d-2026"] },
    );

    expect(preview.summary.courseDetected).toBe("3º Medio D");
    expect(preview.summary.totalRows).toBe(4);
    expect(preview.summary.sensitiveFieldsDetected).toBe(1);
    expect(preview.summary.newStudents).toBe(4);
    expect(preview.summary.readyToImport).toBe(4);

    const row3 = preview.rows[2];
    expect(row3?.courseId).toBe("course-3med-d-2026");
    expect(row3?.displayName).toBe("Carolina Demo Tres");
    expect(row3?.active).toBe(true);

    // Retirado → active=false
    const row4 = preview.rows[3];
    expect(row4?.active).toBe(false);
  });

  it("no mezcla estudiantes entre cursos (Curso E independiente)", async () => {
    const useCase = new PreviewStudentImportUseCase(deps);
    const preview = await useCase.run(
      { fileName: "curso-e.xlsx", data: makeRosterBuffer("3º Medio E", demoRosterE()) },
      { uid: "teacher", role: "PROFESOR", courses: ["course-3med-e-2026"] },
    );

    expect(preview.summary.courseDetected).toBe("3º Medio E");
    expect(preview.summary.totalRows).toBe(2);
    for (const row of preview.rows) {
      expect(row.courseId).toBe("course-3med-e-2026");
    }
  });

  it("detecta duplicado dentro del archivo y lo clasifica", async () => {
    const rows = [...demoRosterD(), [5, "Ana Demo Uno", "77777777-7", "Matriculado"]];
    const useCase = new PreviewStudentImportUseCase(deps);
    const preview = await useCase.run(
      { fileName: "dup.xlsx", data: makeRosterBuffer("3º Medio D", rows) },
      { uid: "teacher", role: "PROFESOR", courses: ["course-3med-d-2026"] },
    );

    const dupRow = preview.rows.find((r) => r.rowIndex === 10);
    expect(dupRow?.duplicateKind).toBe(DUPLICATE_KIND.DUPLICATE_CONFIRMED);
    expect(preview.summary.duplicateConfirmed).toBe(1);
  });

  it("bloquea fila sin nombre", async () => {
    const rows: (string | number)[][] = [
      [1, "", "11111111-1", "Matriculado"],
      [2, "Ana Demo Uno", "22222222-2", "Matriculado"],
    ];
    const useCase = new PreviewStudentImportUseCase(deps);
    const preview = await useCase.run(
      { fileName: "sin-nombre.xlsx", data: makeRosterBuffer("3º Medio D", rows) },
      { uid: "teacher", role: "PROFESOR", courses: ["course-3med-d-2026"] },
    );
    expect(preview.summary.totalRows).toBe(1);
    expect(preview.issues.some((i) => i.code === "MISSING_NAME")).toBe(true);
  });

  it("marca advertencias de doble espacio sin corregir el nombre", async () => {
    const rows: (string | number)[][] = [[1, "ANA  DEMO UNO", "11111111-1", "Matriculado"]];
    const useCase = new PreviewStudentImportUseCase(deps);
    const preview = await useCase.run(
      { fileName: "spaces.xlsx", data: makeRosterBuffer("3º Medio D", rows) },
      { uid: "teacher", role: "PROFESOR", courses: ["course-3med-d-2026"] },
    );
    const row = preview.rows[0];
    expect(row?.originalName).toBe("ANA  DEMO UNO"); // no corregido
    expect(row?.issues.some((i) => i.code === "DOUBLE_SPACE")).toBe(true);
    expect(row?.issues.some((i) => i.level === ISSUE_LEVEL.WARNING)).toBe(true);
  });
});
