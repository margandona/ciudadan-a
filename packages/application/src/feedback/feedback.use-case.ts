import { ROLES, type CourseAnalytics, type Feedback, type FeedbackTendencies } from "@pclab/shared";
import { aggregateFeedbackTendencies, buildAlerts, questionPerformance, validateFeedback } from "@pclab/domain";
import { assertCourse, assertRole } from "../auth";
import type {
  AuthContext,
  ClassRepository,
  ExitTicketRepository,
  FeedbackRepository,
  FlippedProgressRepository,
  ParticipationRepository,
  QuizAttemptRepository,
  QuizRepository,
  SubmissionRepository,
} from "../ports";

export interface SubmitFeedbackInput {
  classId: string;
  courseId: string;
  studentId: string;
  anon: boolean;
  app: Feedback["app"];
  learning: Feedback["learning"];
}

/** La estudiante envía su feedback privado (clases 1/4/7/10). */
export class SubmitFeedbackUseCase {
  constructor(private deps: { feedback: FeedbackRepository }) {}

  async run(input: SubmitFeedbackInput, actor: AuthContext | null): Promise<Feedback> {
    assertRole(actor, [ROLES.ESTUDIANTE, ROLES.ADMIN, ROLES.MASTER]);
    if (actor && !actor.isServer && actor.role === ROLES.ESTUDIANTE && actor.uid !== input.studentId) {
      throw new Error("Solo puedes enviar tu propio feedback.");
    }
    const feedback: Feedback = {
      classId: input.classId,
      courseId: input.courseId,
      studentId: input.studentId,
      anon: input.anon,
      app: input.app,
      learning: input.learning,
      submittedAt: new Date().toISOString(),
    };
    validateFeedback(feedback);
    return this.deps.feedback.upsert(feedback);
  }
}

/** Clases con feedback (1, 4, 7, 10). */
export const FEEDBACK_CLASSES = ["class-01", "class-04", "class-07", "class-10"] as const;

/** Tendencias agregadas del feedback para el profesor (sin identificar anónimos). */
export class GetFeedbackTendenciesUseCase {
  constructor(private deps: { feedback: FeedbackRepository }) {}

  async run(courseId: string, actor: AuthContext | null): Promise<FeedbackTendencies> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    assertCourse(actor, courseId);

    const all: Feedback[] = [];
    for (const classId of FEEDBACK_CLASSES) {
      all.push(...(await this.deps.feedback.listByClass(courseId, classId)));
    }
    return aggregateFeedbackTendencies(courseId, all);
  }
}

/** Analítica pedagógica descriptiva por clase + alertas simples. */
export class GetCourseAnalyticsUseCase {
  constructor(
    private deps: {
      classes: ClassRepository;
      flipped: FlippedProgressRepository;
      submissions: SubmissionRepository;
      exitTickets: ExitTicketRepository;
      participation: ParticipationRepository;
      quizzes: QuizRepository;
      quizAttempts: QuizAttemptRepository;
    },
  ) {}

  async run(courseId: string, actor: AuthContext | null): Promise<CourseAnalytics> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    assertCourse(actor, courseId);

    const classes = await this.deps.classes.listAll();
    const results = await Promise.all(
      classes.map(async (cls) => {
        const [flipped, submissions, tickets, participation, quizzes] = await Promise.all([
          this.deps.flipped.listByClass(courseId, cls.id),
          this.deps.submissions.listByClass(courseId, cls.id),
          this.deps.exitTickets.listByClass(courseId, cls.id),
          this.deps.participation.listByClass(courseId, cls.id),
          this.deps.quizzes.listByClass(cls.id),
        ]);

        const lowPerformance: CourseAnalytics["classes"][number]["lowPerformance"] = [];
        for (const quiz of quizzes) {
          const attempts = await this.deps.quizAttempts.listByQuiz(quiz.id);
          const submitted = attempts
            .filter((a) => a.status === "SUBMITTED")
            .map((a) => a.answers.map((answer) => ({ qid: answer.qid, correct: answer.correct })));
          lowPerformance.push(...questionPerformance({ id: quiz.id, title: quiz.title }, submitted.map((answers) => ({ answers }))));
        }

        const flippedReady = flipped.filter((f) => f.ready).length;
        return {
          classId: cls.id,
          flippedPercent: flipped.length > 0 ? Math.round((flippedReady / flipped.length) * 100) : 0,
          pendingEvidences: submissions.filter((s) => s.status === "ENTREGADO").length,
          exitTickets: tickets.length,
          avgDifficulty: tickets.length > 0 ? Math.round((tickets.reduce((a, t) => a + t.difficulty, 0) / tickets.length) * 10) / 10 : null,
          participation: participation.reduce((acc, r) => acc + r.total, 0),
          lowPerformance,
        };
      }),
    );

    const alertClasses: CourseAnalytics["classes"] = results;
    return { courseId, classes: results, alerts: buildAlerts(alertClasses) };
  }
}
