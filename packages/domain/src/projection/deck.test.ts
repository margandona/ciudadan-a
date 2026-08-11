import { describe, expect, it } from "vitest";
import type { Slide, SlideBlock, SlideDeck } from "@pclab/shared";
import { sanitizeSlideBlocks, stripAnswers, validateDeckStructure } from "./deck";

const block = (over: Partial<SlideBlock>): SlideBlock => ({ id: "b1", type: "text", text: "x", ...over });

const slide = (id: string, kind: Slide["kind"], blocks: SlideBlock[]): Slide => ({ id, kind, blocks });

const MANDATORY: Slide["kind"][] = ["portada", "aprendizaje", "objetivo", "ruta", "activacion"];

describe("validateDeckStructure", () => {
  it("acepta la estructura obligatoria completa", () => {
    const slides = [
      ...MANDATORY.map((k, i) => slide(`s${i}`, k, [block({})])),
      slide("contenido", "contenido", [block({})]),
      slide("ticket", "ticket", [block({})]),
    ];
    expect(() => validateDeckStructure(slides)).not.toThrow();
  });

  it("rechaza si falta una diapositiva obligatoria", () => {
    const slides = [
      slide("portada", "portada", [block({})]),
      slide("objetivo", "objetivo", [block({})]),
      slide("ticket", "ticket", [block({})]),
    ];
    expect(() => validateDeckStructure(slides)).toThrow(/obligatoria/);
  });

  it("rechaza si no cierra con ticket de salida", () => {
    const slides = [
      ...MANDATORY.map((k, i) => slide(`s${i}`, k, [block({})])),
      slide("sintesis", "sintesis", [block({})]),
    ];
    expect(() => validateDeckStructure(slides)).toThrow(/ticket/);
  });
});

describe("sanitizeSlideBlocks", () => {
  it("descarta tipos no permitidos y campos desconocidos", () => {
    const cleaned = sanitizeSlideBlocks([
      block({ type: "text", text: "ok" }),
      { id: "b2", type: "script" as never, payload: "<script>" } as never,
    ]);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0]).not.toHaveProperty("payload");
  });

  it("recorta textos largos", () => {
    const cleaned = sanitizeSlideBlocks([block({ type: "text", text: "x".repeat(5000) })]);
    expect(cleaned[0]!.text!.length).toBeLessThanOrEqual(4000);
  });
});

describe("stripAnswers", () => {
  const deck: SlideDeck = {
    classId: "class-01",
    courseId: "course-d",
    version: 1,
    config: {},
    updatedAt: "x",
    updatedBy: "t",
    slides: [
      slide("s1", "pregunta", [
        block({ type: "question", title: "Q", text: "¿?", options: ["a", "b"], correctIndex: 0, explanation: "ex" }),
      ]),
    ],
  };

  it("elimina correctIndex y explanation de las preguntas para estudiantes", () => {
    const stripped = stripAnswers(deck);
    const question = stripped.slides[0]!.blocks[0]!;
    expect(question).not.toHaveProperty("correctIndex");
    expect(question).not.toHaveProperty("explanation");
    expect(question).toHaveProperty("options");
  });
});
