// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { Project, ProjectFields, ProjectTeam } from "@pclab/shared";

vi.mock("@/services/importApi", () => ({
  listTeams: vi.fn(),
  getProjectForTeam: vi.fn(),
  saveProject: vi.fn(),
}));

import ProjectWizard from "./ProjectWizard.vue";
import { getProjectForTeam, listTeams, saveProject } from "@/services/importApi";
import { useSessionStore } from "@/stores/session";

const team: ProjectTeam = { id: "t1", courseId: "course-d", name: "Equipo Ovalle", members: ["s1"], createdAt: "x", updatedAt: "x" };
const emptyFields = (): ProjectFields => ({
  problem: "", evidence: "", territory: "", affectedPopulation: "", citizenParticipation: "",
  publicAgency: "", privateActor: "", resources: "", socialImpact: "", environmentalImpact: "", proposal: "",
});
const savedProject: Project = {
  id: "p1", classId: "class-11", courseId: "course-d", teamId: "t1", fields: emptyFields(), status: "EN_PROGRESO", attachments: [], submittedAt: null, updatedAt: "x",
};

function mountView() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useSessionStore();
  store.$patch({ role: "ESTUDIANTE", courseId: "course-d", studentId: "s1" });
  return mount(ProjectWizard, { props: { classId: "class-11" }, global: { plugins: [pinia], stubs: { RouterLink: true } } });
}

describe("ProjectWizard", () => {
  beforeEach(() => {
    vi.mocked(listTeams).mockReset();
    vi.mocked(getProjectForTeam).mockReset();
    vi.mocked(saveProject).mockReset();
  });

  it("muestra los 11 campos y guarda el proyecto del equipo", async () => {
    vi.mocked(listTeams).mockResolvedValue([team]);
    vi.mocked(getProjectForTeam).mockResolvedValue(null);
    vi.mocked(saveProject).mockResolvedValue({ ...savedProject, fields: { ...emptyFields(), proposal: "Puntos de reciclaje" } });

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain("Problema");
    expect(wrapper.text()).toContain("Propuesta");

    await wrapper.find("#f-proposal").setValue("Puntos de reciclaje");
    await wrapper.find("button.btn-primary").trigger("click");
    await flushPromises();

    expect(saveProject).toHaveBeenCalledWith(expect.objectContaining({ teamId: "t1", classId: "class-11" }));
    expect(wrapper.text()).toContain("Proyecto entregado");
  });
});
