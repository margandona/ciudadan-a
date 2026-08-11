// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import type { Material, MaterialDetail } from "@pclab/shared";

vi.mock("@/services/importApi", () => ({
  listMaterialsForEvaluator: vi.fn(),
  getMaterialDetail: vi.fn(),
  reviewMaterial: vi.fn(),
}));

import EvaluatorPortal from "./EvaluatorPortal.vue";
import { getMaterialDetail, listMaterialsForEvaluator, reviewMaterial } from "@/services/importApi";

const material: Material = {
  id: "mat-1",
  courseId: "course-d",
  type: "evaluacion",
  title: "Evaluación Cabildo",
  status: "EN_REVISION",
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
  request: null,
};

describe("EvaluatorPortal", () => {
  beforeEach(() => {
    vi.mocked(listMaterialsForEvaluator).mockReset();
    vi.mocked(getMaterialDetail).mockReset();
    vi.mocked(reviewMaterial).mockReset();
  });

  it("lista material asignado y muestra versiones GENERAL y DUA sin datos de estudiantes", async () => {
    vi.mocked(listMaterialsForEvaluator).mockResolvedValue([material]);
    vi.mocked(getMaterialDetail).mockResolvedValue(detail);

    const wrapper = mount(EvaluatorPortal);
    await flushPromises();

    expect(wrapper.text()).toContain("Evaluación Cabildo");
    await wrapper.find("button.item").trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("eval.pdf");
    expect(wrapper.text()).toContain("eval-dua.pdf");
    expect(wrapper.text()).not.toContain("Ana Demo");
  });

  it("registra la revisión con comentario", async () => {
    vi.mocked(listMaterialsForEvaluator).mockResolvedValue([material]);
    vi.mocked(getMaterialDetail).mockResolvedValue(detail);
    vi.mocked(reviewMaterial).mockResolvedValue({ ...detail, material: { ...material, status: "APROBADO" } });

    const wrapper = mount(EvaluatorPortal);
    await flushPromises();
    await wrapper.find("button.item").trigger("click");
    await flushPromises();

    await wrapper.find("textarea").setValue("Aprobada");
    await wrapper.find("button.btn-primary").trigger("click");
    await flushPromises();

    expect(reviewMaterial).toHaveBeenCalledWith({ materialId: "mat-1", courseId: "course-d", status: "APROBADO", comment: "Aprobada" });
  });
});
