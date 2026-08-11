// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { Feedback } from "@pclab/shared";

vi.mock("@/services/importApi", () => ({
  submitFeedback: vi.fn(),
}));

import FeedbackView from "./FeedbackView.vue";
import { submitFeedback } from "@/services/importApi";
import { useSessionStore } from "@/stores/session";

function mountView() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useSessionStore();
  store.$patch({ role: "ESTUDIANTE", courseId: "course-d", studentId: "s1" });
  return mount(FeedbackView, { props: { classId: "class-01" }, global: { plugins: [pinia], stubs: { RouterLink: true } } });
}

const saved: Feedback = {
  classId: "class-01",
  courseId: "course-d",
  studentId: "s1",
  anon: true,
  app: { easyToFind: 3, clear: 3, working: 3, open: "" },
  learning: { objective: 3, clarity: 3, helpful: 3, participated: 3, comfortable: 3, bestActivity: "", change: "", keep: "" },
  submittedAt: new Date().toISOString(),
};

describe("FeedbackView", () => {
  beforeEach(() => vi.mocked(submitFeedback).mockReset());

  it("envía el feedback con anonimato por defecto", async () => {
    vi.mocked(submitFeedback).mockResolvedValue(saved);
    const wrapper = mountView();
    await flushPromises();

    await wrapper.find("#app-open").setValue("Todo bien");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(submitFeedback).toHaveBeenCalledWith({
      classId: "class-01",
      courseId: "course-d",
      anon: true,
      app: expect.objectContaining({ open: "Todo bien" }),
      learning: expect.any(Object),
    });
    expect(wrapper.text()).toContain("¡Gracias por tu feedback!");
  });
});
