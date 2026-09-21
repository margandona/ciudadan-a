import { describe, expect, it } from "vitest";
import { QUESTION_TYPE, type Quiz, type QuizAttempt, type QuizQuestion } from "@pclab/shared";
import type { QuizAttemptRepository, QuizRepository } from "../ports";
import { GetStudentQuizUseCase, ListQuizResultsUseCase, SubmitQuizAttemptUseCase } from "./quiz.use-case";

const QUIZ: Quiz = {
  id: "quiz-1",
  classId: "class-01",
  courseId: "course-d",
  title: "Quiz ciudadanía",
  mode: "INDIVIDUAL",
  config: { timerSeconds: null, points: 1, attempts: 1, immediateFeedback: true, showExplanation: true },
  shuffle: false,
  active: true,
  order: 1,
  questionCount: 2,
  createdAt: "2026-08-10T12:00:00.000Z",
  updatedAt: "2026-08-10T12:00:00.000Z",
};

const QUESTIONS: QuizQuestion[] = [
  { id: "q1", quizId: "quiz-1", type: QUESTION_TYPE.CHOICE, prompt: "¿A?", options: ["a", "b"], points: 2, order: 1, correctIndex: 0 },
  { id: "q2", quizId: "quiz-1", type: QUESTION_TYPE.TRUE_FALSE, prompt: "¿B?", options: ["V", "F"], points: 1, order: 2, correctIndex: 1 },
];

class FakeQuizzes implements QuizRepository {
  constructor(private quiz: Quiz = QUIZ, private questions: QuizQuestion[] = QUESTIONS) {}
  async getById(id: string): Promise<Quiz | null> {
    return id === this.quiz.id ? this.quiz : null;
  }
  async listByClass(): Promise<Quiz[]> {
    return [this.quiz];
  }
  async getQuestions(): Promise<QuizQuestion[]> {
    return this.questions;
  }
}

class FakeAttempts implements QuizAttemptRepository {
  byKey = new Map<string, QuizAttempt>();
  async get(quizId: string, studentId: string): Promise<QuizAttempt | null> {
    return this.byKey.get(`${quizId}|${studentId}`) ?? null;
  }
  async upsert(a: QuizAttempt): Promise<QuizAttempt> {
    this.byKey.set(`${a.quizId}|${a.studentId}`, a);
    return a;
  }
  async listByQuiz(quizId: string): Promise<QuizAttempt[]> {
    return [...this.byKey.values()].filter((a) => a.quizId === quizId);
  }
}

const STUDENT = { uid: "studA", role: "ESTUDIANTE", courses: ["course-d"] };
const TEACHER = { uid: "teach1", role: "PROFESOR", courses: ["course-d"] };

describe("GetStudentQuizUseCase", () => {
  it("sirve el quiz sin datos de corrección y con el intento previo", async () => {
    const attempts = new FakeAttempts();
    await attempts.upsert({
      quizId: "quiz-1", studentId: "studA", classId: "class-01", courseId: "course-d",
      score: 1, maxScore: 3, answers: [], status: "SUBMITTED", submittedAt: "2026-08-10T12:00:00.000Z",
    });
    const uc = new GetStudentQuizUseCase({ quizzes: new FakeQuizzes(), attempts });
    const result = await uc.run({ quizId: "quiz-1", studentId: "studA" }, STUDENT);
    expect(result.quiz.title).toBe("Quiz ciudadanía");
    expect(result.questions[0]).not.toHaveProperty("correctIndex");
    expect(result.attempt?.status).toBe("SUBMITTED");
  });
});

