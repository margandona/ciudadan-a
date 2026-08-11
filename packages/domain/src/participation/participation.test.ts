import { describe, expect, it } from "vitest";
import type { ParticipationLevel, ParticipationRecord, ParticipationSkill } from "@pclab/shared";
import { aggregateParticipation, averageDifficulty, validateParticipationEntry } from "./participation";

function record(studentId: string, skills: [string, number][]): ParticipationRecord {
  return {
    courseId: "course-d",
    classId: "class-01",
    studentId,
    records: skills.map(([skill, level]) => ({
      at: "2026-08-10T12:00:00.000Z",
      skill: skill as ParticipationSkill,
      level: level as ParticipationLevel,
      by: "teach",
    })),
    total: skills.length,
    updatedAt: "2026-08-10T12:00:00.000Z",
  };
}

describe("validateParticipationEntry", () => {
  it("acepta habilidad válida y nivel 0–3", () => {
    expect(() => validateParticipationEntry({ skill: "argumentacion", level: 3 })).not.toThrow();
    expect(() => validateParticipationEntry({ skill: "escucha", level: 0 })).not.toThrow();
  });

  it("rechaza habilidad inválida y nivel fuera de rango", () => {
    expect(() => validateParticipationEntry({ skill: "hack", level: 1 })).toThrow();
    expect(() => validateParticipationEntry({ skill: "escucha", level: 4 })).toThrow();
    expect(() => validateParticipationEntry({ skill: "escucha", level: 1.5 })).toThrow();
  });
});

describe("aggregateParticipation", () => {
  it("agrega por habilidad y cuenta estudiantes", () => {
    const records = [
      record("s1", [["argumentacion", 3], ["intervencionOral", 2]]),
      record("s2", [["argumentacion", 2]]),
    ];
    const overview = aggregateParticipation(records);
    expect(overview.studentCount).toBe(2);
    expect(overview.total).toBe(3);
    expect(overview.bySkill.argumentacion.count).toBe(2);
    expect(overview.bySkill.argumentacion.sum).toBe(5);
    expect(overview.bySkill.argumentacion.avg).toBe(2.5);
  });

  it("respeta la escala de habilidades completa", () => {
    const overview = aggregateParticipation([]);
    expect(Object.keys(overview.bySkill)).toHaveLength(10);
    expect(overview.total).toBe(0);
  });
});

describe("averageDifficulty", () => {
  it("promedia y devuelve null si vacío", () => {
    expect(averageDifficulty([2, 3, 4])).toBe(3);
    expect(averageDifficulty([])).toBeNull();
  });
});
