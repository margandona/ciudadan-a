import { describe, expect, it } from "vitest";
import { createCourse } from "./course";
import { createStudent } from "../student/student";

describe("createCourse", () => {
  it("crea un curso válido con defaults", () => {
    const course = createCourse({ name: "3º Medio D", section: "D", year: 2026 });
    expect(course.subject).toBe("Educación Ciudadana");
    expect(course.level).toBe("Tercero Medio");
    expect(course.active).toBe(true);
  });

  it("rechaza nombre vacío", () => {
    expect(() => createCourse({ name: "  ", section: "D", year: 2026 })).toThrow();
  });

  it("rechaza sección vacía", () => {
    expect(() => createCourse({ name: "3º Medio D", section: "", year: 2026 })).toThrow();
  });

  it("rechaza año inválido", () => {
    expect(() => createCourse({ name: "3º Medio D", section: "D", year: 1999 })).toThrow();
  });
});

describe("createStudent", () => {
  it("crea la entidad normalizando el nombre de búsqueda", () => {
    const s = createStudent({ displayName: "María José Muñoz Díaz", courseId: "course-x", id: "abc" });
    expect(s.normalizedSearchName).toBe("maria jose munoz diaz");
    expect(s.active).toBe(true);
    expect(s.archivedAt).toBeNull();
    expect(s.academicProfile.participationTrackingEnabled).toBe(true);
    expect(s.createdAt).toBeTruthy();
  });

  it("rechaza nombre vacío", () => {
    expect(() => createStudent({ displayName: "", courseId: "course-x" })).toThrow();
  });

  it("rechaza sin curso", () => {
    expect(() => createStudent({ displayName: "Ana", courseId: "" })).toThrow();
  });

  it("rechaza nombres demasiado largos", () => {
    expect(() => createStudent({ displayName: "X".repeat(300), courseId: "course-x" })).toThrow();
  });
});
