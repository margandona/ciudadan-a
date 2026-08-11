// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { Student, Submission } from "@pclab/shared";

vi.mock("@/infrastructure/appDeps", () => ({
  listSubmissions: { run: vi.fn() },
  studentRepo: { findByCourse: vi.fn() },
}));
vi.mock("@/services/importApi", () => ({
  reviewSubmission: vi.fn(),
}));

import SubmissionsReviewView from "./SubmissionsReviewView.vue";
import { listSubmissions, studentRepo } from "@/infrastructure/appDeps";
import { reviewSubmission } from "@/services/importApi";
import { useSessionStore } from "@/stores/session";

const student: Student = {
  id: "studA",
  displayName: "Ana Demo Uno",
  normalizedSearchName: "ana demo uno",
  courseId: "course-d",
  active: true,
  archivedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  academicProfile: { participationTrackingEnabled: true, gamificationEnabled: true },
};

const submission: Submission = {
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
  store.$patch({ role: "PROFESOR", courses: ["course-d"] });
  return mount(SubmissionsReviewView, {
    props: { classId: "class-01" },
    global: { plugins: [pinia], stubs: { RouterLink: true } },
  });
}

describe("SubmissionsReviewView", () => {
  beforeEach(() => {
    vi.mocked(listSubmissions.run).mockReset();
    vi.mocked(studentRepo.findByCourse).mockReset();
    vi.mocked(reviewSubmission).mockReset();
  });

  it("lista evidencias con nombre de estudiante y guarda la revisión", async () => {
    vi.mocked(listSubmissions.run).mockResolvedValue([submission]);
    vi.mocked(studentRepo.findByCourse).mockResolvedValue([student]);
    vi.mocked(reviewSubmission).mockResolvedValue({ ...submission, status: "RETROALIMENTADO", score: 4 });

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain("Ana Demo Uno");
    await wrapper.findAll("button").find((b) => b.text() === "Revisar")!.trigger("click");
    await wrapper.find("textarea").setValue("Bien argumentado");
    await wrapper.find("#status").setValue("RETROALIMENTADO");
    await wrapper.find("button.btn-primary").trigger("click");
    await flushPromises();

    expect(reviewSubmission).toHaveBeenCalledWith({
      submissionId: "s1",
      courseId: "course-d",
      status: "RETROALIMENTADO",
      score: null,
      teacherFeedback: "Bien argumentado",
    });
    expect(wrapper.text()).toContain("Revisión guardada");
  });
});
