// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { Activity, Submission } from "@pclab/shared";

vi.mock("@/infrastructure/appDeps", () => ({
  listActivities: { run: vi.fn() },
  submissionRepo: { listByClass: vi.fn() },
}));
vi.mock("@/services/importApi", () => ({
  submitEvidence: vi.fn(),
}));

import StudentActivitiesView from "./StudentActivitiesView.vue";
import { listActivities, submissionRepo } from "@/infrastructure/appDeps";
import { submitEvidence } from "@/services/importApi";
import { useSessionStore } from "@/stores/session";

const activity: Activity = {
  id: "act-1",
  classId: "class-01",
  courseId: "course-d",
  title: "Dilemas ciudadanos",
  type: "dilemma",
  description: "Analiza un dilema",
  instructions: ["Lee el caso"],
  evidenceRequired: true,
  evidenceTypes: ["text"],
  order: 1,
  active: true,
};

const submitted: Submission = {
  id: "s1",
  activityId: "act-1",
  studentId: "studA",
  classId: "class-01",
  courseId: "course-d",
  status: "ENTREGADO",
  content: { text: "Mi análisis" },
  attachments: [],
  attempts: 1,
  submittedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function mountView() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useSessionStore();
  store.$patch({ role: "ESTUDIANTE", courseId: "course-d", studentId: "studA" });
  return mount(StudentActivitiesView, {
    props: { classId: "class-01" },
    global: { plugins: [pinia], stubs: { RouterLink: true } },
  });
}

describe("StudentActivitiesView", () => {
  beforeEach(() => {
    vi.mocked(listActivities.run).mockReset();
    vi.mocked(submissionRepo.listByClass).mockReset();
    vi.mocked(submitEvidence).mockReset();
  });

  it("lista actividades y permite entregar evidencia", async () => {
    vi.mocked(listActivities.run).mockResolvedValue([activity]);
    vi.mocked(submissionRepo.listByClass).mockResolvedValue([]);
    vi.mocked(submitEvidence).mockResolvedValue(submitted);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain("Dilemas ciudadanos");
    await wrapper.find("textarea").setValue("Mi análisis");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(submitEvidence).toHaveBeenCalledWith({
      activityId: "act-1",
      classId: "class-01",
      courseId: "course-d",
      content: { text: "Mi análisis" },
      attachments: [],
    });
    expect(wrapper.text()).toContain("ENTREGADO");
  });
});
