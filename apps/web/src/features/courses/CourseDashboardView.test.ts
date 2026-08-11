// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import type { Course, Student } from "@pclab/shared";

vi.mock("@/infrastructure/appDeps", () => ({
  courseRepo: { findById: vi.fn() },
  listStudents: { run: vi.fn() },
  currentActor: () => ({ uid: "teacher", role: "PROFESOR", courses: ["course-3med-d-2026"] }),
}));
vi.mock("@/services/importApi", () => ({
  getCourseDashboard: vi.fn(),
}));

import CourseDashboardView from "./CourseDashboardView.vue";
import { courseRepo, listStudents } from "@/infrastructure/appDeps";
import { getCourseDashboard } from "@/services/importApi";

const course: Course = {
  id: "course-3med-d-2026",
  name: "3º Medio D",
  level: "Tercero Medio",
  section: "D",
  subject: "Educación Ciudadana",
  year: 2026,
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const students: Student[] = [
  {
    id: "s1",
    displayName: "Ana Demo Uno",
    normalizedSearchName: "ana demo uno",
    courseId: "course-3med-d-2026",
    active: true,
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    academicProfile: { participationTrackingEnabled: true, gamificationEnabled: true },
  },
  {
    id: "s2",
    displayName: "Beatriz Demo Dos",
    normalizedSearchName: "beatriz demo dos",
    courseId: "course-3med-d-2026",
    active: false,
    archivedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    academicProfile: { participationTrackingEnabled: true, gamificationEnabled: true },
  },
];

describe("CourseDashboardView", () => {
  beforeEach(() => {
    vi.mocked(courseRepo.findById).mockReset();
    vi.mocked(listStudents.run).mockReset();
    vi.mocked(getCourseDashboard).mockReset();
  });

  it("muestra resumen y solo las estudiantes del curso D (aislamiento en UI)", async () => {
    vi.mocked(courseRepo.findById).mockResolvedValue(course);
    vi.mocked(listStudents.run).mockResolvedValue(students);
    vi.mocked(getCourseDashboard).mockResolvedValue({
      courseId: "course-3med-d-2026",
      totalStudents: 2,
      activeStudents: 2,
      flippedTotal: 12,
      flippedCompleted: 3,
      flippedPercent: 25,
      submissions: 1,
      pendingEvidences: 1,
      exitTickets: 1,
      participation: 4,
      avgDifficulty: 3,
    });

    const wrapper = mount(CourseDashboardView, {
      props: { courseId: "course-3med-d-2026" },
      global: { stubs: { RouterLink: true } },
    });
    await flushPromises();

    expect(listStudents.run).toHaveBeenCalledWith("course-3med-d-2026", expect.anything());
    expect(wrapper.text()).toContain("3º Medio D");
    expect(wrapper.text()).toContain("Estudiantes");
    expect(wrapper.text()).toContain("Ana Demo Uno");
    expect(wrapper.text()).toContain("Beatriz Demo Dos");
    expect(wrapper.text()).toContain("Retirada");
  });

  it("muestra estado vacío cuando no hay estudiantes", async () => {
    vi.mocked(courseRepo.findById).mockResolvedValue(course);
    vi.mocked(listStudents.run).mockResolvedValue([]);
    vi.mocked(getCourseDashboard).mockResolvedValue({
      courseId: "course-3med-d-2026",
      totalStudents: 0,
      activeStudents: 0,
      flippedTotal: 0,
      flippedCompleted: 0,
      flippedPercent: 0,
      submissions: 0,
      pendingEvidences: 0,
      exitTickets: 0,
      participation: 0,
      avgDifficulty: null,
    });

    const wrapper = mount(CourseDashboardView, {
      props: { courseId: "course-3med-d-2026" },
      global: { stubs: { RouterLink: true } },
    });
    await flushPromises();

    expect(wrapper.text()).toContain("No hay estudiantes");
  });
});
