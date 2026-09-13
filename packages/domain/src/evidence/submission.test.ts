import { describe, expect, it } from "vitest";
import { SUBMISSION_STATUS, type Submission } from "@pclab/shared";
import { canStudentSubmit, canTransition, validateSubmissionContent } from "./submission";

const base = (over: Partial<Submission>): Submission => ({
  id: "s1",
  activityId: "act-1",
  studentId: "studA",
  classId: "class-01",
  courseId: "course-d",
  status: SUBMISSION_STATUS.ENTREGADO,
  content: {},
  attachments: [],
  attempts: 1,
  updatedAt: "2026-08-10T12:00:00.000Z",
  ...over,
});

describe("canTransition", () => {
  it("permite guardar feedback sin cambiar el estado", () => {
    expect(canTransition(SUBMISSION_STATUS.ENTREGADO, SUBMISSION_STATUS.ENTREGADO)).toBe(true);
  });

  it("permite transiciones del profesor", () => {
    expect(canTransition(SUBMISSION_STATUS.ENTREGADO, SUBMISSION_STATUS.REVISADO)).toBe(true);
    expect(canTransition(SUBMISSION_STATUS.ENTREGADO, SUBMISSION_STATUS.RETROALIMENTADO)).toBe(true);
    expect(canTransition(SUBMISSION_STATUS.ENTREGADO, SUBMISSION_STATUS.REQUIERE_CORRECCION)).toBe(true);
    expect(canTransition(SUBMISSION_STATUS.REQUIERE_CORRECCION, SUBMISSION_STATUS.ENTREGADO)).toBe(true);
    expect(canTransition(SUBMISSION_STATUS.PENDIENTE, SUBMISSION_STATUS.REVISADO)).toBe(false);
  });
});

describe("canStudentSubmit", () => {
  it("la estudiante puede entregar o re-entregar solo en ENTREGADO/REQUIERE_CORRECCION", () => {
    expect(canStudentSubmit(SUBMISSION_STATUS.ENTREGADO)).toBe(true);
    expect(canStudentSubmit(SUBMISSION_STATUS.REQUIERE_CORRECCION)).toBe(true);
    expect(canStudentSubmit(SUBMISSION_STATUS.RETROALIMENTADO)).toBe(false);
  });
});

describe("validateSubmissionContent", () => {
  it("rechaza evidencia vacía", () => {
    expect(() => validateSubmissionContent(base({ content: {}, attachments: [] }))).toThrow();
  });

  it("acepta texto o selección", () => {
    expect(() => validateSubmissionContent(base({ content: { text: "Mi respuesta" } }))).not.toThrow();
    expect(() => validateSubmissionContent(base({ content: { choice: 1 } }))).not.toThrow();
  });

  it("acepta adjuntos", () => {
    expect(() =>
      validateSubmissionContent(base({ content: {}, attachments: [{ type: "image", url: "https://x" }] })),
    ).not.toThrow();
  });

  it("rechaza más de 5 adjuntos", () => {
    const attachments = Array.from({ length: 6 }, (_, i) => ({ type: "file" as const, url: `https://x/${i}` }));
    expect(() => validateSubmissionContent(base({ content: { text: "x" }, attachments }))).toThrow();
  });
});
