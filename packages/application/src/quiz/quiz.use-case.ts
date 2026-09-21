import {
  ROLES,
  type QuizAnswerGiven,
  type QuizAttempt,
  type StudentQuestion,
  type StudentQuiz,
} from "@pclab/shared";
import { gradeAttempt, maxPoints, validateGiven } from "@pclab/domain";
import { assertCourse, assertRole } from "../auth";
import type {
  AuthContext,
  QuizAttemptRepository,
  QuizRepository,
} from "../ports";

/**
 * Acceso a un quiz: los quizzes son contenido compartido entre cursos (mismo
 * material para D y E), por lo que una estudiante los puede resolver aunque su
 * curso no coincida con `quiz.courseId`. El equipo docente sí queda restringido
 * a sus cursos. El aislamiento por estudiante se valida aparte (uid === studentId).
 */
function assertQuizAccess(actor: AuthContext | null, courseId: string): void {
  if (!actor || actor.isServer) return;
  if (actor.role === ROLES.ESTUDIANTE) return;
  assertCourse(actor, courseId);
}

/** Sirve el quiz a la estudiante sin respuestas (corrección es server-side). */
export class GetStudentQuizUseCase {
  constructor(
    private deps: {
      quizzes: QuizRepository;
      attempts: QuizAttemptRepository;
    },
  ) {}

  async run(input: { quizId: string; studentId: string }, actor: AuthContext | null): Promise<StudentQuiz> {
    assertRole(actor, ["ESTUDIANTE", "MASTER", "ADMIN", "PROFESOR"]);
    if (actor && !actor.isServer && actor.role === "ESTUDIANTE" && actor.uid !== input.studentId) {
      throw new Error("Solo puedes consultar tu propio quiz.");
    }

    const quiz = await this.deps.quizzes.getById(input.quizId);
    if (!quiz) throw new Error("Quiz no encontrado.");
    if (!quiz.active) throw new Error("Quiz no disponible.");
    assertQuizAccess(actor, quiz.courseId);

    const questions = await this.deps.quizzes.getQuestions(input.quizId);
    const sanitized: StudentQuestion[] = questions.map((q) => ({
      id: q.id,
      quizId: q.quizId,
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      imageUrl: q.imageUrl,
      mapId: q.mapId,
      explanation: q.explanation,
      points: q.points,
      order: q.order,
    }));

    const attempt = await this.deps.attempts.get(input.quizId, input.studentId);

    return {
      quiz: {
        id: quiz.id,
        title: quiz.title,
        mode: quiz.mode,
        config: quiz.config,
        shuffle: quiz.shuffle,
      },
      questions: sanitized,
      attempt,
    };
  }
}

export interface SubmitQuizInput {
  quizId: string;
  studentId: string;
  answers: QuizAnswerGiven[];
  now?: string;
}

/** Corrige el intento server-side, aplica límite de intentos y persiste. */
export class SubmitQuizAttemptUseCase {
  constructor(
    private deps: {
      quizzes: QuizRepository;
      attempts: QuizAttemptRepository;
    },
  ) {}

  async run(input: SubmitQuizInput, actor: AuthContext | null): Promise<QuizAttempt> {
    assertRole(actor, ["ESTUDIANTE", "MASTER", "ADMIN"]);
    if (actor && !actor.isServer && actor.role === "ESTUDIANTE" && actor.uid !== input.studentId) {
      throw new Error("Solo puedes enviar tu propio quiz.");
    }

    const quiz = await this.deps.quizzes.getById(input.quizId);
    if (!quiz) throw new Error("Quiz no encontrado.");
    if (!quiz.active) throw new Error("Quiz no disponible.");
    assertQuizAccess(actor, quiz.courseId);

    const now = input.now ?? new Date().toISOString();
    const existing = await this.deps.attempts.get(input.quizId, input.studentId);
    const usedAttempts = existing?.status === "SUBMITTED" ? 1 : 0;
    if (usedAttempts >= quiz.config.attempts && quiz.config.attempts > 0) {
      throw new Error("Ya usaste todos tus intentos de este quiz.");
    }

    const questions = await this.deps.quizzes.getQuestions(input.quizId);

    // Validar forma de cada respuesta antes de corregir
    const byQid = new Map(input.answers.map((a) => [a.qid, a]));
    for (const q of questions) {
      const given = byQid.get(q.id)?.given;
      if (given !== undefined && !validateGiven(q, given)) {
        throw new Error(`Respuesta inválida para la pregunta ${q.id}.`);
      }
    }

    const results = gradeAttempt(questions, input.answers);
    const max = maxPoints(questions);
    const score = results.reduce((acc, r) => acc + r.points, 0);

    const attempt: QuizAttempt = {
      quizId: input.quizId,
      studentId: input.studentId,
      classId: quiz.classId,
      courseId: quiz.courseId,
      startedAt: existing?.startedAt ?? now,
      submittedAt: now,
      score,
      maxScore: max,
      answers: results,
      status: "SUBMITTED",
    };

    return this.deps.attempts.upsert(attempt);
  }
}

/** Resultados de un quiz para el profesor. */
export class ListQuizResultsUseCase {
  constructor(private deps: { attempts: QuizAttemptRepository }) {}

  async run(quizId: string, actor: AuthContext | null): Promise<QuizAttempt[]> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    return this.deps.attempts.listByQuiz(quizId);
  }
}
