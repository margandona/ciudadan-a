import {
  MANDATORY_SLIDE_KINDS,
  SLIDE_BLOCK_TYPES,
  type Slide,
  type SlideBlock,
  type SlideDeck,
  type SlideKind,
} from "@pclab/shared";
import { ValidationError } from "../errors";

/** Valida que el deck respete la estructura pedagógica obligatoria. */
export function validateDeckStructure(slides: Slide[]): void {
  if (slides.length === 0) throw new ValidationError("La presentación no tiene diapositivas.");
  const kinds = slides.map((s) => s.kind);

  // Los kinds obligatorios deben aparecer en orden (primeros cinco + ticket al final).
  let pointer = 0;
  for (const kind of MANDATORY_SLIDE_KINDS) {
    const idx = kinds.indexOf(kind, pointer);
    if (idx === -1) throw new ValidationError(`Falta la diapositiva obligatoria: ${kind}.`);
    pointer = idx + 1;
  }
  // El ticket de salida debe cerrar la presentación.
  if (kinds[kinds.length - 1] !== "ticket") {
    throw new ValidationError("La presentación debe cerrar con el ticket de salida.");
  }
}

/** Sanitiza los bloques: conserva solo tipos y campos permitidos (sin HTML arbitrario). */
export function sanitizeSlideBlocks(blocks: SlideBlock[]): SlideBlock[] {
  return blocks
    .filter((b) => SLIDE_BLOCK_TYPES.includes(b.type))
    .map((b) => {
      const clean: SlideBlock = { id: b.id, type: b.type };
      if (typeof b.title === "string") clean.title = b.title.slice(0, 300);
      if (typeof b.text === "string") clean.text = b.text.slice(0, 4000);
      if (typeof b.url === "string") clean.url = b.url.slice(0, 2000);
      if (Array.isArray(b.options)) clean.options = b.options.map((o) => String(o).slice(0, 500)).slice(0, 10);
      if (typeof b.correctIndex === "number" && Number.isInteger(b.correctIndex)) clean.correctIndex = b.correctIndex;
      if (typeof b.explanation === "string") clean.explanation = b.explanation.slice(0, 1000);
      if (typeof b.hidden === "boolean") clean.hidden = b.hidden;
      if (typeof b.timerSeconds === "number") clean.timerSeconds = b.timerSeconds;
      if (typeof b.a === "string") clean.a = b.a.slice(0, 1000);
      if (typeof b.b === "string") clean.b = b.b.slice(0, 1000);
      if (typeof b.note === "string") clean.note = b.note.slice(0, 1000);
      return clean;
    });
}

/** Quita `correctIndex`/explicación para entregas a estudiantes (modo colectivo). */
export function stripAnswers(deck: SlideDeck): SlideDeck {
  return {
    ...deck,
    slides: deck.slides.map((slide) => ({
      ...slide,
      blocks: slide.blocks.map((b) => {
        if (b.type !== "question") return b;
        const rest = { ...b };
        delete rest.correctIndex;
        delete rest.explanation;
        return rest;
      }),
    })),
  };
}

export type { SlideKind };
