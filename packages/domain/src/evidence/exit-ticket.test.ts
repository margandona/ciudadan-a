import { describe, expect, it } from "vitest";
import type { ExitTicket } from "@pclab/shared";
import { validateExitTicket } from "./exit-ticket";

const base: ExitTicket = {
  classId: "class-01",
  courseId: "course-d",
  studentId: "studA",
  answers: {
    learned: "Aprendí participación",
    evidence: "La lectura",
    concept: "Ciudadanía",
    question: "¿Qué es el bien común?",
    relationOvalle: "Se relaciona con la plaza de mi barrio",
  },
  difficulty: 3,
  submittedAt: "2026-08-10T12:00:00.000Z",
};

describe("validateExitTicket", () => {
  it("acepta un ticket completo", () => {
    expect(() => validateExitTicket(base)).not.toThrow();
  });

  it("rechaza respuestas vacías", () => {
    const bad = { ...base, answers: { ...base.answers, learned: "" } };
    expect(() => validateExitTicket(bad)).toThrow();
  });

  it("rechaza dificultad fuera de 1..5", () => {
    expect(() => validateExitTicket({ ...base, difficulty: 0 })).toThrow();
    expect(() => validateExitTicket({ ...base, difficulty: 6 })).toThrow();
  });
});
