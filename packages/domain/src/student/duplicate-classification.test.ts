import { describe, expect, it } from "vitest";
import { DUPLICATE_KIND } from "@pclab/shared";
import { classifyDuplicate, markSeenInFile, studentMatchKey, type ExistingStudentRef } from "./duplicate-classification";

const existing: ExistingStudentRef[] = [
  { id: "s1", normalizedSearchName: "ana perez gonzalez", courseId: "course-3med-d-2026", active: true },
  { id: "s2", normalizedSearchName: "maria jose munoz diaz", courseId: "course-3med-d-2026", active: true },
  { id: "s3", normalizedSearchName: "ana perez gonzalez", courseId: "course-3med-e-2026", active: true },
];

describe("studentMatchKey", () => {
  it("combina curso y nombre normalizado", () => {
    expect(studentMatchKey("ana perez", "course-x")).toBe("course-x|ana perez");
  });
});

describe("classifyDuplicate", () => {
  it("NUEVA cuando no coincide en el curso", () => {
    const result = classifyDuplicate(
      { normalizedSearchName: "rosa valdes", courseId: "course-3med-d-2026" },
      existing,
      new Map(),
    );
    expect(result.kind).toBe(DUPLICATE_KIND.NEW);
  });

  it("DUPLICADO CONFIRMADO por nombre+curso exacto", () => {
    const result = classifyDuplicate(
      { normalizedSearchName: "ana perez gonzalez", courseId: "course-3med-d-2026" },
      existing,
      new Map(),
    );
    expect(result.kind).toBe(DUPLICATE_KIND.DUPLICATE_CONFIRMED);
  });

  it("no confunde cursos distintos (mismo nombre en otro curso = NUEVA)", () => {
    const result = classifyDuplicate(
      { normalizedSearchName: "ana perez gonzalez", courseId: "course-3med-d-2026" },
      existing,
      new Map(),
    );
    // existe en D y en E, pero comparamos solo D → ya existe en D
    expect(result.kind).toBe(DUPLICATE_KIND.DUPLICATE_CONFIRMED);

    // Mismo nombre en otro curso → NUEVA (no se mezclan cursos)
    const other = classifyDuplicate(
      { normalizedSearchName: "maria jose munoz diaz", courseId: "course-3med-e-2026" },
      existing,
      new Map(),
    );
    expect(other.kind).toBe(DUPLICATE_KIND.NEW);
  });

  it("POSIBLE duplicado por nombre + apellido compartido (sin fusión automática)", () => {
    const result = classifyDuplicate(
      { normalizedSearchName: "ana karen perez gonzalez", courseId: "course-3med-d-2026" },
      existing,
      new Map(),
    );
    expect(result.kind).toBe(DUPLICATE_KIND.POSSIBLE_DUPLICATE);
    expect(result.issues[0]?.code).toBe("POSSIBLE_DUPLICATE");
  });

  it("detecta duplicado dentro del mismo archivo", () => {
    const seen = new Map();
    markSeenInFile(seen, "rosa valdes", "course-3med-d-2026");
    markSeenInFile(seen, "rosa valdes", "course-3med-d-2026");
    const result = classifyDuplicate(
      { normalizedSearchName: "rosa valdes", courseId: "course-3med-d-2026" },
      existing,
      seen,
    );
    expect(result.kind).toBe(DUPLICATE_KIND.DUPLICATE_CONFIRMED);
    expect(result.issues[0]?.code).toBe("DUPLICATE_CONFIRMED");
  });
});
