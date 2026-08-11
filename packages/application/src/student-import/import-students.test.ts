import { describe, expect, it } from "vitest";
import type { AuditLog, Course, Student } from "@pclab/shared";
import type { AuditRepository, CourseRepository, StudentRepository } from "../ports";
import { ExcelStudentParser, StudentColumnMapper } from "@pclab/infrastructure";
import { PreviewStudentImportUseCase } from "./preview-student-import.use-case";
import { ImportStudentsUseCase } from "./import-students.use-case";
import { demoRosterD, demoRosterE, makeRosterBuffer } from "../test-fixtures";

class FakeStudents implements StudentRepository {
  byCourse = new Map<string, Student[]>();

  async findByCourse(courseId: string): Promise<Student[]> {
    return [...(this.byCourse.get(courseId) ?? [])];
  }

  async getById(id: string): Promise<Student | null> {
    for (const list of this.byCourse.values()) {
      const found = list.find((s) => s.id === id);
      if (found) return found;
    }
    return null;
  }

  async upsertMany(students: Student[]): Promise<{ createdIds: string[]; updatedIds: string[] }> {
    const createdIds: string[] = [];
    const updatedIds: string[] = [];
    for (const student of students) {
      const list = this.byCourse.get(student.courseId) ?? [];
      const idx = list.findIndex((s) => s.id === student.id);
      if (idx >= 0) {
        list[idx] = student;
        updatedIds.push(student.id);
      } else {
        list.push(student);
        createdIds.push(student.id);
      }
      this.byCourse.set(student.courseId, list);
    }
    return { createdIds, updatedIds };
  }

  async softDelete(courseId: string, studentIds: string[]): Promise<void> {
    const list = this.byCourse.get(courseId) ?? [];
    for (const s of list) {
      if (studentIds.includes(s.id)) s.active = false;
    }
  }
}

class FakeCourses implements CourseRepository {
  byId = new Map<string, Course>();

  async findById(id: string): Promise<Course | null> {
    return this.byId.get(id) ?? null;
  }

  async findBySectionYear(section: string, year: number): Promise<Course | null> {
    for (const c of this.byId.values()) {
      if (c.section === section && c.year === year) return c;
    }
    return null;
  }

  async upsert(course: Course): Promise<Course> {
    this.byId.set(course.id, course);
    return course;
  }
}

class FakeAudit implements AuditRepository {
  logs: AuditLog[] = [];
  async log(entry: AuditLog): Promise<void> {
    this.logs.push(entry);
  }
}

function makeEnv() {
  return {
    students: new FakeStudents(),
    courses: new FakeCourses(),
    audit: new FakeAudit(),
  };
}

async function buildRows(buffer: Uint8Array, fileName: string) {
  const preview = new PreviewStudentImportUseCase({
    parser: new ExcelStudentParser(),
    columnDetector: new StudentColumnMapper(),
    students: new FakeStudents(),
  });
  return preview.run({ fileName, data: buffer }, { uid: "t", role: "MASTER", courses: [] });
}

