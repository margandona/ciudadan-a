// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { CLASS_STATUS } from "@pclab/shared";
import type { TeacherClassRow } from "@pclab/application";

vi.mock("@/infrastructure/appDeps", () => ({
  listTeacherClasses: { run: vi.fn() },
}));
vi.mock("@/services/importApi", () => ({
  setClassSchedule: vi.fn(),
}));

import ClassesView from "./ClassesView.vue";
import { listTeacherClasses } from "@/infrastructure/appDeps";
import { setClassSchedule } from "@/services/importApi";
import { useSessionStore } from "@/stores/session";

const row = (classId: string, number: number): TeacherClassRow => ({
  class: {
    id: classId,
    number,
    missionId: `mission-${String(number).padStart(2, "0")}`,
    title: `Misión ${String(number).padStart(2, "0")}`,
    unitId: "U3",
    oaIds: ["OA6"],
    order: number,
    hasFeedback: number === 1,
    flippedEnabled: true,
    estMinutes: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  schedule: {
    classId,
    courseId: "course-d",
    status: CLASS_STATUS.DRAFT,
    availability: {
      enabled: true,
      startAt: null,
      endAt: null,
      flippedAvailable: true,
      activityAvailable: true,
      submissionAvailable: true,
      feedbackAvailable: false,
    },
    updatedAt: new Date().toISOString(),
    updatedBy: "teach1",
  },
});

function mountView() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useSessionStore();
  store.$patch({ role: "PROFESOR", courses: ["course-d"] });
  return mount(ClassesView, {
    global: { plugins: [pinia], stubs: { RouterLink: true } },
  });
}

describe("ClassesView", () => {
  beforeEach(() => {
    vi.mocked(listTeacherClasses.run).mockReset();
    vi.mocked(setClassSchedule).mockReset();
  });

  it("lista las misiones del curso con su estado", async () => {
    vi.mocked(listTeacherClasses.run).mockResolvedValue([row("class-01", 1), row("class-02", 2)]);
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain("Misión 01");
    expect(wrapper.text()).toContain("Misión 02");
    expect(wrapper.findAll("select").length).toBeGreaterThan(1);
  });

  it("guarda la programación de una clase vía función", async () => {
    vi.mocked(listTeacherClasses.run).mockResolvedValue([row("class-01", 1)]);
    vi.mocked(setClassSchedule).mockResolvedValue({
      ...row("class-01", 1).schedule,
      status: CLASS_STATUS.OPEN,
    });

    const wrapper = mountView();
    await flushPromises();

    await wrapper.find("button.btn-primary").trigger("click");
    await flushPromises();

    expect(setClassSchedule).toHaveBeenCalledWith(
      "course-d",
      "class-01",
      expect.objectContaining({ status: CLASS_STATUS.DRAFT }),
    );
    expect(wrapper.text()).toContain("Guardado");
  });
});