describe("SubmitQuizAttemptUseCase", () => {
  it("corrige server-side y persiste el intento", async () => {
    const attempts = new FakeAttempts();
    const uc = new SubmitQuizAttemptUseCase({ quizzes: new FakeQuizzes(), attempts });
    const result = await uc.run(
      { quizId: "quiz-1", studentId: "studA", answers: [{ qid: "q1", given: 0 }, { qid: "q2", given: 1 }] },
      STUDENT,
    );
    expect(result.score).toBe(3);
    expect(result.maxScore).toBe(3);
    expect(result.status).toBe("SUBMITTED");
    expect(result.answers[0]!.correct).toBe(true);
  });

  it("cuenta como incorrectas las preguntas sin responder", async () => {
    const attempts = new FakeAttempts();
    const uc = new SubmitQuizAttemptUseCase({ quizzes: new FakeQuizzes(), attempts });
    const result = await uc.run({ quizId: "quiz-1", studentId: "studA", answers: [{ qid: "q1", given: 0 }] }, STUDENT);
    expect(result.score).toBe(2);
    expect(result.maxScore).toBe(3);
  });

  it("respeta el límite de intentos", async () => {
    const attempts = new FakeAttempts();
    const uc = new SubmitQuizAttemptUseCase({ quizzes: new FakeQuizzes(), attempts });
    await uc.run({ quizId: "quiz-1", studentId: "studA", answers: [{ qid: "q1", given: 0 }] }, STUDENT);
    await expect(
      uc.run({ quizId: "quiz-1", studentId: "studA", answers: [{ qid: "q1", given: 0 }] }, STUDENT),
    ).rejects.toThrow(/intentos/);
  });

  it("rechaza respuestas con forma inválida", async () => {
    const uc = new SubmitQuizAttemptUseCase({ quizzes: new FakeQuizzes(), attempts: new FakeAttempts() });
    await expect(
      uc.run({ quizId: "quiz-1", studentId: "studA", answers: [{ qid: "q1", given: "texto" }] }, STUDENT),
    ).rejects.toThrow(/inválida/);
  });

  it("impide enviar el quiz de otra estudiante", async () => {
    const uc = new SubmitQuizAttemptUseCase({ quizzes: new FakeQuizzes(), attempts: new FakeAttempts() });
    await expect(
      uc.run({ quizId: "quiz-1", studentId: "studB", answers: [] }, STUDENT),
    ).rejects.toThrow(/propio/);
  });
});

describe("acceso a quizzes entre cursos", () => {
  const STUDENT_E = { uid: "studE", role: "ESTUDIANTE", courses: ["course-e"] };
  const TEACHER_E = { uid: "teachE", role: "PROFESOR", courses: ["course-e"] };

  it("una estudiante de otro curso puede resolver el quiz (contenido compartido)", async () => {
    const attempts = new FakeAttempts();
    const get = new GetStudentQuizUseCase({ quizzes: new FakeQuizzes(), attempts });
    const quiz = await get.run({ quizId: "quiz-1", studentId: "studE" }, STUDENT_E);
    expect(quiz.questions).toHaveLength(2);

    const submit = new SubmitQuizAttemptUseCase({ quizzes: new FakeQuizzes(), attempts });
    const attempt = await submit.run(
      { quizId: "quiz-1", studentId: "studE", answers: [{ qid: "q1", given: 0 }, { qid: "q2", given: 1 }] },
      STUDENT_E,
    );
    expect(attempt.status).toBe("SUBMITTED");
  });

  it("un docente de otro curso no puede acceder al quiz", async () => {
    const get = new GetStudentQuizUseCase({ quizzes: new FakeQuizzes(), attempts: new FakeAttempts() });
    await expect(get.run({ quizId: "quiz-1", studentId: "teachE" }, TEACHER_E)).rejects.toThrow();
  });
});

describe("ListQuizResultsUseCase", () => {
  it("lista intentos para el profesor", async () => {
    const attempts = new FakeAttempts();
    await attempts.upsert({
      quizId: "quiz-1", studentId: "studA", classId: "class-01", courseId: "course-d",
      score: 2, maxScore: 3, answers: [], status: "SUBMITTED",
    });
    const uc = new ListQuizResultsUseCase({ attempts });
    const list = await uc.run("quiz-1", TEACHER);
    expect(list).toHaveLength(1);
    expect(list[0]!.score).toBe(2);
  });
});
