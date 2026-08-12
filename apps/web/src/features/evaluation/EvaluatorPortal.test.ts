// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { Material, MaterialDetail } from "@pclab/shared";

vi.mock("@/services/importApi", () => ({
  listPendingMaterials: vi.fn(),
  getMaterialDetail: vi.fn(),
  approveMaterial: vi.fn(),
  downloadMaterial: vi.fn(),
  archiveMaterial: vi.fn(),
  correctMaterial: vi.fn(),
  readyToPrintMaterial: vi.fn(),
  resubmitMaterial: vi.fn(),
  resolveComment: vi.fn(),
}));

import EvaluatorPortal from "./EvaluatorPortal.vue";
import { getMaterialDetail, listPendingMaterials } from "@/services/importApi";
import { useSessionStore } from "@/stores/session";

const material: Material = {
  id: "mat-1",
  courseId: "course-d",
  type: "evaluacion",
  title: "Evaluación Cabildo",
  status: "EN_REVISION",
  version: 1,
  hasDUA: true,
  evaluatorId: "e1",
  sentAt: new Date().toISOString(),
  reviewAt: null,
  updatedAt: new Date().toISOString(),
};

const detail: MaterialDetail = {
  material,
  versions: [
    { id: "v1", materialId: "mat-1", version: 1, kind: "GENERAL", fileName: "eval.pdf", uploadedAt: new Date().toISOString(), by: "t" },
    { id: "v2", materialId: "mat-1", version: 2, kind: "DUA", fileName: "eval-dua.pdf", uploadedAt: new Date().toISOString(), by: "t" },
  ],
  comments: [],
  approvals: [],
  request: null,
};

describe("EvaluatorPortal", () => {
  beforeEach(() => {
    vi.mocked(listPendingMaterials).mockReset();
    vi.mocked(getMaterialDetail).mockReset();
  });

  it("lista solo el material asignado y abre el detalle sin datos de estudiantes", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useSessionStore();
    store.$patch({ role: "EVALUADOR", courses: ["course-d"] });
    vi.mocked(listPendingMaterials).mockResolvedValue([material]);
    vi.mocked(getMaterialDetail).mockResolvedValue(detail);

    const wrapper = mount(EvaluatorPortal, { global: { plugins: [pinia] } });
    await flushPromises();

    expect(wrapper.text()).toContain("Evaluación Cabildo");
    await wrapper.find("button.item").trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Historial de versiones");
    expect(wrapper.text()).not.toContain("Ana Demo");
  });
});
