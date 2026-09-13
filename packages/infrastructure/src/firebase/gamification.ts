import type {
  ClassRepository,
  ExitTicketRepository,
  FlippedProgressRepository,
  ParticipationRepository,
  QuizAttemptRepository,
  QuizRepository,
  StudentBadgeRepository,
  SubmissionRepository,
} from "@pclab/application";
// Nota: infrastructure no puede importar valores de @pclab/domain en runtime
// (los scripts con tsx no resuelven el alias desde aquí). Estas constantes deben
// coincidir con QUIZ_PASS_RATIO / QUIZ_PASS_XP de @pclab/domain.
const QUIZ_PASS_RATIO = 0.6;
const QUIZ_PASS_XP = 25;

export interface ActivityXpDeps {
  classes: ClassRepository;
  flipped: FlippedProgressRepository;
  submissions: SubmissionRepository;
  participation: ParticipationRepository;
  exitTickets: ExitTicketRepository;
  quizzes: QuizRepository;
  quizAttempts: QuizAttemptRepository;
  studentBadges: StudentBadgeRepository;
}

export interface ActivityXpResult {
  xpParts: Record<string, number>;
  activityXp: number;
  /** Días ISO (YYYY-MM-DD) con actividad, para racha y estrellas. */
  activityDays: string[];
  badgesEarned: number;
}

/**
 * Calcula el XP de actividad de una estudiante a partir de sus registros.
 * Centraliza la lógica usada por `getStudentGamification` y por la granja.
 */
export async function computeActivityXp(
  deps: ActivityXpDeps,
  courseId: string,
  uid: string,
): Promise<ActivityXpResult> {
  const [catalog, earned] = await Promise.all([
    deps.classes.listAll(),
    deps.studentBadges.listForStudent(uid),
  ]);

  let quizzesPassed = 0;
  let participationTotal = 0;
  let ticketCount = 0;
  let flippedReady = 0;
  const activityDays = new Set<string>();

  function addDay(iso: string | null | undefined): void {
    if (!iso) return;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return;
    activityDays.add(d.toISOString().slice(0, 10));
  }

  // Evidencias: una consulta por estudiante (no escanear cada clase).
  let evidence = 0;
  const byStudent = deps.submissions.findByStudent;
  if (byStudent) {
    const subs = await byStudent.call(deps.submissions, uid);
    evidence = subs.filter((s) => s.courseId === courseId).length;
  } else {
    const perClass = await Promise.all(catalog.map((cls) => deps.submissions.listByClass(courseId, cls.id)));
    evidence = perClass.flat().filter((s) => s.studentId === uid).length;
  }

  // Solo se leen los registros de esta estudiante (antes: todos los del curso).
  for (const cls of catalog) {
    const [flipped, part, ticket, quizList] = await Promise.all([
      deps.flipped.get(cls.id, uid),
      deps.participation.get(courseId, cls.id, uid),
      deps.exitTickets.get(cls.id, uid),
      deps.quizzes.listByClass(cls.id),
    ]);
    if (flipped && flipped.courseId === courseId && flipped.ready) {
      flippedReady++;
      addDay(flipped.completedAt);
    }
    if (part) participationTotal += part.total;
    if (ticket && ticket.courseId === courseId) {
      ticketCount++;
      addDay(ticket.submittedAt);
    }
    for (const quiz of quizList) {
      const attempt = await deps.quizAttempts.get(quiz.id, uid);
      if (attempt && attempt.status === "SUBMITTED") {
        addDay(attempt.submittedAt);
        if (attempt.maxScore > 0 && attempt.score / attempt.maxScore >= QUIZ_PASS_RATIO) quizzesPassed++;
      }
    }
  }

  const xpParts: Record<string, number> = {
    flipped: flippedReady * 30,
    quizzes: quizzesPassed * QUIZ_PASS_XP,
    evidence: evidence * 10,
    participation: participationTotal * 2,
    tickets: ticketCount * 5,
    badges: earned.length * 15,
  };
  const activityXp = Object.values(xpParts).reduce((a, b) => a + b, 0);
  return { xpParts, activityXp, activityDays: [...activityDays].sort(), badgesEarned: earned.length };
}
