import { describe, expect, it } from "vitest";
import type { ProjectAssessment, ProjectFields, Rubric } from "@pclab/shared";
import { assessmentPercent, rubricTotalPoints, validateAssessment, validateProjectFields, validateTeamMembership } from "./project";

const fields: ProjectFields = {
  problem: "Basura en el canal",
  evidence: "Fotos y datos",
  territory: "Sector norte de Ovalle",
  affectedPopulation: "Vecinas del sector",
  citizenParticipation: "Jornadas comunitarias",
  publicAgency: "Municipio",
  privateActor: "Empresa de reciclaje",
  resources: "Contenedores",
  socialImpact: "Mejor calidad de vida",
  environmentalImpact: "Menos basura en el agua",
  proposal: "Puntos de reciclaje con comunidad",
};

const rubric: Rubric = {
  id: "r1",
  title: "Proyecto",
  criteria: [
    { id: "a", name: "Problema", maxPoints: 4, descriptor: "" },
    { id: "b", name: "Propuesta", maxPoints: 4, descriptor: "" },
  ],
};

describe("validateProjectFields", () => {
  it("acepta los 11 campos completos", () => {
    expect(() => validateProjectFields(fields)).not.toThrow();
  });

  it("rechaza campos vacíos", () => {
    expect(() => validateProjectFields({ ...fields, proposal: "" })).toThrow(/Propuesta/);
  });
});

describe("rubricTotalPoints y validateAssessment", () => {
  it("suma máximos y valida puntajes", () => {
    expect(rubricTotalPoints(rubric)).toBe(8);
    const assessment: ProjectAssessment = {
      projectId: "p1", teamId: "t1", courseId: "c", kind: "teacher", by: "x", scores: { a: 4, b: 3 }, at: "x",
    };
    expect(validateAssessment(rubric, assessment)).toBe(7);
  });

  it("rechaza puntajes fuera del máximo", () => {
    const bad: ProjectAssessment = {
      projectId: "p1", teamId: "t1", courseId: "c", kind: "teacher", by: "x", scores: { a: 9, b: 3 }, at: "x",
    };
    expect(() => validateAssessment(rubric, bad)).toThrow();
  });
});

describe("assessmentPercent", () => {
  it("calcula porcentaje", () => {
    expect(assessmentPercent(6, 8)).toBe(75);
    expect(assessmentPercent(0, 8)).toBe(0);
  });
});

describe("validateTeamMembership", () => {
  it("rechaza integrantes repetidas o en otro equipo", () => {
    expect(() => validateTeamMembership(["s1", "s1"], [])).toThrow(/repetidas/);
    expect(() => validateTeamMembership(["s1"], [{ id: "t1", members: ["s1"] }])).toThrow(/otro equipo/);
    expect(() => validateTeamMembership(["s2"], [{ id: "t1", members: ["s1"] }], undefined)).not.toThrow();
  });
});
