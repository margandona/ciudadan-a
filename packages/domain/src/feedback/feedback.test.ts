import { describe, expect, it } from "vitest";
import type { Feedback } from "@pclab/shared";
import { aggregateFeedbackTendencies, buildAlerts, questionPerformance, validateFeedback } from "./feedback";
import type { ClassAnalytics } from "@pclab/shared";

const feedback = (over: Partial<Feedback>): Feedback => ({
  classId: "class-01",
  courseId: "course-d",
  studentId: "s1",
  anon: true,
  app: { easyToFind: 4, clear: 4, working: 5, open: "nada" },
  learning: { objective: 4, clarity: 5, helpful: 4, participated: 3, comfortable: 4, bestActivity: "dilemas", change: "", keep: "la votación" },
  submittedAt: "2026-08-10T12:00:00.000Z",
  ...over,
});

describe("validateFeedback", () => {
  it("acepta escalas 1..5", () => {
    expect(() => validateFeedback(feedback({}))).not.toThrow();
  });

  it("rechaza escalas fuera de rango", () => {
    expect(() => validateFeedback(feedback({ app: { easyToFind: 0, clear: 4, working: 5, open: "" } }))).toThrow();
    expect(() => validateFeedback(feedback({ learning: { objective: 6, clarity: 5, helpful: 4, participated: 3, comfortable: 4, bestActivity: "", change: "", keep: "" } }))).toThrow();
  });
});

describe("aggregateFeedbackTendencies", () => {
  it("agrega promedios por clase sin exponer identidad en los números", () => {
    const tendencies = aggregateFeedbackTendencies("course-d", [
      feedback({ anon: true }),
      feedback({ classId: "class-04", app: { easyToFind: 2, clear: 3, working: 3, open: "x" } }),
    ]);
    expect(tendencies.totalResponses).toBe(2);
    const c1 = tendencies.tendencies.find((t) => t.classId === "class-01")!;
    expect(c1.responses).toBe(1);
    expect(c1.avg.appEasy).toBe(4);
    expect(c1).not.toHaveProperty("studentIds");
  });

  it("conserva el flag anon en los comentarios abiertos", () => {
    const tendencies = aggregateFeedbackTendencies("course-d", [feedback({ anon: true }), feedback({ anon: false, studentId: "s2" })]);
    expect(tendencies.tendencies[0]!.openComments.map((c) => c.anon)).toEqual([true, false]);
  });
});

describe("questionPerformance", () => {
  it("calcula tasa de acierto por pregunta", () => {
    const result = questionPerformance(
      { id: "q", title: "Quiz" },
      [
        { answers: [{ qid: "p1", correct: true }, { qid: "p2", correct: false }] },
        { answers: [{ qid: "p1", correct: false }, { qid: "p2", correct: true }] },
      ],
    );
    const p1 = result.find((r) => r.questionId === "p1")!;
    expect(p1.correctRate).toBe(0.5);
    expect(p1.attempts).toBe(2);
  });
});

describe("buildAlerts", () => {
  it("genera alertas descriptivas (sin etiquetas)", () => {
    const cls: ClassAnalytics = {
      classId: "class-01",
      flippedPercent: 50,
      pendingEvidences: 3,
      exitTickets: 2,
      avgDifficulty: 4.2,
      participation: 5,
      avgQuizMinutes: null,
      lowPerformance: [{ quizId: "q", quizTitle: "Quiz", questionId: "p1", prompt: "p1", correctRate: 0.4, attempts: 10 }],
    };
    const alerts = buildAlerts([cls]);
    expect(alerts.some((a) => a.includes("3 evidencia(s) sin revisar"))).toBe(true);
    expect(alerts.some((a) => a.includes("Dificultad percibida alta"))).toBe(true);
    expect(alerts.some((a) => a.includes("menor rendimiento"))).toBe(true);
    expect(alerts.join(" ")).not.toMatch(/problem[áa]tica|bajo potencial|riesgo/i);
  });
});
