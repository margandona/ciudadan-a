// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { StudentMission } from "@pclab/application";

vi.mock("@/infrastructure/appDeps", () => ({
  listMissions: { run: vi.fn() },
}));
vi.mock("@/services/importApi", () => ({
  getBadgesForStudent: vi.fn(),
  getPositiveMessage: vi.fn(),
  evaluateBadges: vi.fn(),
  getStudentGamification: vi.fn().mockResolvedValue({ xp: 0, level: 1, progressToNext: 0, streak: 0, weeklyStars: 0, breakdown: {}, badges: 0, totalBadges: 0 }),
}));

import StudentHomeView from "./StudentHomeView.vue";
import { listMissions } from "@/infrastructure/appDeps";
import { getBadgesForStudent, getPositiveMessage } from "@/services/importApi";
import { useSessionStore } from "@/stores/session";

const mission = (id: string, order: number): StudentMission => ({
  class: {
    id,
    number: order,
    missionId: `mission-${String(order).padStart(2, "0")}`,
    title: `Misión ${String(order).padStart(2, "0")}`,
    unitId: "U3",
    oaIds: ["OA6"],
    order,
    hasFeedback: false,
    flippedEnabled: true,
    estMinutes: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  schedule: null,
  visibility: "open",
  flippedAvailable: true,
  flippedProgress: null,
});

function mountView() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useSessionStore();
  store.$patch({ role: "ESTUDIANTE", courseId: "course-d", studentId: "studA" });
  return mount(StudentHomeView, {
    global: { plugins: [pinia], stubs: { RouterLink: true } },
  });
}

describe("StudentHomeView", () => {
  beforeEach(() => {
    vi.mocked(listMissions.run).mockReset();
    vi.mocked(getBadgesForStudent).mockReset();
    vi.mocked(getPositiveMessage).mockReset();
  });

  it("muestra la próxima misión y su progreso", async () => {
    vi.mocked(listMissions.run).mockResolvedValue([
      {
        ...mission("class-01", 1),
        flippedProgress: {
          classId: "class-01",
          studentId: "studA",
          courseId: "course-d",
          startedAt: new Date().toISOString(),
          completedAt: null,
          progressPercent: 50,
          blocksVisited: ["m1"],
          interactionSeconds: 10,
          quizAttempts: 0,
          quizScore: null,
          ready: false,
          updatedAt: new Date().toISOString(),
        },
      },
      mission("class-02", 2),
    ]);
    vi.mocked(getBadgesForStudent).mockResolvedValue({
      badges: [],
      earnedCount: 0,
      totalCount: 0,
      stats: { flippedCompleted: 0, quizzesPassed: 0, evidenceCount: 0, participationTotal: 0, participationBySkill: {}, exitTickets: 0 },
    });
    vi.mocked(getPositiveMessage).mockResolvedValue(null);

    const wrapper = mountView();
    await flushPromises();

    expect(listMissions.run).toHaveBeenCalledWith(
      { courseId: "course-d", studentId: "studA" },
      expect.anything(),
    );
    expect(wrapper.text()).toContain("Tu próxima misión");
    expect(wrapper.text()).toContain("50%");
  });

  it("muestra estado sin curso asignado", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useSessionStore();
    store.$patch({ role: "ESTUDIANTE", courseId: "", studentId: "" });

    const wrapper = mount(StudentHomeView, {
      global: { plugins: [pinia], stubs: { RouterLink: true } },
    });
    expect(wrapper.text()).toContain("aún no ha habilitado tu acceso");
  });
});
