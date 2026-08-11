// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { Material } from "@pclab/shared";

vi.mock("@/services/importApi", () => ({
  listMaterialsForTeacher: vi.fn(),
  createMaterial: vi.fn(),
  addMaterialVersion: vi.fn(),
  sendMaterialForReview: vi.fn(),
}));

import TeacherMaterialsView from "./TeacherMaterialsView.vue";
import { createMaterial, listMaterialsForTeacher } from "@/services/importApi";
import { useSessionStore } from "@/stores/session";

const material: Material = {
  id: "mat-1",
  courseId: "course-d",
  type: "guia",
  title: "Guía 03",
  status: "BORRADOR",
  hasDUA: true,
  sentAt: null,
  reviewAt: null,
  updatedAt: new Date().toISOString(),
};

function mountView() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useSessionStore();
  store.$patch({ role: "PROFESOR", courses: ["course-d"] });
  return mount(TeacherMaterialsView, { global: { plugins: [pinia] } });
}

describe("TeacherMaterialsView", () => {
  beforeEach(() => {
    vi.mocked(listMaterialsForTeacher).mockReset();
    vi.mocked(createMaterial).mockReset();
  });

  it("lista materiales y crea uno nuevo", async () => {
    vi.mocked(listMaterialsForTeacher).mockResolvedValue([material]);
    vi.mocked(createMaterial).mockResolvedValue(material);
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain("Guía 03");
    expect(wrapper.text()).toContain("Borrador");

    await wrapper.find('input[placeholder="Título"]').setValue("Guía nueva");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(createMaterial).toHaveBeenCalledWith(expect.objectContaining({ title: "Guía nueva", type: "guia", hasDUA: false }));
  });
});
