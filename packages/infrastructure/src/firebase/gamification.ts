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
  let evidence = 0;
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

  for (const cls of catalog) {
    const [flipped, subs, parts, tickets, quizList] = await Promise.all([
      deps.flipped.listByClass(courseId, cls.id),
      deps.submissions.listByClass(courseId, cls.id),
      deps.participation.listByClass(courseId, cls.id),
      deps.exitTickets.listByClass(courseId, cls.id),
      deps.quizzes.listByClass(cls.id),
    ]);
    const myFlipped = flipped.find((f) => f.studentId === uid);
    if (myFlipped && myFlipped.ready) {
      flippedReady++;
      addDay(myFlipped.completedAt);
    }
    evidence += subs.filter((s) => s.studentId === uid).length;
    const part = parts.find((p) => p.studentId === uid);
    if (part) participationTotal += part.total;
    const myTickets = tickets.filter((t) => t.studentId === uid);
    ticketCount += myTickets.length;
    for (const t of myTickets) addDay(t.submittedAt);
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
