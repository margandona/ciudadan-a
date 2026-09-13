import { describe, expect, it } from "vitest";
import { QUESTION_TYPE, type QuizQuestion } from "@pclab/shared";
import { gradeAttempt, gradeQuestion, isQuizPassing, maxPoints, normalizeText, quizXpAward, validateGiven } from "./quiz-scoring";

const base = (over: Partial<QuizQuestion>): QuizQuestion => ({
  id: "q1",
  quizId: "quiz-1",
  type: QUESTION_TYPE.CHOICE,
  prompt: "¿?",
  options: ["a", "b", "c"],
  points: 2,
  order: 1,
  ...over,
});

describe("gradeQuestion", () => {
  it("choice: índice correcto", () => {
    const q = base({ type: QUESTION_TYPE.CHOICE, correctIndex: 1 });
    expect(gradeQuestion(q, 1).correct).toBe(true);
    expect(gradeQuestion(q, 0).correct).toBe(false);
    expect(gradeQuestion(q, 1).points).toBe(2);
  });

  it("truefalse", () => {
    const q = base({ type: QUESTION_TYPE.TRUE_FALSE, options: ["V", "F"], correctIndex: 1 });
    expect(gradeQuestion(q, 1).correct).toBe(true);
  });

  it("identify sobre imagen y con mapa usan la misma corrección que choice", () => {
    const qImg = base({ type: QUESTION_TYPE.IDENTIFY, imageUrl: "x.png", correctIndex: 2 });
    expect(gradeQuestion(qImg, 2).correct).toBe(true);
    const qMap = base({ type: QUESTION_TYPE.MAP, mapId: "m1", correctIndex: 0 });
    expect(gradeQuestion(qMap, 0).correct).toBe(true);
  });

  it("order: compara arreglo de ids", () => {
    const q = base({ type: QUESTION_TYPE.ORDER, options: ["A", "B", "C"], correctOrder: ["B", "A", "C"] });
    expect(gradeQuestion(q, ["B", "A", "C"]).correct).toBe(true);
    expect(gradeQuestion(q, ["A", "B", "C"]).correct).toBe(false);
  });

  it("match: compara pares", () => {
    const q = base({ type: QUESTION_TYPE.MATCH, options: ["1", "2", "X", "Y"], correctPairs: { "1": "X", "2": "Y" } });
    expect(gradeQuestion(q, { "1": "X", "2": "Y" }).correct).toBe(true);
    expect(gradeQuestion(q, { "1": "Y", "2": "X" }).correct).toBe(false);
  });

  it("fill: acepta variantes normalizadas (tildes/minúsculas)", () => {
    const q = base({ type: QUESTION_TYPE.FILL, correctText: ["participación ciudadana"] });
    expect(gradeQuestion(q, "Participación  Ciudadana").correct).toBe(true);
    expect(gradeQuestion(q, "otra cosa").correct).toBe(false);
  });

  it("short: corrige por palabras clave", () => {
    const q = base({ type: QUESTION_TYPE.SHORT, keywords: ["ciudadanía", "bien común"] });
    expect(gradeQuestion(q, "La ciudadanía se ejerce por el bien común").correct).toBe(true);
    expect(gradeQuestion(q, "no sé").correct).toBe(false);
  });
});

describe("gradeAttempt y maxPoints", () => {
  const questions: QuizQuestion[] = [
    base({ id: "q1", correctIndex: 0 }),
    base({ id: "q2", type: QUESTION_TYPE.TRUE_FALSE, options: ["V", "F"], correctIndex: 1, points: 3 }),
  ];

  it("corrige todas y cuenta las sin respuesta como incorrectas", () => {
    const results = gradeAttempt(questions, [{ qid: "q1", given: 0 }]);
    expect(results).toHaveLength(2);
    expect(results[0]!.correct).toBe(true);
    expect(results[1]!.correct).toBe(false);
    expect(results[1]!.given).toBeNull();
    expect(maxPoints(questions)).toBe(5);
  });
});

describe("validateGiven", () => {
  it("acepta la forma correcta según tipo", () => {
    expect(validateGiven(base({ correctIndex: 0 }), 0)).toBe(true);
    expect(validateGiven(base({ correctIndex: 0 }), "0")).toBe(false);
    expect(validateGiven(base({ type: QUESTION_TYPE.ORDER, correctOrder: [] }), ["a", "b"])).toBe(true);
    expect(validateGiven(base({ type: QUESTION_TYPE.FILL, correctText: ["x"] }), "texto")).toBe(true);
    expect(validateGiven(base({ type: QUESTION_TYPE.MATCH, correctPairs: {} }), { a: "b" })).toBe(true);
    expect(validateGiven(base({ type: QUESTION_TYPE.SHORT, keywords: ["x"] }), 42)).toBe(false);
  });
});

describe("normalizeText", () => {
  it("quita tildes, minúsculas y colapsa espacios", () => {
    expect(normalizeText("  CiUdAdan\u00EDa  Mu\u00F1iz  ")).toBe("ciudadania muniz");
  });
});

describe("isQuizPassing / quizXpAward", () => {
  it("considera aprobado desde el 60%", () => {
    expect(isQuizPassing({ score: 3, maxScore: 5 })).toBe(true);
    expect(isQuizPassing({ score: 2, maxScore: 5 })).toBe(false);
    expect(isQuizPassing({ score: 0, maxScore: 0 })).toBe(false);
  });

  it("otorga 25 XP solo la primera aprobaci\u00F3n", () => {
    expect(quizXpAward(null, { score: 3, maxScore: 5 })).toBe(25);
    expect(quizXpAward({ score: 2, maxScore: 5 }, { score: 3, maxScore: 5 })).toBe(25);
    expect(quizXpAward({ score: 4, maxScore: 5 }, { score: 5, maxScore: 5 })).toBe(0);
    expect(quizXpAward(null, { score: 1, maxScore: 5 })).toBe(0);
  });
});
