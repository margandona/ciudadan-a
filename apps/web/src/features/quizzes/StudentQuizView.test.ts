// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import type { QuizAttempt, StudentQuiz } from "@pclab/shared";

vi.mock("@/services/importApi", () => ({
  getQuizForStudent: vi.fn(),
  submitQuizAttempt: vi.fn(),
}));

import StudentQuizView from "./StudentQuizView.vue";
import { getQuizForStudent, submitQuizAttempt } from "@/services/importApi";

const quiz: StudentQuiz = {
  quiz: {
    id: "quiz-1",
    title: "Quiz ciudadanía",
    mode: "INDIVIDUAL",
    config: { timerSeconds: null, points: 1, attempts: 1, immediateFeedback: true, showExplanation: true },
    shuffle: false,
  },
  questions: [
    { id: "q1", quizId: "quiz-1", type: "choice", prompt: "¿Qué es ser ciudadana?", options: ["Votar", "Participar"], points: 1, order: 1 },
  ],
  attempt: null,
};

const attempt: QuizAttempt = {
  quizId: "quiz-1",
  studentId: "studA",
  classId: "class-01",
  courseId: "course-d",
  submittedAt: new Date().toISOString(),
  score: 1,
  maxScore: 1,
  answers: [{ qid: "q1", given: 1, correct: true, points: 1 }],
  status: "SUBMITTED",
};

describe("StudentQuizView", () => {
  beforeEach(() => {
    vi.mocked(getQuizForStudent).mockReset();
    vi.mocked(submitQuizAttempt).mockReset();
  });

  it("carga el quiz sin respuestas y permite responder", async () => {
    vi.mocked(getQuizForStudent).mockResolvedValue(quiz);
    const wrapper = mount(StudentQuizView, {
      props: { quizId: "quiz-1" },
      global: { stubs: { RouterLink: true } },
    });
    await flushPromises();

    expect(wrapper.text()).toContain("¿Qué es ser ciudadana?");
    const options = wrapper.findAll("button.option");
    await options[1]!.trigger("click");
    expect(options[1]!.classes()).toContain("selected");
  });

  it("envía respuestas y muestra el resultado", async () => {
    vi.mocked(getQuizForStudent).mockResolvedValue(quiz);
    vi.mocked(submitQuizAttempt).mockResolvedValue({ attempt, xpAwarded: 25 });
    const wrapper = mount(StudentQuizView, {
      props: { quizId: "quiz-1" },
      global: { stubs: { RouterLink: true } },
    });
    await flushPromises();

    const options = wrapper.findAll("button.option");
    await options[1]!.trigger("click");
    await wrapper.find("button.btn-primary").trigger("click");
    await flushPromises();

    expect(submitQuizAttempt).toHaveBeenCalledWith("quiz-1", [{ qid: "q1", given: 1 }]);
    expect(wrapper.text()).toContain("Resultado: 1/1");
  });
});
