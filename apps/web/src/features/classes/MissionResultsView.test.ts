// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type {
  Activity,
  ClassEntity,
  ExitTicket,
  ParticipationOverview,
  Quiz,
  QuizAttempt,
  Student,
  Submission,
} from "@pclab/shared";
import { PARTICIPATION_SKILLS } from "@pclab/shared";

vi.mock("@/infrastructure/appDeps", () => ({
  classRepo: { getById: vi.fn() },
  studentRepo: { findByCourse: vi.fn() },
  activityRepo: { listByClass: vi.fn() },
  submissionRepo: { listByClass: vi.fn() },
  exitTicketRepo: { listByClass: vi.fn() },
  quizRepo: { listByClass: vi.fn() },
  quizAttemptRepo: { listByQuiz: vi.fn() },
}));
vi.mock("@/services/importApi", () => ({
  getFlippedOverview: vi.fn(),
  getParticipationOverview: vi.fn(),
  reviewSubmission: vi.fn(),
}));

import MissionResultsView from "./MissionResultsView.vue";
import {
  activityRepo,
  classRepo,
  exitTicketRepo,
  quizAttemptRepo,
  quizRepo,
  studentRepo,
  submissionRepo,
} from "@/infrastructure/appDeps";
import { getFlippedOverview, getParticipationOverview } from "@/services/importApi";
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

const cls: ClassEntity = {
  id: "class-07",
  number: 7,
  missionId: "mission-07",
  title: "Misión 07 — ¿Quién debe resolver los problemas?",
  unitId: "U4",
  oaIds: [],
  order: 7,
  hasFeedback: true,
  flippedEnabled: true,
  estMinutes: 15,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const activity: Activity = {
  id: "act-1",
  classId: "class-07",
  courseId: "course-d",
  title: "Consejo de soluciones",
  type: "council",
  description: "Debate guiado",
  instructions: [],
  evidenceRequired: true,
  evidenceTypes: ["text"],
  order: 1,
  active: true,
};

const submission: Submission = {
  id: "s1",
  activityId: "act-1",
  studentId: "studA",
  classId: "class-07",
  courseId: "course-d",
  status: "ENTREGADO",
  content: { text: "Mi propuesta ciudadana" },
  attachments: [],
  attempts: 1,
  submittedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const ticket: ExitTicket = {
  classId: "class-07",
  courseId: "course-d",
  studentId: "studA",
  answers: { learned: "Aprendí sobre bienes públicos", evidence: "El caso del agua", concept: "Bien público", question: "¿Quién fiscaliza?", relationOvalle: "El tranque" },
  difficulty: 4,
  submittedAt: new Date().toISOString(),
};

const quiz: Quiz = {
  id: "quiz-1",
  classId: "class-07",
  courseId: "course-d",
  title: "Quiz de repaso",
  mode: "INDIVIDUAL",
  config: { points: 1, attempts: 1, immediateFeedback: true, showExplanation: true, timerSeconds: null },
  shuffle: false,
  active: true,
  order: 1,
  questionCount: 3,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const attempt: QuizAttempt = {
  quizId: "quiz-1",
  studentId: "studA",
  classId: "class-07",
  courseId: "course-d",
  score: 2,
  maxScore: 3,
  answers: [
    { qid: "q1", given: 0, correct: true, points: 1 },
    { qid: "q2", given: 1, correct: true, points: 1 },
    { qid: "q3", given: 2, correct: false, points: 0 },
  ],
  status: "SUBMITTED",
};

function mountView() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useSessionStore();
  store.$patch({ role: "PROFESOR", courses: ["course-d"] });
  return mount(MissionResultsView, {
    props: { classId: "class-07" },
    global: { plugins: [pinia], stubs: { RouterLink: true } },
  });
}

describe("MissionResultsView", () => {
  beforeEach(() => {
    vi.mocked(classRepo.getById).mockReset().mockResolvedValue(cls);
    vi.mocked(studentRepo.findByCourse).mockReset().mockResolvedValue([student]);
    vi.mocked(activityRepo.listByClass).mockReset().mockResolvedValue([activity]);
    vi.mocked(submissionRepo.listByClass).mockReset().mockResolvedValue([submission]);
    vi.mocked(exitTicketRepo.listByClass).mockReset().mockResolvedValue([ticket]);
    vi.mocked(quizRepo.listByClass).mockReset().mockResolvedValue([quiz]);
    vi.mocked(quizAttemptRepo.listByQuiz).mockReset().mockResolvedValue([attempt]);
    vi.mocked(getFlippedOverview).mockReset().mockResolvedValue({
      total: 1,
      completed: 1,
      rows: [{ studentId: "studA", displayName: "Ana Demo Uno", completed: true, progress: null }],
    });
    const bySkill = PARTICIPATION_SKILLS.reduce<ParticipationOverview["bySkill"]>((acc, skill) => {
      const active = skill === "intervencionOral";
      acc[skill] = { count: active ? 1 : 0, sum: active ? 2 : 0, avg: active ? 2 : 0 };
      return acc;
    }, {} as ParticipationOverview["bySkill"]);
    vi.mocked(getParticipationOverview).mockReset().mockResolvedValue({ bySkill, total: 1, studentCount: 1 });
  });

  it("muestra evidencias, tickets y quizzes de la misión", async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain("Misión 07");
    expect(wrapper.text()).toContain("Consejo de soluciones");
    expect(wrapper.text()).toContain("Mi propuesta ciudadana");
    expect(wrapper.text()).toContain("Ana Demo Uno");

    await wrapper.findAll("button.tab").find((b) => b.text().includes("Tickets"))!.trigger("click");
    expect(wrapper.text()).toContain("Aprendí sobre bienes públicos");
    expect(wrapper.text()).toContain("El tranque");

    await wrapper.findAll("button.tab").find((b) => b.text().includes("Quizzes"))!.trigger("click");
    expect(wrapper.text()).toContain("Quiz de repaso");
    expect(wrapper.text()).toContain("2/3");
  });
});
