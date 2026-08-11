// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import type { SlideDeck } from "@pclab/shared";
import DeckPlayer from "./DeckPlayer.vue";

const deck: SlideDeck = {
  classId: "class-01",
  courseId: "course-d",
  version: 1,
  config: {},
  updatedAt: "x",
  updatedBy: "t",
  slides: [
    { id: "s1", kind: "portada", title: "Portada", blocks: [{ id: "b1", type: "title", text: "Misión de prueba" }] },
    {
      id: "s2",
      kind: "pregunta",
      title: "Pregunta",
      blocks: [
        { id: "bq", type: "question", title: "Q", text: "¿Un like es participación?", options: ["Sí", "No"], correctIndex: 1, explanation: "x" },
      ],
    },
    { id: "s3", kind: "ticket", title: "Ticket", blocks: [{ id: "b3", type: "text", text: "Cierra la clase" }] },
  ],
};

const lastEmitted = (wrapper: ReturnType<typeof mount>, event: string) => {
  const calls = wrapper.emitted(event);
  return calls ? calls[calls.length - 1]![0] : undefined;
};

describe("DeckPlayer", () => {
  it("navega entre diapositivas con botones", async () => {
    const wrapper = mount(DeckPlayer, {
      props: { deck, isProjection: true, results: {} },
    });
    expect(wrapper.text()).toContain("Misión de prueba");
    await wrapper.findAll("button").find((b) => b.text() === "→")!.trigger("click");
    expect(wrapper.text()).toContain("¿Un like es participación?");
  });

  it("navega con teclado (flecha derecha)", async () => {
    const wrapper = mount(DeckPlayer, { props: { deck, isProjection: true, results: {} } });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    await nextTick();
    expect(wrapper.text()).toContain("¿Un like es participación?");
  });

  it("en modo estudiante emite voto al pulsar una opción", async () => {
    const wrapper = mount(DeckPlayer, { props: { deck, isProjection: false, results: {} } });
    await wrapper.findAll("button").find((b) => b.text() === "→")!.trigger("click");
    const voteButtons = wrapper.findAll("button").filter((b) => b.text() === "Votar");
    await voteButtons[1]!.trigger("click"); // opción "No" (índice 1)
    expect(lastEmitted(wrapper, "vote")).toEqual({ questionId: "bq", option: 1 });
  });

  it("en modo proyección permite guardar conteo manual", async () => {
    const wrapper = mount(DeckPlayer, { props: { deck, isProjection: true, results: {} } });
    await wrapper.findAll("button").find((b) => b.text() === "→")!.trigger("click");
    const inputs = wrapper.findAll('input[type="number"]');
    await inputs[0]!.setValue("8");
    await inputs[1]!.setValue("5");
    await wrapper.findAll("button").find((b) => b.text() === "Guardar conteo")!.trigger("click");
    expect(lastEmitted(wrapper, "manual")).toEqual({ questionId: "bq", counts: { "0": 8, "1": 5 } });
  });
});
