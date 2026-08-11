import { describe, expect, it } from "vitest";
import type { FlippedBlock } from "@pclab/shared";
import {
  answerQuestion,
  completeReady,
  newProgress,
  recomputeProgress,
  requiredBlockIds,
  setReflection,
  visitBlock,
} from "./flipped";

const blocks: FlippedBlock[] = [
  { type: "title", id: "t", text: "Título" },
  { type: "text", id: "m1", markdown: "micro 1" },
  { type: "reading", id: "r1", title: "Lectura", text: "texto" },
  {
    type: "question",
    id: "q1",
    kind: "choice",
    prompt: "¿A?",
    options: ["a", "b"],
    correctIndex: 0,
  },
  { type: "reflection", id: "refl", prompt: "Reflexiona" },
];

const NOW = "2026-08-10T12:00:00.000Z";

describe("requiredBlockIds", () => {
  it("solo considera bloques interactivos (no título/objetivo)", () => {
    expect(requiredBlockIds(blocks)).toEqual(["m1", "r1", "q1", "refl"]);
  });
});

describe("progresión del aula invertida", () => {
  it("inicia con 0% y sin ready", () => {
    const p = newProgress("class-01", "s1", "course-x", NOW);
    expect(p.progressPercent).toBe(0);
    expect(p.ready).toBe(false);
    expect(p.completedAt).toBeNull();
  });

  it("marca bloques y recalcula porcentaje", () => {
    let p = newProgress("class-01", "s1", "course-x", NOW);
    const req = requiredBlockIds(blocks).length; // 4
    p = visitBlock(p, "m1", req, NOW);
    p = visitBlock(p, "r1", req, NOW);
    expect(p.progressPercent).toBe(50);
    expect(p.blocksVisited).toContain("m1");
    p = visitBlock(p, "m1", req, NOW); // idempotente
    expect(p.progressPercent).toBe(50);
  });

  it("responder una pregunta cuenta como visita e intento", () => {
    let p = newProgress("class-01", "s1", "course-x", NOW);
    const req = requiredBlockIds(blocks).length;
    p = answerQuestion(p, "q1", true, 1, req, NOW);
    expect(p.quizAttempts).toBe(1);
    expect(p.quizScore).toBe(1);
    expect(p.blocksVisited).toContain("q1");
    p = answerQuestion(p, "q1", false, 0, req, NOW);
    expect(p.quizAttempts).toBe(2);
    expect(p.quizScore).toBe(1); // conserva el mejor
  });

  it("guardar reflexión marca su bloque", () => {
    let p = newProgress("class-01", "s1", "course-x", NOW);
    const req = requiredBlockIds(blocks).length;
    p = setReflection(p, "refl", "Mi reflexión", req, NOW);
    expect(p.reflection).toBe("Mi reflexión");
    expect(p.blocksVisited).toContain("refl");
  });

  it("completa con ready y completedAt al recorrer todo", () => {
    let p = newProgress("class-01", "s1", "course-x", NOW);
    const req = requiredBlockIds(blocks).length;
    p = visitBlock(p, "m1", req, NOW);
    p = visitBlock(p, "r1", req, NOW);
    p = answerQuestion(p, "q1", true, 1, req, NOW);
    p = setReflection(p, "refl", "ok", req, NOW);
    p = completeReady(p, req, NOW);
    expect(p.ready).toBe(true);
    expect(p.completedAt).toBe(NOW);
    expect(p.progressPercent).toBe(100);
  });

  it("recomputeProgress no altera completedAt ya fijado", () => {
    let p = newProgress("class-01", "s1", "course-x", NOW);
    const req = requiredBlockIds(blocks).length;
    p = { ...p, blocksVisited: ["m1", "r1", "q1", "refl"], completedAt: "2026-08-09T10:00:00.000Z" };
    const updated = recomputeProgress(p, req, NOW);
    expect(updated.completedAt).toBe("2026-08-09T10:00:00.000Z");
  });
});