describe("ImportStudentsUseCase", () => {
  it("importa el curso D: crea curso y estudiantes, desactiva retiradas y audita", async () => {
    const env = makeEnv();
    const preview = await buildRows(makeRosterBuffer("3º Medio D", demoRosterD()), "d.xlsx");

    const useCase = new ImportStudentsUseCase(env);
    const result = await useCase.run({ rows: preview.rows, fileName: "d.xlsx" }, { uid: "t", role: "MASTER", courses: [] });

    expect(result.imported).toBe(3); // 3 activas
    expect(result.deactivated).toBe(1); // Daniela retirada
    expect(result.courseIds).toContain("course-3med-d-2026");
    await expect(env.courses.findById("course-3med-d-2026")).resolves.toMatchObject({ name: "3º Medio D" });

    const students = await env.students.findByCourse("course-3med-d-2026");
    expect(students).toHaveLength(4);
    expect(students.filter((s) => s.active)).toHaveLength(3);
    expect(students.some((s) => s.active === false && s.archivedAt)).toBe(true);

    expect(env.audit.logs).toHaveLength(1);
    expect(env.audit.logs[0]?.action).toBe("STUDENT_IMPORT");
    expect(env.audit.logs[0]?.metadata).not.toHaveProperty("fullNames");
  });

  it("es idempotente: una segunda importación actualiza, no duplica", async () => {
    const env = makeEnv();
    const buffer = makeRosterBuffer("3º Medio D", demoRosterD());
    const first = await buildRows(buffer, "d.xlsx");
    const useCase = new ImportStudentsUseCase(env);
    await useCase.run({ rows: first.rows, fileName: "d.xlsx" }, { uid: "t", role: "MASTER", courses: [] });

    const second = await buildRows(buffer, "d.xlsx");
    const result2 = await useCase.run({ rows: second.rows, fileName: "d.xlsx" }, { uid: "t", role: "MASTER", courses: [] });

    expect(result2.imported).toBe(0);
    expect(result2.updated).toBeGreaterThan(0);
    expect(await env.students.findByCourse("course-3med-d-2026")).toHaveLength(4);
  });

  it("no mezcla los dos cursos: las estudiantes de D no aparecen en E", async () => {
    const env = makeEnv();
    const useCase = new ImportStudentsUseCase(env);
    const previewD = await buildRows(makeRosterBuffer("3º Medio D", demoRosterD()), "d.xlsx");
    const previewE = await buildRows(makeRosterBuffer("3º Medio E", demoRosterE()), "e.xlsx");
    await useCase.run({ rows: previewD.rows }, { uid: "t", role: "MASTER", courses: [] });
    await useCase.run({ rows: previewE.rows }, { uid: "t", role: "MASTER", courses: [] });

    const d = await env.students.findByCourse("course-3med-d-2026");
    const e = await env.students.findByCourse("course-3med-e-2026");
    expect(d).toHaveLength(4);
    expect(e).toHaveLength(2);
    const dNames = new Set(d.map((s) => s.normalizedSearchName));
    for (const s of e) expect(dNames.has(s.normalizedSearchName)).toBe(false);
  });

  it("duplicado dentro del mismo lote se actualiza (no crea dos registros)", async () => {
    const env = makeEnv();
    const rows = [...demoRosterD(), [5, "Ana Demo Uno", "77777777-7", "Matriculado"]];
    const preview = await buildRows(makeRosterBuffer("3º Medio D", rows), "dup.xlsx");
    const useCase = new ImportStudentsUseCase(env);
    const result = await useCase.run({ rows: preview.rows }, { uid: "t", role: "MASTER", courses: [] });

    expect(result.imported).toBe(3);
    expect(await env.students.findByCourse("course-3med-d-2026")).toHaveLength(4);
  });

  it("omite posibles duplicados sin fusionar automáticamente", async () => {
    const env = makeEnv();
    // Pre-cargar una estudiante para forzar posible duplicado
    const first = await buildRows(makeRosterBuffer("3º Medio D", demoRosterD()), "d.xlsx");
    const useCase = new ImportStudentsUseCase(env);
    await useCase.run({ rows: first.rows }, { uid: "t", role: "MASTER", courses: [] });

    const trickyRows: (string | number)[][] = [[1, "Ana Karen Demo Uno", "88888888-8", "Matriculado"]];
    const preview2 = await buildRows(makeRosterBuffer("3º Medio D", trickyRows), "t.xlsx");
    const result2 = await useCase.run({ rows: preview2.rows }, { uid: "t", role: "MASTER", courses: [] });

    expect(result2.skippedDuplicates).toBe(1);
    expect(await env.students.findByCourse("course-3med-d-2026")).toHaveLength(4);
  });

  it("rechaza importar un curso al que el profesor no pertenece", async () => {
    const env = makeEnv();
    const preview = await buildRows(makeRosterBuffer("3º Medio D", demoRosterD()), "d.xlsx");
    const useCase = new ImportStudentsUseCase(env);
    await expect(
      useCase.run({ rows: preview.rows }, { uid: "t", role: "PROFESOR", courses: ["course-3med-e-2026"] }),
    ).rejects.toThrow();
  });

  it("permite al docente corregir el nombre en el preview sin tocar el original", async () => {
    const env = makeEnv();
    const preview = await buildRows(makeRosterBuffer("3º Medio D", demoRosterD()), "d.xlsx");
    preview.rows[0]!.editable.displayName = "Ana Renata Demo Uno";
    const useCase = new ImportStudentsUseCase(env);
    const result = await useCase.run({ rows: preview.rows }, { uid: "t", role: "MASTER", courses: [] });

    expect(result.imported).toBe(3);
    const list = await env.students.findByCourse("course-3med-d-2026");
    const ana = list.find((s) => s.displayName.includes("Renata"));
    expect(ana?.displayName).toBe("Ana Renata Demo Uno");
    expect(ana?.normalizedSearchName).toBe("ana renata demo uno");
  });
});
