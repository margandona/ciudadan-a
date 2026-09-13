// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import type { FlippedBlock, FlippedProgress } from "@pclab/shared";
import FlippedLessonPlayer from "./FlippedLessonPlayer.vue";

const blocks: FlippedBlock[] = [
  { type: "title", id: "b-title", text: "Misión de prueba" },
  {
    type: "question",
    id: "b-q1",
    kind: "choice",
    prompt: "¿Qué es ser ciudadana?",
    options: ["Votar", "Participar por el bien común"],
    correctIndex: 1,
    explanation: "La ciudadanía se ejerce participando.",
  },
];

const progress = (over: Partial<FlippedProgress> = {}): FlippedProgress => ({
  classId: "class-01",
  studentId: "studA",
  courseId: "course-d",
  startedAt: null,
  completedAt: null,
  progressPercent: 0,
  blocksVisited: [],
  interactionSeconds: 0,
  quizAttempts: 0,
  quizScore: null,
  reflection: undefined,
  ready: false,
  updatedAt: "",
  ...over,
});

const lastEmitted = (wrapper: ReturnType<typeof mount>, event: string) => {
  const calls = wrapper.emitted(event);
  return calls ? calls[calls.length - 1]![0] : undefined;
};

describe("FlippedLessonPlayer", () => {
  it("avanza por bloques y registra visitas", async () => {
    const wrapper = mount(FlippedLessonPlayer, {
      props: { lessonBlocks: blocks, progress: progress() },
    });

    expect(wrapper.text()).toContain("Misión de prueba");
    await wrapper.find("button").trigger("click"); // Comenzar
    expect(lastEmitted(wrapper, "track")).toEqual(expect.objectContaining({ blockId: "b-title" }));

    expect(wrapper.text()).toContain("¿Qué es ser ciudadana?");
  });

  it("responde la pregunta con retroalimentación inmediata", async () => {
    const wrapper = mount(FlippedLessonPlayer, {
      props: { lessonBlocks: blocks, progress: progress() },
    });

    await wrapper.find("button").trigger("click"); // Comenzar (a la pregunta)
    const options = wrapper.findAll("button.option");
    await options[1]!.trigger("click");

    expect(lastEmitted(wrapper, "track")).toEqual(
      expect.objectContaining({ question: { blockId: "b-q1", correct: true, score: 1 } }),
    );
    expect(wrapper.text()).toContain("¡Correcto!");
  });

  it("muestra el botón listo al recorrer todo y emite markReady", async () => {
    const wrapper = mount(FlippedLessonPlayer, {
      props: {
        lessonBlocks: blocks,
        progress: progress({ blocksVisited: ["b-q1"], progressPercent: 100 }),
      },
    });

    await wrapper.find("button").trigger("click"); // Comenzar → último paso
    const ready = wrapper.find("button.btn-primary-big");
    expect(ready.exists()).toBe(true);
    expect(ready.text()).toContain("Estoy lista para la misión");
    await ready.trigger("click");
    expect(lastEmitted(wrapper, "track")).toEqual(expect.objectContaining({ markReady: true }));
  });
});
