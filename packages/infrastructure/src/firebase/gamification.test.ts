import { describe, expect, it } from "vitest";
import { computeActivityXp, type ActivityXpDeps } from "./gamification";

/**
 * Verifica que el cálculo de XP use consultas POR ESTUDIANTE y produzca los
 * mismos `xpParts`/días que antes (regresión del refactor de costos).
 */
const deps = {
  classes: { listAll: async () => [{ id: "class-01" }, { id: "class-02" }] },
  studentBadges: { listForStudent: async () => [{ badgeId: "b1" }] },
  submissions: {
    findByStudent: async () => [{ courseId: "c1" }, { courseId: "c1" }, { courseId: "c2" }],
  },
  flipped: {
    get: async (classId: string) =>
      classId === "class-01" ? { courseId: "c1", ready: true, completedAt: "2026-09-01T00:00:00.000Z" } : null,
  },
  participation: {
    get: async (_courseId: string, classId: string) => (classId === "class-01" ? { total: 3 } : null),
  },
  exitTickets: {
    get: async (classId: string) =>
      classId === "class-01" ? { courseId: "c1", submittedAt: "2026-09-02T00:00:00.000Z" } : null,
  },
  quizzes: { listByClass: async (classId: string) => (classId === "class-01" ? [{ id: "q1" }] : []) },
  quizAttempts: {
    get: async (quizId: string) =>
      quizId === "q1" ? { status: "SUBMITTED", score: 3, maxScore: 5, submittedAt: "2026-09-03T00:00:00.000Z" } : null,
  },
} as unknown as ActivityXpDeps;

describe("computeActivityXp", () => {
  it("calcula XP con consultas por estudiante", async () => {
    const res = await computeActivityXp(deps, "c1", "s1");
    expect(res.xpParts).toEqual({
      flipped: 30,
      quizzes: 25,
      evidence: 20,
      participation: 6,
      tickets: 5,
      badges: 15,
    });
    expect(res.activityXp).toBe(101);
    expect(res.badgesEarned).toBe(1);
    expect(res.activityDays).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
  });

  it("ignora registros de otros cursos", async () => {
    const other = {
      ...deps,
      flipped: { get: async () => ({ courseId: "otro", ready: true, completedAt: "2026-09-01T00:00:00.000Z" }) },
      exitTickets: { get: async () => ({ courseId: "otro", submittedAt: "2026-09-02T00:00:00.000Z" }) },
    } as unknown as ActivityXpDeps;
    const res = await computeActivityXp(other, "c1", "s1");
    expect(res.xpParts.flipped).toBe(0);
    expect(res.xpParts.tickets).toBe(0);
  });
});
