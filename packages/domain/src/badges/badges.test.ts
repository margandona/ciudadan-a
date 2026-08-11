import { describe, expect, it } from "vitest";
import type { Badge, PositiveMessage, StudentActivityStats } from "@pclab/shared";
import { badgeProgress, evaluateBadge, pickMessage, qualifyingBadges } from "./badges";

const stats: StudentActivityStats = {
  flippedCompleted: 7,
  quizzesPassed: 5,
  evidenceCount: 8,
  participationTotal: 12,
  participationBySkill: { argumentacion: 9, mediacion: 2 },
  exitTickets: 6,
};

const badge = (criteria: Badge["criteria"]): Badge => ({
  id: "b1",
  code: "X",
  name: "Medalla X",
  description: "",
  icon: "star",
  order: 1,
  level: 1,
  criteria,
});

describe("evaluateBadge", () => {
  it("cumple cuando todos los criterios se alcanzan", () => {
    expect(evaluateBadge(stats, badge([{ kind: "FLIPPED_COMPLETED", threshold: 6 }]))).toBe(true);
    expect(evaluateBadge(stats, badge([{ kind: "QUIZ_PASSED", threshold: 4 }, { kind: "EVIDENCE_SUBMITTED", threshold: 6 }]))).toBe(true);
  });

  it("no cumple si falta un criterio", () => {
    expect(evaluateBadge(stats, badge([{ kind: "QUIZ_PASSED", threshold: 10 }]))).toBe(false);
    expect(evaluateBadge(stats, badge([{ kind: "PARTICIPATION", threshold: 5, skill: "mediacion" }]))).toBe(false);
    expect(evaluateBadge(stats, badge([{ kind: "PARTICIPATION", threshold: 8, skill: "argumentacion" }]))).toBe(true);
    expect(evaluateBadge(stats, badge([{ kind: "EXIT_TICKETS", threshold: 8 }]))).toBe(false);
  });
});

describe("qualifyingBadges y badgeProgress", () => {
  it("filtra las que se cumplen y mide el progreso", () => {
    const badges = [
      badge([{ kind: "FLIPPED_COMPLETED", threshold: 6 }]),
      badge([{ kind: "QUIZ_PASSED", threshold: 10 }]),
    ];
    expect(qualifyingBadges(stats, badges)).toHaveLength(1);
    expect(badgeProgress(stats, badge([{ kind: "QUIZ_PASSED", threshold: 10 }, { kind: "EVIDENCE_SUBMITTED", threshold: 6 }]))).toBe(50);
  });
});

describe("pickMessage", () => {
  const messages: PositiveMessage[] = [
    { id: "1", context: "quiz", text: "Buen trabajo" },
    { id: "2", context: "flipped", text: "Lista para la misión" },
  ];

  it("elige del pool del contexto o devuelve null", () => {
    const text = pickMessage(messages, "quiz");
    expect(text).toBe("Buen trabajo");
    expect(pickMessage(messages, "noexiste")).toBeNull();
  });
});
