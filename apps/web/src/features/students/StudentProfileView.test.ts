// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import type { Student } from "@pclab/shared";

vi.mock("@/infrastructure/appDeps", () => ({
  getStudentOverview: { run: vi.fn() },
  currentActor: () => ({ uid: "teacher", role: "PROFESOR", courses: ["course-3med-d-2026"] }),
}));
vi.mock("@/services/importApi", () => ({
  setStudentActive: vi.fn(),
  getBadgesForStudent: vi.fn(),
  awardBadge: vi.fn(),
  evaluateBadges: vi.fn(),
}));

import StudentProfileView from "./StudentProfileView.vue";
import { getStudentOverview } from "@/infrastructure/appDeps";
import { getBadgesForStudent, setStudentActive } from "@/services/importApi";

const student: Student = {
  id: "s1",
  displayName: "Ana Demo Uno",
  normalizedSearchName: "ana demo uno",
  courseId: "course-3med-d-2026",
  active: true,
  archivedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  academicProfile: { participationTrackingEnabled: true, gamificationEnabled: true },
};

describe("StudentProfileView", () => {
  beforeEach(() => {
    vi.mocked(getStudentOverview.run).mockReset();
    vi.mocked(setStudentActive).mockReset();
    vi.mocked(getBadgesForStudent).mockReset();
  });

  it("muestra datos generales y secciones del perfil académico", async () => {
    vi.mocked(getStudentOverview.run).mockResolvedValue(student);
    vi.mocked(getBadgesForStudent).mockResolvedValue({
      badges: [],
      earnedCount: 0,
      totalCount: 0,
      stats: { flippedCompleted: 0, quizzesPassed: 0, evidenceCount: 0, participationTotal: 0, participationBySkill: {}, exitTickets: 0 },
    });
    const wrapper = mount(StudentProfileView, {
      props: { courseId: "course-3med-d-2026", studentId: "s1" },
      global: { stubs: { RouterLink: true } },
    });
    await flushPromises();

    expect(wrapper.text()).toContain("Ana Demo Uno");
    expect(wrapper.text()).toContain("Activa");
    expect(wrapper.text()).toContain("Progreso");
    expect(wrapper.text()).toContain("Participación");
  });

  it("aplica soft delete (retirar) vía función y refleja el cambio", async () => {
    vi.mocked(getStudentOverview.run).mockResolvedValue(student);
    vi.mocked(getBadgesForStudent).mockResolvedValue({
      badges: [],
      earnedCount: 0,
      totalCount: 0,
      stats: { flippedCompleted: 0, quizzesPassed: 0, evidenceCount: 0, participationTotal: 0, participationBySkill: {}, exitTickets: 0 },
    });
    vi.mocked(setStudentActive).mockResolvedValue({ ...student, active: false, archivedAt: new Date().toISOString() });

    const wrapper = mount(StudentProfileView, {
      props: { courseId: "course-3med-d-2026", studentId: "s1" },
      global: { stubs: { RouterLink: true } },
    });
    await flushPromises();

    const retire = wrapper.findAll("button").find((b) => b.text().includes("Retirar"))!;
    await retire.trigger("click");
    await flushPromises();

    expect(setStudentActive).toHaveBeenCalledWith("course-3med-d-2026", "s1", false);
    expect(wrapper.text()).toContain("soft delete");
  });
});
