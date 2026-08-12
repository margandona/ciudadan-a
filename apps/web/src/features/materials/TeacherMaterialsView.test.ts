// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { Material } from "@pclab/shared";

vi.mock("@/services/importApi", () => ({
  listMaterialsForTeacher: vi.fn(),
  generateMaterial: vi.fn(),
  addMaterialVersion: vi.fn(),
  sendMaterialForReview: vi.fn(),
  duplicateMaterial: vi.fn(),
  archiveMaterial: vi.fn(),
  readyToPrintMaterial: vi.fn(),
  downloadMaterial: vi.fn(),
}));

import TeacherMaterialsView from "./TeacherMaterialsView.vue";
import { generateMaterial, listMaterialsForTeacher } from "@/services/importApi";
import { useSessionStore } from "@/stores/session";

const material: Material = {
  id: "mat-1",
  courseId: "course-d",
  type: "guia",
  title: "Guía 03",
  status: "BORRADOR",
  version: 1,
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
    vi.mocked(generateMaterial).mockReset();
  });

  it("lista materiales y genera una guía como borrador", async () => {
    vi.mocked(listMaterialsForTeacher).mockResolvedValue([material]);
    vi.mocked(generateMaterial).mockResolvedValue(material);
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain("Guía 03");
    expect(wrapper.text()).toContain("Borrador");

    await wrapper.find('input[placeholder="Título (p. ej. Guía 04 — Cartografía social)"]').setValue("Guía nueva");
    await wrapper.find("button.btn-primary").trigger("click");
    await flushPromises();

    expect(generateMaterial).toHaveBeenCalledWith(expect.objectContaining({ title: "Guía nueva", type: "GUIDE" }));
  });
});
