import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { MATERIAL_STATUS } from "@pclab/shared";
import { quizXpAward } from "@pclab/domain";
import { rateLimit } from "./rate-limit";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import type {
  CandidateStudent,
  ClassAvailability,
  ClassStatus,
  EvidenceAttachment,
  ExitTicket,
  Feedback,
  ImportPreview,
  ImportResult,
  Material,
  MaterialVersion,
  QuizAnswerGiven,
  QuizSubmitResult,
  Student,
  StudentQuiz,
  Submission,
  SubmissionStatus,
} from "@pclab/shared";
import {
  AddMaterialVersionUseCase,
  ApproveMaterialUseCase,
  ArchiveMaterialUseCase,
  AssessProjectUseCase,
  AwardBadgeUseCase,
  BuyFarmItemUseCase,
  CorrectMaterialUseCase,
  CreateMaterialUseCase,
  CreateProjectionTokenUseCase,
  CreateTeamUseCase,
  DeactivateStudentUseCase,
  DuplicateMaterialUseCase,
  EquipFarmItemUseCase,
  EvaluateAndAwardBadgesUseCase,
  GenerateDocumentUseCase,
  GenerateMaterialUseCase,
  GetBadgesForStudentUseCase,
  GetCalendarAlertsUseCase,
  GetClassDashboardUseCase,
  GetConceptQuizUseCase,
  GetCourseAnalyticsUseCase,
  GetCourseDashboardUseCase,
  GetFarmUseCase,
  GetFeedbackTendenciesUseCase,
  GetFlippedOverviewUseCase,
  GetMaterialDetailUseCase,
  GetParticipationOverviewUseCase,
  GetPositiveMessageUseCase,
  GetPresentationUseCase,
  GetProjectDetailUseCase,
  GetProjectForTeamUseCase,
  GetStudentQuizUseCase,
  GetVotesUseCase,
  HarvestPlotUseCase,
  ImportStudentsUseCase,
  ListExitTicketsUseCase,
  ListMaterialsForEvaluatorUseCase,
  ListMaterialsForTeacherUseCase,
  ListPendingForRoleUseCase,
  ListProjectsUseCase,
  ListTeamsUseCase,
  MirrorCourseGuidesUseCase,
  PlantSeedUseCase,
  PreviewStudentImportUseCase,
  RandomGroupsUseCase,
  ReadyToPrintUseCase,
  RecordManualVotesUseCase,
  RegisterParticipationUseCase,
  ResolveCommentUseCase,
  ResubmitMaterialUseCase,
  ReviewMaterialUseCase,
  ReviewSubmissionUseCase,
  SaveProjectUseCase,
  SaveSelfPeerAssessmentUseCase,
  SavePresentationUseCase,
  SendMaterialForReviewV2UseCase,
  SetClassScheduleUseCase,
  SubmitConceptQuizUseCase,
  SubmitEvidenceUseCase,
  SubmitExitTicketUseCase,
  SubmitFeedbackUseCase,
  SubmitQuizAttemptUseCase,
  SubmitVoteUseCase,
  TeacherGrantUseCase,
  UpdateMaterialUseCase,
  UpdateTeamUseCase,
  assertCourse,
  isAssignedReviewer,
  type AuthContext,
  type UserDirectoryRepository,
} from "@pclab/application";
import {
  ExcelStudentParser,
  FirestoreActivityRepository,
  FirestoreActivityStatsRepository,
  FirestoreAuditRepository,
  FirestoreBadgeRepository,
  FirestoreClassRepository,
  FirestoreClassScheduleRepository,
  FirestoreConceptQuizRepository,
  FirestoreCourseRepository,
  FirestoreExitTicketRepository,
  FirestoreFarmRepository,
  FirestoreFeedbackRepository,
  FirestoreFlippedProgressRepository,
  FirestoreMaterialRepository,
  FirestoreMessagesRepository,
  FirestoreParticipationRepository,
  FirestorePresentationRepository,
  FirestoreProjectAssessmentRepository,
  FirestoreProjectRepository,
  FirestoreProjectTeamRepository,
  FirestoreProjectionTokenRepository,
  FirestoreQuizAttemptRepository,
  FirestoreQuizRepository,
  FirestoreRubricRepository,
  FirestoreStudentBadgeRepository,
  FirestoreStudentRepository,
  FirestoreSubmissionRepository,
  FirestoreVoteRepository,
  StudentColumnMapper,
  computeActivityXp,
} from "@pclab/infrastructure";
import { buildMaterialDocx, buildMaterialPdf } from "./material-docs";
import { buildMaterialsZip } from "./material-zip";

const app = initializeApp();
const db = getFirestore(app);

const students = new FirestoreStudentRepository(db);
const courses = new FirestoreCourseRepository(db);
const audit = new FirestoreAuditRepository(db);
const parser = new ExcelStudentParser();
const columnDetector = new StudentColumnMapper();
const classes = new FirestoreClassRepository(db);
const schedules = new FirestoreClassScheduleRepository(db);
const progress = new FirestoreFlippedProgressRepository(db);
const quizzes = new FirestoreQuizRepository(db);
const quizAttempts = new FirestoreQuizAttemptRepository(db);
const activities = new FirestoreActivityRepository(db);
const submissions = new FirestoreSubmissionRepository(db);
const exitTickets = new FirestoreExitTicketRepository(db);
const participation = new FirestoreParticipationRepository(db);
const materials = new FirestoreMaterialRepository(db);

const previewUseCase = new PreviewStudentImportUseCase({ parser, columnDetector, students });
const importUseCase = new ImportStudentsUseCase({ students, courses, audit });
const deactivateUseCase = new DeactivateStudentUseCase({ students, audit });
const setScheduleUseCase = new SetClassScheduleUseCase({ classes, schedules, audit });
const getStudentQuizUseCase = new GetStudentQuizUseCase({ quizzes, attempts: quizAttempts });
const submitQuizUseCase = new SubmitQuizAttemptUseCase({ quizzes, attempts: quizAttempts });
const submitEvidenceUseCase = new SubmitEvidenceUseCase({ activities, submissions });
const reviewSubmissionUseCase = new ReviewSubmissionUseCase({ submissions, audit });
const submitExitTicketUseCase = new SubmitExitTicketUseCase({ tickets: exitTickets, activities });
const listExitTicketsUseCase = new ListExitTicketsUseCase({ tickets: exitTickets, activities });
const registerParticipationUseCase = new RegisterParticipationUseCase({ participation });
const getParticipationOverviewUseCase = new GetParticipationOverviewUseCase({ participation });
const getCourseDashboardUseCase = new GetCourseDashboardUseCase({
  students,
  classes,
  flipped: progress,
  submissions,
  exitTickets,
  participation,
});
const getClassDashboardUseCase = new GetClassDashboardUseCase({
  flipped: progress,
  submissions,
  exitTickets,
  participation,
});
const getCalendarAlertsUseCase = new GetCalendarAlertsUseCase({ materials });
const presentationsRepo = new FirestorePresentationRepository(db);
const tokensRepo = new FirestoreProjectionTokenRepository(db);
const votesRepo = new FirestoreVoteRepository(db);
const getPresentationUseCase = new GetPresentationUseCase({ presentations: presentationsRepo, tokens: tokensRepo });
const savePresentationUseCase = new SavePresentationUseCase({ presentations: presentationsRepo, audit });
const createProjectionTokenUseCase = new CreateProjectionTokenUseCase({ tokens: tokensRepo });
const submitVoteUseCase = new SubmitVoteUseCase({ presentations: presentationsRepo, votes: votesRepo });
const recordManualVotesUseCase = new RecordManualVotesUseCase({ presentations: presentationsRepo, votes: votesRepo });
const getVotesUseCase = new GetVotesUseCase({ votes: votesRepo });

// Directorio de usuarios (resuelve evaluador por email desde Auth).
const adminAuth = getAuth();
class AuthUserDirectory implements UserDirectoryRepository {
  async uidByEmail(email: string): Promise<string | null> {
    const user = await adminAuth.getUserByEmail(email).catch(() => null);
    return user?.uid ?? null;
  }
}
const userDirectory = new AuthUserDirectory();

const createMaterialUseCase = new CreateMaterialUseCase({ materials });
const addMaterialVersionUseCase = new AddMaterialVersionUseCase({ materials });
const sendMaterialForReviewV2UseCase = new SendMaterialForReviewV2UseCase({ materials, users: userDirectory, audit });
const listMaterialsForTeacherUseCase = new ListMaterialsForTeacherUseCase({ materials });
const listMaterialsForEvaluatorUseCase = new ListMaterialsForEvaluatorUseCase({ materials });
const getMaterialDetailUseCase = new GetMaterialDetailUseCase({ materials });
const reviewMaterialUseCase = new ReviewMaterialUseCase({ materials, audit });
const generateMaterialUseCase = new GenerateMaterialUseCase({ materials });
const updateMaterialUseCase = new UpdateMaterialUseCase({ materials, audit });
const duplicateMaterialUseCase = new DuplicateMaterialUseCase({ materials, audit });
const mirrorCourseGuidesUseCase = new MirrorCourseGuidesUseCase({ materials, audit });
const archiveMaterialUseCase = new ArchiveMaterialUseCase({ materials, audit });
const approveMaterialUseCase = new ApproveMaterialUseCase({ materials, audit });
const correctMaterialUseCase = new CorrectMaterialUseCase({ materials, audit });
const resubmitMaterialUseCase = new ResubmitMaterialUseCase({ materials, audit });
const readyToPrintUseCase = new ReadyToPrintUseCase({ materials, audit });
const resolveCommentUseCase = new ResolveCommentUseCase({ materials });
const listPendingForRoleUseCase = new ListPendingForRoleUseCase({ materials });
const documentGenerator = {
  buildPdf: (m: Material) => buildMaterialPdf(m),
  buildDocx: (m: Material) => buildMaterialDocx(m),
};
const generateDocumentUseCase = new GenerateDocumentUseCase({ materials, generator: documentGenerator });

const badgesRepo = new FirestoreBadgeRepository(db);
const studentBadgesRepo = new FirestoreStudentBadgeRepository(db);
const messagesRepo = new FirestoreMessagesRepository(db);
const statsRepo = new FirestoreActivityStatsRepository({
  classes,
  flipped: progress,
  submissions,
  participation,
  exitTickets,
  quizzes,
  quizAttempts,
});
const getBadgesForStudentUseCase = new GetBadgesForStudentUseCase({ badges: badgesRepo, studentBadges: studentBadgesRepo, stats: statsRepo });
const evaluateBadgesUseCase = new EvaluateAndAwardBadgesUseCase({ badges: badgesRepo, studentBadges: studentBadgesRepo, stats: statsRepo });
const awardBadgeUseCase = new AwardBadgeUseCase({ badges: badgesRepo, studentBadges: studentBadgesRepo, students, audit });
const getPositiveMessageUseCase = new GetPositiveMessageUseCase({ messages: messagesRepo });

// ── Granja Ciudadana (server-authoritative) ───────────────────
const farmRepo = new FirestoreFarmRepository(db);
const conceptQuizRepo = new FirestoreConceptQuizRepository(db);
const activityXpDeps = {
  classes,
  flipped: progress,
  submissions,
  participation,
  exitTickets,
  quizzes,
  quizAttempts,
  studentBadges: studentBadgesRepo,
};
const getFarmUseCase = new GetFarmUseCase({ farm: farmRepo });
const plantSeedUseCase = new PlantSeedUseCase({ farm: farmRepo });
const harvestPlotUseCase = new HarvestPlotUseCase({ farm: farmRepo });
const buyFarmItemUseCase = new BuyFarmItemUseCase({ farm: farmRepo });
const equipFarmItemUseCase = new EquipFarmItemUseCase({ farm: farmRepo });
const getConceptQuizUseCase = new GetConceptQuizUseCase({ quizzes: conceptQuizRepo });
const submitConceptQuizUseCase = new SubmitConceptQuizUseCase({ quizzes: conceptQuizRepo, farm: farmRepo });
const teacherGrantUseCase = new TeacherGrantUseCase({ farm: farmRepo });

async function farmActivityXp(courseId: string, uid: string): Promise<number> {
  const result = await computeActivityXp(activityXpDeps, courseId, uid);
  return result.activityXp;
}

const feedbackRepo = new FirestoreFeedbackRepository(db);
const submitFeedbackUseCase = new SubmitFeedbackUseCase({ feedback: feedbackRepo });
const getFeedbackTendenciesUseCase = new GetFeedbackTendenciesUseCase({ feedback: feedbackRepo });
const getCourseAnalyticsUseCase = new GetCourseAnalyticsUseCase({
  classes,
  flipped: progress,
  submissions,
  exitTickets,
  participation,
  quizzes,
  quizAttempts,
  students,
});

const teamsRepo = new FirestoreProjectTeamRepository(db);
const projectsRepo = new FirestoreProjectRepository(db);
const assessmentsRepo = new FirestoreProjectAssessmentRepository(db);
const rubricsRepo = new FirestoreRubricRepository(db);
const createTeamUseCase = new CreateTeamUseCase({ teams: teamsRepo, students });
const updateTeamUseCase = new UpdateTeamUseCase({ teams: teamsRepo, students });
const randomGroupsUseCase = new RandomGroupsUseCase({ teams: teamsRepo, students });
const listTeamsUseCase = new ListTeamsUseCase({ teams: teamsRepo });
const saveProjectUseCase = new SaveProjectUseCase({ teams: teamsRepo, projects: projectsRepo });
const listProjectsUseCase = new ListProjectsUseCase({ projects: projectsRepo });
const getProjectForTeamUseCase = new GetProjectForTeamUseCase({ teams: teamsRepo, projects: projectsRepo });
const getProjectDetailUseCase = new GetProjectDetailUseCase({ teams: teamsRepo, projects: projectsRepo, assessments: assessmentsRepo });
const assessProjectUseCase = new AssessProjectUseCase({ projects: projectsRepo, assessments: assessmentsRepo, rubrics: rubricsRepo, audit });
const saveSelfPeerUseCase = new SaveSelfPeerAssessmentUseCase({ teams: teamsRepo, projects: projectsRepo, assessments: assessmentsRepo, rubrics: rubricsRepo });

function actorFrom(context: { auth?: { uid: string; token?: Record<string, unknown> } | null }): AuthContext | null {
  if (!context.auth?.uid) return null;
  return {
    uid: context.auth.uid,
    role: (context.auth.token?.role as string) ?? "",
    courses: ((context.auth.token?.courses as string[]) ?? []),
    isServer: false,
  };
}

function requireAuth(actor: AuthContext | null): void {
  if (!actor?.uid) {
    throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
  }
}

export const previewStudents = onCall(async (request): Promise<ImportPreview> => {
  const actor = actorFrom(request);
  requireAuth(actor);
  rateLimit(actor?.uid ?? "anon", "previewStudents", 30);

  const data = request.data as { fileName?: string; data?: string } | undefined;
  if (!data?.data) throw new HttpsError("invalid-argument", "Falta el contenido del archivo.");

  const bytes = Buffer.from(data.data, "base64");
  return previewUseCase.run(
    { fileName: data.fileName ?? "archivo.xlsx", data: new Uint8Array(bytes) },
    actor,
  );
});

export const importStudents = onCall(async (request): Promise<ImportResult> => {
  const actor = actorFrom(request);
  requireAuth(actor);
  rateLimit(actor?.uid ?? "anon", "importStudents", 10);

  const data = request.data as { rows?: CandidateStudent[]; fileName?: string; year?: number } | undefined;
  if (!data?.rows?.length) throw new HttpsError("invalid-argument", "No hay filas para importar.");

  // El servidor re-valida y re-clasifica; nunca confía en la clasificación del cliente.
  return importUseCase.run(
    { rows: data.rows, fileName: data.fileName, year: data.year },
    actor,
  );
});

export const setStudentActive = onCall(
  async (request): Promise<Student> => {
    const actor = actorFrom(request);
    requireAuth(actor);

    const data = request.data as { courseId?: string; studentId?: string; active?: boolean } | undefined;
    if (!data?.courseId || !data?.studentId || typeof data.active !== "boolean") {
      throw new HttpsError("invalid-argument", "Datos incompletos.");
    }

    return deactivateUseCase.run(
      { courseId: data.courseId, studentId: data.studentId, active: data.active },
      actor,
    );
  },
);

export const setClassSchedule = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);

    const data = request.data as
      | { courseId?: string; classId?: string; status?: ClassStatus; availability?: Partial<ClassAvailability> }
      | undefined;
    if (!data?.courseId || !data?.classId) {
      throw new HttpsError("invalid-argument", "Faltan courseId/classId.");
    }

    return setScheduleUseCase.run(
      { courseId: data.courseId, classId: data.classId, status: data.status, availability: data.availability },
      actor,
    );
  },
);

export const getFlippedOverview = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);

    const data = request.data as { courseId?: string; classId?: string } | undefined;
    if (!data?.courseId || !data?.classId) {
      throw new HttpsError("invalid-argument", "Faltan courseId/classId.");
    }

    const overview = new GetFlippedOverviewUseCase({ students, progress });
    return overview.run(data.courseId, data.classId, actor);
  },
);

export const getQuizForStudent = onCall(
  async (request): Promise<StudentQuiz> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { quizId?: string } | undefined;
    if (!data?.quizId) throw new HttpsError("invalid-argument", "Falta quizId.");
    return getStudentQuizUseCase.run({ quizId: data.quizId, studentId: actor?.uid ?? "" }, actor);
  },
);

export const submitQuizAttempt = onCall(
  async (request): Promise<QuizSubmitResult> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { quizId?: string; answers?: QuizAnswerGiven[] } | undefined;
    if (!data?.quizId || !Array.isArray(data.answers)) {
      throw new HttpsError("invalid-argument", "Datos incompletos.");
    }
    const studentId = actor?.uid ?? "";
    // Intento anterior (para no contar el XP de aprobación dos veces).
    const previous = await quizAttempts.get(data.quizId, studentId).catch(() => null);
    const wasPassing = previous?.status === "SUBMITTED" ? previous : null;
    const attempt = await submitQuizUseCase.run({ quizId: data.quizId, studentId, answers: data.answers }, actor);
    return { attempt, xpAwarded: quizXpAward(wasPassing, attempt) };
  },
);

const LIVE_STATUS = { WAITING: "waiting", PLAYING: "playing", REVEAL: "reveal", ENDED: "ended" } as const;

async function findLiveByCode(code: string): Promise<{ id: string; data: Record<string, unknown> }> {
  const snap = await db.collection("liveQuizzes").where("code", "==", code).limit(1).get();
  if (snap.empty) throw new HttpsError("not-found", "Sesión no encontrada.");
  const doc = snap.docs[0]!;
  return { id: doc.id, data: doc.data() };
}

/** Preguntas completas del quiz para la docente (con respuestas correctas). */
export const getQuizForTeacher = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    if (actor?.role !== "PROFESOR" && actor?.role !== "ADMIN" && actor?.role !== "MASTER") {
      throw new HttpsError("permission-denied", "Rol sin acceso.");
    }
    const data = request.data as { quizId?: string } | undefined;
    if (!data?.quizId) throw new HttpsError("invalid-argument", "Falta quizId.");
    const quiz = await quizzes.getById(data.quizId);
    if (!quiz) throw new HttpsError("not-found", "Quiz no encontrado.");
    assertCourse(actor, quiz.courseId);
    const questions = await quizzes.getQuestions(data.quizId);
    return {
      id: quiz.id,
      title: quiz.title,
      classId: quiz.classId,
      courseId: quiz.courseId,
      questionCount: questions.length,
      questions,
    };
  },
);

/** Crea una sesión de quiz en vivo con código de acceso. */
export const startLiveQuiz = onCall(
  async (request): Promise<{ sessionId: string; code: string }> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    if (actor?.role !== "PROFESOR" && actor?.role !== "ADMIN" && actor?.role !== "MASTER") {
      throw new HttpsError("permission-denied", "Rol sin acceso.");
    }
    const data = request.data as { quizId?: string } | undefined;
    if (!data?.quizId) throw new HttpsError("invalid-argument", "Falta quizId.");
    const quiz = await quizzes.getById(data.quizId);
    if (!quiz) throw new HttpsError("not-found", "Quiz no encontrado.");
    assertCourse(actor, quiz.courseId);
    const questionCount = (await quizzes.getQuestions(data.quizId)).length;

    let code = "";
    for (let i = 0; i < 50; i++) {
      const candidate = String(Math.floor(1000 + Math.random() * 9000));
      const dup = await db.collection("liveQuizzes").where("code", "==", candidate).get();
      if (dup.empty) {
        code = candidate;
        break;
      }
    }
    const now = new Date().toISOString();
    const sessionId = `live-${code}-${Date.now()}`;
    await db.collection("liveQuizzes").doc(sessionId).set({
      code,
      quizId: quiz.id,
      title: quiz.title,
      classId: quiz.classId,
      courseId: quiz.courseId,
      questionCount,
      status: LIVE_STATUS.WAITING,
      currentIndex: -1,
      questionStartedAt: null,
      createdAt: now,
      startedAt: null,
      endedAt: null,
      createdBy: actor?.uid,
    });
    return { sessionId, code };
  },
);

/** Información de la sesión por código (para unirse). */
export const getLiveSessionByCode = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { code?: string } | undefined;
    const code = (data?.code ?? "").trim();
    if (!/^\d{4}$/.test(code)) throw new HttpsError("invalid-argument", "Código inválido.");
    const session = await findLiveByCode(code);
    if (session.data.status === LIVE_STATUS.ENDED) {
      throw new HttpsError("failed-precondition", "La sesión ya terminó.");
    }
    return {
      sessionId: session.id,
      code,
      quizId: session.data.quizId,
      title: session.data.title,
      classId: session.data.classId,
      courseId: session.data.courseId,
      questionCount: session.data.questionCount,
    };
  },
);

/** La estudiante se une a la sesión (registra jugador). */
export const joinLiveQuiz = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { code?: string } | undefined;
    const code = (data?.code ?? "").trim();
    const session = await findLiveByCode(code);
    if (session.data.status === LIVE_STATUS.ENDED) {
      throw new HttpsError("failed-precondition", "La sesión ya terminó.");
    }
    const uid = actor!.uid;
    const now = new Date().toISOString();
    const playerRef = db.collection("liveQuizzes").doc(session.id).collection("players").doc(uid);
    const existing = await playerRef.get();
    if (!existing.exists) {
      let displayName = "Estudiante";
      try {
        const studentSnap = await db.collection("students").where("userId", "==", uid).limit(1).get();
        displayName = (studentSnap.docs[0]?.data()?.displayName as string) ?? "Estudiante";
      } catch {
        // sin perfil: nombre genérico
      }
      await playerRef.set({ uid, displayName, score: 0, correctCount: 0, joinedAt: now });
    }
    return { sessionId: session.id, title: session.data.title, joined: true };
  },
);

/** La estudiante responde la pregunta actual de la sesión en vivo. */
export const submitLiveAnswer = onCall(
  async (request): Promise<{ correct: boolean; points: number; score: number }> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { code?: string; index?: number; given?: number } | undefined;
    const code = (data?.code ?? "").trim();
    const session = await findLiveByCode(code);
    if (session.data.status !== LIVE_STATUS.PLAYING) {
      throw new HttpsError("failed-precondition", "El quiz no está en juego.");
    }
    if (typeof data?.index !== "number" || data.index !== session.data.currentIndex) {
      throw new HttpsError("invalid-argument", "Pregunta no activa.");
    }
    const uid = actor!.uid;
    const qIndex = String(data.index);
     const responseRef = db.collection("liveQuizzes").doc(session.id).collection("responses").doc(qIndex).collection("answers").doc(uid);
    const existing = await responseRef.get();
    if (existing.exists) {
      const d = existing.data()!;
      return { correct: Boolean(d.correct), points: Number(d.points), score: Number(d.score) };
    }

    const questions = await quizzes.getQuestions(session.data.quizId as string);
    const question = questions.sort((a, b) => a.order - b.order)[data.index];
    if (!question) throw new HttpsError("not-found", "Pregunta no encontrada.");
    const correct = typeof data.given === "number" && data.given === question.correctIndex;
    const elapsed = session.data.questionStartedAt
      ? (Date.now() - new Date(session.data.questionStartedAt as string).getTime()) / 1000
      : 0;
    const points = correct ? 100 + Math.max(0, 50 - Math.round(elapsed)) : 0;

    const playerRef = db.collection("liveQuizzes").doc(session.id).collection("players").doc(uid);
    await db.runTransaction(async (tx) => {
      const playerSnap = await tx.get(playerRef);
      const prev = (playerSnap.exists ? playerSnap.data() : { score: 0, correctCount: 0 }) as { score: number; correctCount: number };
      tx.set(responseRef, { uid, given: data.given, correct, points, score: prev.score + points, at: new Date().toISOString() });
      tx.update(playerRef, { score: prev.score + points, correctCount: prev.correctCount + (correct ? 1 : 0) });
    });
    return { correct, points, score: (await playerRef.get()).data()?.score ?? points };
  },
);

/** La docente avanza la sesión: start | next | reveal | end. */
export const advanceLiveQuiz = onCall(
  async (request): Promise<{ ok: boolean }> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    if (actor?.role !== "PROFESOR" && actor?.role !== "ADMIN" && actor?.role !== "MASTER") {
      throw new HttpsError("permission-denied", "Rol sin acceso.");
    }
    const data = request.data as { sessionId?: string; action?: string } | undefined;
    if (!data?.sessionId || !data?.action) throw new HttpsError("invalid-argument", "Faltan datos.");
    const ref = db.collection("liveQuizzes").doc(data.sessionId);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "Sesión no encontrada.");
    const session = snap.data()!;
    assertCourse(actor, session.courseId as string);
    const now = new Date().toISOString();
    const action = data.action as "start" | "next" | "reveal" | "end";

    if (action === "start") {
      await ref.update({ status: LIVE_STATUS.PLAYING, currentIndex: 0, questionStartedAt: now, startedAt: session.startedAt ?? now });
    } else if (action === "next") {
      const next = (session.currentIndex as number) + 1;
      const count = (session.questionCount as number) ?? 0;
      if (next >= count) throw new HttpsError("failed-precondition", "No hay más preguntas.");
      await ref.update({ status: LIVE_STATUS.PLAYING, currentIndex: next, questionStartedAt: now });
    } else if (action === "reveal") {
      await ref.update({ status: LIVE_STATUS.REVEAL });
    } else if (action === "end") {
      await ref.update({ status: LIVE_STATUS.ENDED, endedAt: now });
    } else {
      throw new HttpsError("invalid-argument", "Acción inválida.");
    }
    return { ok: true };
  },
);

/** Pregunta actual para la estudiante (sin respuestas correctas). */
export const getLiveQuestion = onCall(
  async (request): Promise<{ prompt: string; options: string[]; type: string; index: number }> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { code?: string; index?: number } | undefined;
    const code = (data?.code ?? "").trim();
    const session = await findLiveByCode(code);
    if (typeof data?.index !== "number") throw new HttpsError("invalid-argument", "Falta índice.");
    const questions = await quizzes.getQuestions(session.data.quizId as string);
    const question = questions.sort((a, b) => a.order - b.order)[data.index];
    if (!question) throw new HttpsError("not-found", "Pregunta no encontrada.");
    return { prompt: question.prompt, options: question.options ?? [], type: question.type, index: data.index };
  },
);

export const submitEvidence = onCall(
  async (request): Promise<Submission> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as
      | { activityId?: string; classId?: string; courseId?: string; content?: Submission["content"]; attachments?: EvidenceAttachment[] }
      | undefined;
    if (!data?.activityId || !data?.classId || !data?.courseId) {
      throw new HttpsError("invalid-argument", "Datos incompletos.");
    }
    return submitEvidenceUseCase.run(
      {
        activityId: data.activityId,
        classId: data.classId,
        courseId: data.courseId,
        studentId: actor?.uid ?? "",
        content: data.content ?? {},
        attachments: data.attachments,
      },
      actor,
    );
  },
);

export const reviewSubmission = onCall(
  async (request): Promise<Submission> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "reviewSubmission", 60);
    const data = request.data as
      | { submissionId?: string; courseId?: string; status?: SubmissionStatus; score?: number | null; teacherFeedback?: string }
      | undefined;
    if (!data?.submissionId || !data?.courseId) {
      throw new HttpsError("invalid-argument", "Faltan datos.");
    }
    return reviewSubmissionUseCase.run(
      {
        submissionId: data.submissionId,
        courseId: data.courseId,
        status: data.status,
        score: data.score,
        teacherFeedback: data.teacherFeedback,
      },
      actor,
    );
  },
);

export const submitExitTicket = onCall(
  async (request): Promise<ExitTicket> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as
      | { classId?: string; courseId?: string; answers?: ExitTicket["answers"]; difficulty?: number }
      | undefined;
    if (!data?.classId || !data?.courseId || !data?.answers) {
      throw new HttpsError("invalid-argument", "Datos incompletos.");
    }
    return submitExitTicketUseCase.run(
      {
        classId: data.classId,
        courseId: data.courseId,
        studentId: actor?.uid ?? "",
        answers: data.answers,
        difficulty: data.difficulty ?? 3,
      },
      actor,
    );
  },
);

export const listExitTickets = onCall(
  async (request): Promise<ExitTicket[]> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string; classId?: string } | undefined;
    if (!data?.courseId || !data?.classId) throw new HttpsError("invalid-argument", "Faltan datos.");
    return listExitTicketsUseCase.run(data.courseId, data.classId, actor);
  },
);

export const registerParticipation = onCall(
  async (request): Promise<{ saved: number }> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "registerParticipation", 120);
    const data = request.data as
      | { courseId?: string; classId?: string; entries?: { studentId: string; skill: string; level: number; note?: string }[] }
      | undefined;
    if (!data?.courseId || !data?.classId || !Array.isArray(data.entries)) {
      throw new HttpsError("invalid-argument", "Datos incompletos.");
    }
    const saved = await registerParticipationUseCase.run(
      { courseId: data.courseId, classId: data.classId, entries: data.entries },
      actor,
    );
    await audit.log({
      userId: actor?.uid ?? "server",
      action: "PARTICIPATION_REGISTERED",
      entity: "participation",
      courseId: data.courseId,
      timestamp: new Date().toISOString(),
      metadata: { classId: data.classId, saved },
    });
    return { saved };
  },
);

export const getParticipationOverview = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string; classId?: string } | undefined;
    if (!data?.courseId || !data?.classId) throw new HttpsError("invalid-argument", "Faltan datos.");
    return getParticipationOverviewUseCase.run(data.courseId, data.classId, actor);
  },
);

export const getCourseDashboard = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string } | undefined;
    if (!data?.courseId) throw new HttpsError("invalid-argument", "Falta courseId.");
    return getCourseDashboardUseCase.run(data.courseId, actor);
  },
);

export const getClassDashboard = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string; classId?: string } | undefined;
    if (!data?.courseId || !data?.classId) throw new HttpsError("invalid-argument", "Faltan datos.");
    return getClassDashboardUseCase.run(data.courseId, data.classId, actor);
  },
);

export const getCalendarAlerts = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string } | undefined;
    if (!data?.courseId) throw new HttpsError("invalid-argument", "Falta courseId.");
    return getCalendarAlertsUseCase.run(data.courseId, actor);
  },
);

export const getPresentation = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    const data = request.data as { classId?: string; tokenId?: string } | undefined;
    if (!data?.classId) throw new HttpsError("invalid-argument", "Falta classId.");
    return getPresentationUseCase.run({ classId: data.classId, tokenId: data.tokenId }, actor);
  },
);

export const savePresentation = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { classId?: string; courseId?: string; slides?: unknown[]; config?: unknown } | undefined;
    if (!data?.classId || !data?.courseId || !Array.isArray(data.slides)) {
      throw new HttpsError("invalid-argument", "Datos incompletos.");
    }
    return savePresentationUseCase.run(
      { classId: data.classId, courseId: data.courseId, slides: data.slides as never, config: data.config as never },
      actor,
    );
  },
);

export const createProjectionToken = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "createProjectionToken", 30);
    const data = request.data as { classId?: string; courseId?: string } | undefined;
    if (!data?.classId || !data?.courseId) throw new HttpsError("invalid-argument", "Faltan datos.");
    return createProjectionTokenUseCase.run({ classId: data.classId, courseId: data.courseId }, actor);
  },
);

export const submitVote = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { classId?: string; questionId?: string; option?: number } | undefined;
    if (!data?.classId || !data?.questionId || typeof data.option !== "number") {
      throw new HttpsError("invalid-argument", "Datos incompletos.");
    }
    return submitVoteUseCase.run({ classId: data.classId, questionId: data.questionId, option: data.option }, actor);
  },
);

export const recordManualVotes = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { classId?: string; questionId?: string; counts?: Record<string, number> } | undefined;
    if (!data?.classId || !data?.questionId || !data?.counts) {
      throw new HttpsError("invalid-argument", "Datos incompletos.");
    }
    return recordManualVotesUseCase.run({ classId: data.classId, questionId: data.questionId, counts: data.counts }, actor);
  },
);

export const getVotes = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { classId?: string; questionId?: string } | undefined;
    if (!data?.classId || !data?.questionId) throw new HttpsError("invalid-argument", "Faltan datos.");
    return getVotesUseCase.run({ classId: data.classId, questionId: data.questionId }, actor);
  },
);

export const createMaterial = onCall(
  async (request): Promise<Material> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as Partial<Parameters<CreateMaterialUseCase["run"]>[0]> | undefined;
    if (!data?.courseId || !data?.type || !data?.title) throw new HttpsError("invalid-argument", "Datos incompletos.");
    const material = await createMaterialUseCase.run(
      { courseId: data.courseId, type: data.type, title: data.title, classId: data.classId, hasDUA: data.hasDUA ?? false, oaIds: data.oaIds, printDeadline: data.printDeadline, reviewDeadline: data.reviewDeadline },
      actor,
    );
    await audit.log({
      userId: actor?.uid ?? "server",
      action: "MATERIAL_CREATED",
      entity: "materials",
      entityId: material.id,
      courseId: material.courseId,
      timestamp: new Date().toISOString(),
      metadata: { type: material.type },
    });
    return material;
  },
);

export const addMaterialVersion = onCall(
  async (request): Promise<MaterialVersion> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as Partial<Parameters<AddMaterialVersionUseCase["run"]>[0]> | undefined;
    if (!data?.materialId || !data?.courseId || !data?.kind || !data?.fileName) {
      throw new HttpsError("invalid-argument", "Datos incompletos.");
    }
    return addMaterialVersionUseCase.run(
      { materialId: data.materialId, courseId: data.courseId, kind: data.kind as never, fileName: data.fileName, mime: data.mime, size: data.size, url: data.url, storagePath: data.storagePath, note: data.note },
      actor,
    );
  },
);

export const sendMaterialForReview = onCall(
  async (request): Promise<Material> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "sendMaterialForReview", 30);
    const data = request.data as { materialId?: string; courseId?: string; evaluatorEmail?: string; pieEmail?: string; utpEmail?: string } | undefined;
    if (!data?.materialId || !data?.courseId || !data?.evaluatorEmail) throw new HttpsError("invalid-argument", "Datos incompletos.");
    return sendMaterialForReviewV2UseCase.run(
      { materialId: data.materialId, courseId: data.courseId, evaluatorEmail: data.evaluatorEmail, pieEmail: data.pieEmail, utpEmail: data.utpEmail },
      actor,
    );
  },
);

export const listMaterialsForTeacher = onCall(
  async (request): Promise<Material[]> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string } | undefined;
    if (!data?.courseId) throw new HttpsError("invalid-argument", "Falta courseId.");
    return listMaterialsForTeacherUseCase.run(data.courseId, actor);
  },
);

export const listMaterialsForEvaluator = onCall(
  async (request): Promise<Material[]> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    return listMaterialsForEvaluatorUseCase.run(actor);
  },
);

export const getMaterialDetail = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { materialId?: string } | undefined;
    if (!data?.materialId) throw new HttpsError("invalid-argument", "Falta materialId.");
    return getMaterialDetailUseCase.run(data.materialId, actor);
  },
);

export const reviewMaterial = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "reviewMaterial", 30);
    const data = request.data as { materialId?: string; courseId?: string; status?: string; comment?: string } | undefined;
    if (!data?.materialId || !data?.courseId || !data?.status || !data?.comment) {
      throw new HttpsError("invalid-argument", "Datos incompletos.");
    }
    return reviewMaterialUseCase.run({ materialId: data.materialId, courseId: data.courseId, status: data.status as never, comment: data.comment }, actor);
  },
);

export const generateMaterial = onCall(
  async (request): Promise<Material> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "generateMaterial", 60);
    const data = request.data as Parameters<GenerateMaterialUseCase["run"]>[0] | undefined;
    if (!data?.courseId || !data?.type || !data?.title) throw new HttpsError("invalid-argument", "Datos incompletos.");
    return generateMaterialUseCase.run(
      { ...data, classDate: data.classDate ?? null },
      actor,
    );
  },
);

export const updateMaterial = onCall(
  async (request): Promise<Material> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "updateMaterial", 60);
    const data = request.data as Parameters<UpdateMaterialUseCase["run"]>[0] | undefined;
    if (!data?.materialId || !data?.courseId) throw new HttpsError("invalid-argument", "Faltan datos.");
    return updateMaterialUseCase.run(data, actor);
  },
);

export const duplicateMaterial = onCall(
  async (request): Promise<Material> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "duplicateMaterial", 30);
    const data = request.data as Parameters<DuplicateMaterialUseCase["run"]>[0] | undefined;
    if (!data?.materialId || !data?.courseId) throw new HttpsError("invalid-argument", "Faltan datos.");
    return duplicateMaterialUseCase.run(data, actor);
  },
);

/** Copia las guías de un curso a otro (3D → 3E) conservando contenido y clase. */
export const mirrorCourseGuides = onCall(
  async (request): Promise<{ copied: number; skipped: number }> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "mirrorCourseGuides", 20);
    const data = request.data as Parameters<MirrorCourseGuidesUseCase["run"]>[0] | undefined;
    if (!data?.sourceCourseId || !data?.targetCourseId) throw new HttpsError("invalid-argument", "Faltan cursos.");
    return mirrorCourseGuidesUseCase.run(
      { sourceCourseId: data.sourceCourseId, targetCourseId: data.targetCourseId },
      actor,
    );
  },
);

export const archiveMaterial = onCall(
  async (request): Promise<Material> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "archiveMaterial", 30);
    const data = request.data as { materialId?: string; courseId?: string } | undefined;
    if (!data?.materialId || !data?.courseId) throw new HttpsError("invalid-argument", "Faltan datos.");
    return archiveMaterialUseCase.run({ materialId: data.materialId, courseId: data.courseId }, actor);
  },
);

export const approveMaterial = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "approveMaterial", 60);
    const data = request.data as { materialId?: string; courseId?: string; decision?: string; comment?: string; section?: string } | undefined;
    if (!data?.materialId || !data?.courseId || !data?.decision || !data?.comment) {
      throw new HttpsError("invalid-argument", "Datos incompletos.");
    }
    return approveMaterialUseCase.run(
      { materialId: data.materialId, courseId: data.courseId, decision: data.decision as never, comment: data.comment, section: data.section },
      actor,
    );
  },
);

export const correctMaterial = onCall(
  async (request): Promise<Material> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "correctMaterial", 60);
    const data = request.data as { materialId?: string; courseId?: string; content?: unknown; changeSummary?: string } | undefined;
    if (!data?.materialId || !data?.courseId || !data?.content) throw new HttpsError("invalid-argument", "Datos incompletos.");
    return correctMaterialUseCase.run(
      { materialId: data.materialId, courseId: data.courseId, content: data.content as never, changeSummary: data.changeSummary ?? "" },
      actor,
    );
  },
);

export const resubmitMaterial = onCall(
  async (request): Promise<Material> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "resubmitMaterial", 30);
    const data = request.data as { materialId?: string; courseId?: string } | undefined;
    if (!data?.materialId || !data?.courseId) throw new HttpsError("invalid-argument", "Faltan datos.");
    return resubmitMaterialUseCase.run({ materialId: data.materialId, courseId: data.courseId }, actor);
  },
);

export const readyToPrint = onCall(
  async (request): Promise<Material> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "readyToPrint", 30);
    const data = request.data as { materialId?: string; courseId?: string } | undefined;
    if (!data?.materialId || !data?.courseId) throw new HttpsError("invalid-argument", "Faltan datos.");
    return readyToPrintUseCase.run({ materialId: data.materialId, courseId: data.courseId }, actor);
  },
);

export const resolveComment = onCall(
  async (request): Promise<{ ok: boolean }> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { materialId?: string; commentId?: string } | undefined;
    if (!data?.materialId || !data?.commentId) throw new HttpsError("invalid-argument", "Faltan datos.");
    await resolveCommentUseCase.run({ materialId: data.materialId, commentId: data.commentId }, actor);
    return { ok: true };
  },
);

export const listPendingMaterials = onCall(
  async (request): Promise<Material[]> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string } | undefined;
    return listPendingForRoleUseCase.run(data?.courseId, actor);
  },
);

export const downloadMaterial = onCall(
  async (request): Promise<{ buffer: string; mime: string; fileName: string }> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "downloadMaterial", 60);
    const data = request.data as { materialId?: string; kind?: string } | undefined;
    if (!data?.materialId || !data?.kind) throw new HttpsError("invalid-argument", "Faltan datos.");
    const result = await generateDocumentUseCase.run({ materialId: data.materialId, kind: data.kind as "PDF" | "DOCX" }, actor);
    const base64 = Buffer.from(result.buffer).toString("base64");
    return { buffer: base64, mime: result.mime, fileName: result.fileName };
  },
);

/** Tipos de material que una estudiante puede leer/descargar (guías de trabajo). */
const STUDENT_GUIDE_TYPES = new Set(["GUIDE", "WORKSHEET", "READING", "PRACTICAL_WORK", "PROJECT", "SUPPORT_MATERIAL"]);

function findStudentGuide(all: Material[], courseId: string, classId: string, materialId?: string): Material | null {
  const candidates = all.filter(
    (m) =>
      m.courseId === courseId &&
      m.classId === classId &&
      !m.parentMaterialId &&
      m.status !== MATERIAL_STATUS.ARCHIVED &&
      STUDENT_GUIDE_TYPES.has(m.type),
  );
  if (materialId) {
    return candidates.find((m) => m.id === materialId) ?? null;
  }
  return (
    candidates.find((m) => m.type === "GUIDE") ??
    candidates.find((m) => m.type === "WORKSHEET") ??
    candidates.find((m) => m.type === "PRACTICAL_WORK") ??
    candidates[0] ??
    null
  );
}

/** Guía de trabajo de una misión para la estudiante (contenido en la app, sin evaluaciones ni solucionarios). */
export const getStudentGuide = onCall(
  async (request): Promise<{ material: Material | null }> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "getStudentGuide", 60);
    const data = request.data as { courseId?: string; classId?: string } | undefined;
    if (!data?.courseId || !data?.classId) throw new HttpsError("invalid-argument", "Faltan datos.");
    if (actor?.role === "ESTUDIANTE") assertCourse(actor, data.courseId);
    const all = await materials.listByCourse(data.courseId);
    const material = findStudentGuide(all, data.courseId, data.classId);
    if (!material) return { material: null };
    const safe: Material = {
      ...material,
      content: {
        curricular: material.content?.curricular,
        sections: material.content?.sections ?? [],
        items: material.content?.items ?? [],
      },
    };
    return { material: safe };
  },
);

/** Descarga (PDF/DOCX) de la guía de trabajo de la misión, segura para estudiantes. */
export const downloadStudentGuide = onCall(
  async (request): Promise<{ buffer: string; mime: string; fileName: string }> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "downloadStudentGuide", 30);
    const data = request.data as { courseId?: string; classId?: string; materialId?: string; kind?: string } | undefined;
    if (!data?.courseId || !data?.classId || !data?.materialId) throw new HttpsError("invalid-argument", "Faltan datos.");
    if (actor?.role === "ESTUDIANTE") assertCourse(actor, data.courseId);
    const kind = data.kind === "DOCX" ? "DOCX" : "PDF";
    const all = await materials.listByCourse(data.courseId);
    const material = findStudentGuide(all, data.courseId, data.classId, data.materialId);
    if (!material) throw new HttpsError("not-found", "Guía no encontrada.");
    const build = kind === "DOCX" ? buildMaterialDocx : buildMaterialPdf;
    const result = await build(material);
    return { buffer: Buffer.from(result.buffer).toString("base64"), mime: result.mime, fileName: result.fileName };
  },
);

// ---------------------------------------------------------------------------
// Presencia en vivo y seguimiento en tiempo real del curso (docente).
// ---------------------------------------------------------------------------

/** Latido de la estudiante: registra que está conectada ahora en su curso. */
export const studentHeartbeat = onCall(
  async (request): Promise<{ ok: boolean }> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    if (actor?.role !== "ESTUDIANTE") throw new HttpsError("permission-denied", "Solo estudiantes.");
    const data = request.data as { courseId?: string } | undefined;
    const courseId = data?.courseId ?? "";
    if (!courseId) throw new HttpsError("invalid-argument", "Falta curso.");
    if (actor.courses.length > 0 && !actor.courses.includes(courseId)) {
      throw new HttpsError("permission-denied", "Curso incorrecto.");
    }
    let displayName = "Estudiante";
    try {
      const snap = await db.collection("students").where("userId", "==", actor!.uid).limit(1).get();
      if (!snap.empty) displayName = (snap.docs[0]!.data()?.displayName as string) ?? "Estudiante";
    } catch {
      // sin perfil: nombre genérico
    }
    await db
      .collection("presence")
      .doc(courseId)
      .collection("students")
      .doc(actor!.uid)
      .set({ studentId: actor!.uid, courseId, displayName, lastSeen: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true };
  },
);

interface LiveSnapshotRow {
  studentId: string;
  name: string;
  active: boolean;
  lastSeenAt: string | null;
  flippedReady: number;
  submissionsToday: number;
  submissionsTotal: number;
  quizzesToday: number;
  quizzesTotal: number;
  ticketsToday: number;
  ticketsTotal: number;
}

/** Resumen en tiempo real del curso: presencia, avance y promedios (activos vs totales). */
export const getLiveCourseSnapshot = onCall(
  async (request): Promise<{
    courseId: string;
    generatedAt: string;
    activeSeconds: number;
    totalStudents: number;
    activeNow: number;
    pendingReviews: number;
    totalsToday: { flippedReady: number; submissions: number; quizzes: number; exitTickets: number };
    averages: {
      flippedReady: { active: number; total: number };
      submissionsToday: { active: number; total: number };
      quizzesToday: { active: number; total: number };
      ticketsToday: { active: number; total: number };
    };
    students: LiveSnapshotRow[];
  }> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "getLiveCourseSnapshot", 20);
    const data = request.data as { courseId?: string; activeSeconds?: number } | undefined;
    if (!data?.courseId) throw new HttpsError("invalid-argument", "Falta curso.");
    assertCourse(actor, data.courseId);
    const resolvedCourse = data.courseId as string;
    const activeSeconds = Math.min(600, Math.max(60, Number(data.activeSeconds) || 120));
    const now = new Date();
    const nowMs = now.getTime();
    const today = now.toISOString().slice(0, 10);

    const [studentList, catalog, presenceSnap] = await Promise.all([
      students.findByCourse(resolvedCourse),
      classes.listAll(),
      db.collection("presence").doc(resolvedCourse).collection("students").get(),
    ]);
    const presence = new Map<string, number>();
    for (const doc of presenceSnap.docs) {
      const value = doc.data()?.lastSeen as { toDate?: () => Date } | number | string | undefined;
      let ms = 0;
      if (value && typeof value === "object" && typeof value.toDate === "function") ms = value.toDate().getTime();
      else if (typeof value === "number") ms = value;
      else if (typeof value === "string") ms = Date.parse(value) || 0;
      if (ms > 0) presence.set(doc.id, ms);
    }

    const base = (): Omit<LiveSnapshotRow, "studentId" | "name" | "active" | "lastSeenAt"> => ({
      flippedReady: 0,
      submissionsToday: 0,
      submissionsTotal: 0,
      quizzesToday: 0,
      quizzesTotal: 0,
      ticketsToday: 0,
      ticketsTotal: 0,
    });
    const stats = new Map<string, ReturnType<typeof base>>();
    for (const s of studentList) stats.set(s.id, base());

    let pendingReviews = 0;

    const classResults = await Promise.all(
      catalog.map(async (cls) => {
        const [flippedList, subs, tickets] = await Promise.all([
          progress.listByClass(resolvedCourse, cls.id),
          submissions.listByClass(resolvedCourse, cls.id),
          exitTickets.listByClass(resolvedCourse, cls.id),
        ]);
        for (const f of flippedList) {
          const row = stats.get(f.studentId);
          if (row) row.flippedReady += f.ready ? 1 : 0;
        }
        for (const s of subs) {
          const row = stats.get(s.studentId);
          if (row) {
            row.submissionsTotal += 1;
            const day = (s.submittedAt ?? s.updatedAt ?? "").slice(0, 10);
            if (day === today) row.submissionsToday += 1;
          }
          if (s.status === "ENTREGADO") pendingReviews += 1;
        }
        for (const t of tickets) {
          const row = stats.get(t.studentId);
          if (row) {
            row.ticketsTotal += 1;
            if ((t.submittedAt ?? "").slice(0, 10) === today) row.ticketsToday += 1;
          }
        }
        return { cls, quizzes: await quizzes.listByClass(cls.id) };
      }),
    );

    for (const result of classResults) {
      for (const quiz of result.quizzes) {
        const attempts = await quizAttempts.listByQuiz(quiz.id);
        for (const a of attempts) {
          const row = stats.get(a.studentId);
          if (!row) continue;
          if (a.status === "SUBMITTED") {
            row.quizzesTotal += 1;
            if ((a.submittedAt ?? "").slice(0, 10) === today) row.quizzesToday += 1;
          }
        }
      }
    }

    const rows: LiveSnapshotRow[] = [];
    for (const s of studentList) {
      const st = stats.get(s.id) ?? base();
      const lastMs = presence.get(s.id) ?? 0;
      const active = lastMs > 0 && nowMs - lastMs <= activeSeconds * 1000;
      rows.push({
        studentId: s.id,
        name: s.displayName,
        active,
        lastSeenAt: lastMs > 0 ? new Date(lastMs).toISOString() : null,
        ...st,
      });
    }

    const activeRows = rows.filter((r) => r.active);
    const avg = (rowsAll: LiveSnapshotRow[], pick: (r: LiveSnapshotRow) => number): number =>
      rowsAll.length ? Math.round((rowsAll.reduce((a, r) => a + pick(r), 0) / rowsAll.length) * 100) / 100 : 0;

    const totalsToday = {
      flippedReady: rows.reduce((a, r) => a + r.flippedReady, 0),
      submissions: rows.reduce((a, r) => a + r.submissionsToday, 0),
      quizzes: rows.reduce((a, r) => a + r.quizzesToday, 0),
      exitTickets: rows.reduce((a, r) => a + r.ticketsToday, 0),
    };

    return {
      courseId: resolvedCourse,
      generatedAt: now.toISOString(),
      activeSeconds,
      totalStudents: rows.length,
      activeNow: activeRows.length,
      pendingReviews,
      totalsToday,
      averages: {
        flippedReady: { active: avg(activeRows, (r) => r.flippedReady), total: avg(rows, (r) => r.flippedReady) },
        submissionsToday: { active: avg(activeRows, (r) => r.submissionsToday), total: avg(rows, (r) => r.submissionsToday) },
        quizzesToday: { active: avg(activeRows, (r) => r.quizzesToday), total: avg(rows, (r) => r.quizzesToday) },
        ticketsToday: { active: avg(activeRows, (r) => r.ticketsToday), total: avg(rows, (r) => r.ticketsToday) },
      },
      students: rows.sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name)),
    };
  },
);

export const downloadAllMaterials = onCall(
  { timeoutSeconds: 300, memory: "1GiB" },
  async (request): Promise<{ buffer: string; mime: string; fileName: string }> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "downloadAllMaterials", 20);
    const data = request.data as { courseId?: string; kind?: string } | undefined;
    if (!data?.courseId || !data?.kind) throw new HttpsError("invalid-argument", "Faltan datos.");
    const kind = data.kind === "DOCX" ? "DOCX" : "PDF";
    const role = actor?.role ?? "";
    if (role === "PROFESOR" || role === "ADMIN" || role === "MASTER") {
      assertCourse(actor, data.courseId);
    } else if (role !== "EVALUADOR" && role !== "PIE" && role !== "UTP") {
      throw new HttpsError("permission-denied", "Rol sin acceso a materiales.");
    }
    const all = await materials.listByCourse(data.courseId);
    const visible = all.filter(
      (m) =>
        m.status !== MATERIAL_STATUS.ARCHIVED &&
        (role === "PROFESOR" || role === "ADMIN" || role === "MASTER" || isAssignedReviewer(m, role as "EVALUADOR" | "PIE" | "UTP", actor?.uid ?? "")),
    );
    if (visible.length === 0) throw new HttpsError("not-found", "No hay materiales disponibles en este curso.");
    const result = await buildMaterialsZip(visible, kind, data.courseId);
    return { buffer: result.buffer.toString("base64"), mime: "application/zip", fileName: result.fileName };
  },
);

/** Opciones de inicio de sesión para estudiantes (HTTP público: solo nombres y correos de login). */
export const listStudentLoginOptions = onRequest(
  { cors: true, memory: "256MiB", timeoutSeconds: 60 },
  async (_req, res) => {
    try {
      const [coursesSnap, studentsSnap] = await Promise.all([
        db.collection("courses").where("active", "==", true).get(),
        db.collection("students").where("active", "==", true).get(),
      ]);
      const courses = coursesSnap.docs
        .map((d) => {
          const data = d.data();
          return { id: d.id, name: (data.name as string) ?? d.id };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      const students = studentsSnap.docs
        .map((d) => {
          const data = d.data();
          return {
            courseId: data.courseId as string,
            name: (data.displayName as string) ?? "",
            email: (data.authEmail as string) ?? "",
            listNumber: data.listNumber as number | undefined,
          };
        })
        .filter((s) => s.name && s.email)
        .sort((a, b) => a.courseId.localeCompare(b.courseId) || a.name.localeCompare(b.name));
      res.set("Cache-Control", "public, max-age=60");
      res.json({ courses, students });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message ?? "Error interno." });
    }
  },
);

export const getBadgesForStudent = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string; studentId?: string } | undefined;
    if (!data?.courseId || !data?.studentId) throw new HttpsError("invalid-argument", "Faltan datos.");
    return getBadgesForStudentUseCase.run({ courseId: data.courseId, studentId: data.studentId }, actor);
  },
);

export const evaluateBadges = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string; studentId?: string } | undefined;
    if (!data?.courseId || !data?.studentId) throw new HttpsError("invalid-argument", "Faltan datos.");
    return evaluateBadgesUseCase.run({ courseId: data.courseId, studentId: data.studentId }, actor);
  },
);

export const awardBadge = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "awardBadge", 30);
    const data = request.data as { courseId?: string; studentId?: string; badgeId?: string } | undefined;
    if (!data?.courseId || !data?.studentId || !data?.badgeId) throw new HttpsError("invalid-argument", "Faltan datos.");
    return awardBadgeUseCase.run({ courseId: data.courseId, studentId: data.studentId, badgeId: data.badgeId }, actor);
  },
);

/** Gamificación de la estudiante: XP, nivel, racha y estrellas de la semana. */
export const getStudentGamification = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string; studentId?: string } | undefined;
    if (!data?.courseId || !data?.studentId) throw new HttpsError("invalid-argument", "Faltan datos.");
    if (actor?.role === "ESTUDIANTE" && actor.uid !== data.studentId) {
      throw new HttpsError("permission-denied", "Solo puedes ver tu propia gamificación.");
    }
    assertCourse(actor, data.courseId);

    const student = await students.getById(data.studentId);
    const uid = student?.userId ?? data.studentId;
    const [activity, allBadges, farm] = await Promise.all([
      computeActivityXp(activityXpDeps, data.courseId, uid),
      badgesRepo.listAll(),
      farmRepo.get(uid),
    ]);

    const bonusXp = farm?.bonusXp ?? 0;
    const xpParts: Record<string, number> = { ...activity.xpParts, farm: bonusXp };
    const xp = activity.activityXp + bonusXp;
    const level = Math.floor(xp / 150) + 1;
    const inLevel = xp % 150;
    // El progreso para pasar de nivel nunca supera el 100%.
    const progressToNext = Math.min(100, Math.round((inLevel / 150) * 100));

    // Racha: días consecutivos terminando hoy (o en el día más reciente).
    const days = [...activity.activityDays].sort().reverse();
    let streak = 0;
    if (days.length > 0) {
      const today = new Date().toISOString().slice(0, 10);
      const cursor = days[0] === today ? new Date() : new Date(days[0] + "T00:00:00");
      if (days.includes(cursor.toISOString().slice(0, 10))) {
        while (days.includes(cursor.toISOString().slice(0, 10))) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
        }
      }
    }

    // Estrellas de la semana: días con actividad en la semana actual (lunes a domingo).
    const now = new Date();
    const dayIdx = (now.getDay() + 6) % 7; // lunes=0
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayIdx);
    let weeklyStars = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      if (activity.activityDays.includes(d.toISOString().slice(0, 10))) weeklyStars++;
    }

    return {
      xp,
      level,
      progressToNext,
      streak,
      weeklyStars,
      breakdown: xpParts,
      badges: activity.badgesEarned,
      totalBadges: allBadges.length,
      bonusXp,
      unlockedAvatarStyles: farm?.unlockedAvatarStyles ?? [],
    };
  },
);

/** Granja Ciudadana: obtiene (o crea) la granja de la estudiante. */
export const getFarm = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string; studentId?: string } | undefined;
    if (!data?.courseId) throw new HttpsError("invalid-argument", "Faltan datos.");
    assertCourse(actor, data.courseId);
    const studentId = data.studentId ?? actor?.uid ?? "";
    const student = await students.getById(studentId);
    const uid = student?.userId ?? studentId;
    const activityXp = await farmActivityXp(data.courseId, uid);
    return getFarmUseCase.run({ studentId: uid, activityXp }, actor);
  },
);

export const plantSeed = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string; plotIndex?: number; cropId?: string } | undefined;
    if (!data?.courseId || data.plotIndex === undefined || !data.cropId) {
      throw new HttpsError("invalid-argument", "Faltan datos.");
    }
    if (!actor || actor.isServer) throw new HttpsError("unauthenticated", "Sesión requerida.");
    assertCourse(actor, data.courseId);
    rateLimit(actor.uid, "plantSeed", 240);
    return plantSeedUseCase.run({ studentId: actor.uid, plotIndex: data.plotIndex, cropId: data.cropId }, actor);
  },
);

export const harvestPlot = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string; plotIndex?: number } | undefined;
    if (!data?.courseId || data.plotIndex === undefined) {
      throw new HttpsError("invalid-argument", "Faltan datos.");
    }
    if (!actor || actor.isServer) throw new HttpsError("unauthenticated", "Sesión requerida.");
    assertCourse(actor, data.courseId);
    rateLimit(actor.uid, "harvestPlot", 240);
    return harvestPlotUseCase.run({ studentId: actor.uid, plotIndex: data.plotIndex }, actor);
  },
);

export const buyFarmItem = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string; itemId?: string } | undefined;
    if (!data?.courseId || !data.itemId) throw new HttpsError("invalid-argument", "Faltan datos.");
    if (!actor || actor.isServer) throw new HttpsError("unauthenticated", "Sesión requerida.");
    assertCourse(actor, data.courseId);
    rateLimit(actor.uid, "buyFarmItem", 60);
    return buyFarmItemUseCase.run({ studentId: actor.uid, itemId: data.itemId }, actor);
  },
);

export const equipFarmItem = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string; itemId?: string } | undefined;
    if (!data?.courseId || !data.itemId) throw new HttpsError("invalid-argument", "Faltan datos.");
    if (!actor || actor.isServer) throw new HttpsError("unauthenticated", "Sesión requerida.");
    assertCourse(actor, data.courseId);
    return equipFarmItemUseCase.run({ studentId: actor.uid, itemId: data.itemId }, actor);
  },
);

/** Quiz de conceptos clave por nivel. */
export const getConceptQuiz = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { level?: number } | undefined;
    if (typeof data?.level !== "number") throw new HttpsError("invalid-argument", "Falta el nivel.");
    return getConceptQuizUseCase.run({ level: data.level }, actor);
  },
);

export const submitConceptQuiz = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as
      | { courseId?: string; level?: number; answers?: { id: string; given: number }[] }
      | undefined;
    if (!data?.courseId || typeof data.level !== "number" || !Array.isArray(data.answers)) {
      throw new HttpsError("invalid-argument", "Faltan datos.");
    }
    if (!actor || actor.isServer) throw new HttpsError("unauthenticated", "Sesión requerida.");
    assertCourse(actor, data.courseId);
    rateLimit(actor.uid, "submitConceptQuiz", 60);
    return submitConceptQuizUseCase.run({ studentId: actor.uid, level: data.level, answers: data.answers }, actor);
  },
);

/** El docente regala avatares premium, objetos de la granja o monedas/semillas. */
export const teacherGrant = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as
      | {
          courseId?: string;
          studentId?: string;
          kind?: "avatar" | "item" | "currency";
          styleId?: string;
          itemId?: string;
          coins?: number;
          seeds?: number;
        }
      | undefined;
    if (!data?.courseId || !data?.studentId || !data.kind) {
      throw new HttpsError("invalid-argument", "Faltan datos.");
    }
    if (!actor || actor.isServer) throw new HttpsError("unauthenticated", "Sesión requerida.");
    assertCourse(actor, data.courseId);
    rateLimit(actor.uid, "teacherGrant", 120);
    return teacherGrantUseCase.run(
      {
        studentId: data.studentId,
        kind: data.kind,
        styleId: data.styleId,
        itemId: data.itemId,
        coins: data.coins,
        seeds: data.seeds,
      },
      actor,
    );
  },
);

/** Otorga la medalla de la misión al completar el recorrido (idempotente, server-side). */
export const awardMissionBadge = onCall(
  async (request): Promise<{ awarded: boolean; badge: { id: string; name: string; code: string } | null }> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "awardMissionBadge", 30);
    const data = request.data as { courseId?: string; classId?: string } | undefined;
    if (!data?.courseId || !data?.classId) throw new HttpsError("invalid-argument", "Faltan datos.");
    const uid = actor?.uid ?? "";
    if (!actor || actor.isServer) throw new HttpsError("unauthenticated", "Sesión requerida.");
    if (actor.role !== "ADMIN" && actor.role !== "MASTER" && !actor.courses.includes(data.courseId)) {
      throw new HttpsError("permission-denied", "No tienes acceso a este curso.");
    }
    // La misión debe estar completada (recorrido + «Estoy lista»).
    const prog = await progress.get(data.classId, uid);
    if (!prog?.ready) throw new HttpsError("failed-precondition", "La misión aún no está completa.");
    const all = await badgesRepo.listAll();
    const badge = all.find((b) => b.classId === data.classId);
    if (!badge) return { awarded: false, badge: null };
    if (await studentBadgesRepo.has(uid, badge.id)) {
      return { awarded: false, badge: { id: badge.id, name: badge.name, code: badge.code } };
    }
    await studentBadgesRepo.award(uid, badge.id, "auto", new Date().toISOString());
    return { awarded: true, badge: { id: badge.id, name: badge.name, code: badge.code } };
  },
);

export const getPositiveMessage = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { context?: string } | undefined;
    if (!data?.context) throw new HttpsError("invalid-argument", "Falta contexto.");
    return getPositiveMessageUseCase.run(data.context, actor);
  },
);

export const submitFeedback = onCall(
  async (request): Promise<Feedback> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as Partial<Parameters<SubmitFeedbackUseCase["run"]>[0]> | undefined;
    if (!data?.classId || !data?.courseId || !data?.app || !data?.learning) {
      throw new HttpsError("invalid-argument", "Datos incompletos.");
    }
    return submitFeedbackUseCase.run(
      {
        classId: data.classId,
        courseId: data.courseId,
        studentId: actor?.uid ?? "",
        anon: data.anon ?? false,
        app: data.app as never,
        learning: data.learning as never,
      },
      actor,
    );
  },
);

export const getFeedbackTendencies = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string } | undefined;
    if (!data?.courseId) throw new HttpsError("invalid-argument", "Falta courseId.");
    return getFeedbackTendenciesUseCase.run(data.courseId, actor);
  },
);

export const getCourseAnalytics = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string } | undefined;
    if (!data?.courseId) throw new HttpsError("invalid-argument", "Falta courseId.");
    return getCourseAnalyticsUseCase.run(data.courseId, actor);
  },
);

/** Reporte resumido del curso (para exportar CSV con toda la evidencia de las estudiantes). */
export const getCourseReport = onCall(
  { timeoutSeconds: 300 },
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const role = actor?.role ?? "";
    if (role !== "PROFESOR" && role !== "ADMIN" && role !== "MASTER") {
      throw new HttpsError("permission-denied", "Rol sin acceso.");
    }
    const data = request.data as { courseId?: string } | undefined;
    if (!data?.courseId) throw new HttpsError("invalid-argument", "Falta courseId.");
    assertCourse(actor, data.courseId);

    const list = await students.findByCourse(data.courseId);
    const catalog = await classes.listAll();
    const rows: {
      displayName: string; active: boolean; missionsDone: number; quizzes: number;
      quizPct: number; participation: number; evidence: number; tickets: number;
    }[] = [];

    for (const student of list) {
      const uid = student.userId ?? student.id;
      let missionsDone = 0;
      let evidence = 0;
      let participationTotal = 0;
      let ticketCount = 0;
      let quizCount = 0;
      let quizPctSum = 0;

      for (const cls of catalog) {
        const [flipped, subs, parts, tks, quizList] = await Promise.all([
          progress.listByClass(data.courseId, cls.id),
          submissions.listByClass(data.courseId, cls.id),
          participation.listByClass(data.courseId, cls.id),
          exitTickets.listByClass(data.courseId, cls.id),
          quizzes.listByClass(cls.id),
        ]);
        if (flipped.some((f) => f.studentId === uid && f.ready)) missionsDone++;
        evidence += subs.filter((s) => s.studentId === uid).length;
        const part = parts.find((p) => p.studentId === uid);
        if (part) participationTotal += part.total;
        ticketCount += tks.filter((t) => t.studentId === uid).length;
        for (const quiz of quizList) {
          const attempt = await quizAttempts.get(quiz.id, uid);
          if (attempt && attempt.status === "SUBMITTED") {
            quizCount++;
            quizPctSum += attempt.maxScore > 0 ? (attempt.score / attempt.maxScore) * 100 : 0;
          }
        }
      }

      rows.push({
        displayName: student.displayName,
        active: student.active,
        missionsDone,
        quizzes: quizCount,
        quizPct: quizCount ? Math.round(quizPctSum / quizCount) : 0,
        participation: participationTotal,
        evidence,
        tickets: ticketCount,
      });
    }

    rows.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return { courseId: data.courseId, generatedAt: new Date().toISOString(), students: rows };
  },
);

/** Reporte de evidencia por estudiante: progreso, respuestas de quiz, participación, medallas. */
export const getStudentEvidenceReport = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string; studentId?: string } | undefined;
    if (!data?.courseId || !data?.studentId) throw new HttpsError("invalid-argument", "Faltan datos.");
    const role = actor?.role ?? "";
    if (role !== "ESTUDIANTE" && role !== "PROFESOR" && role !== "ADMIN" && role !== "MASTER") {
      throw new HttpsError("permission-denied", "Rol sin acceso.");
    }
    assertCourse(actor, data.courseId);

    const student = await students.getById(data.studentId);
    // El progreso/quiz/participación se guarda con el uid de Auth (studentId de la sesión).
    const uid = student?.userId ?? data.studentId;
    if (role === "ESTUDIANTE" && actor?.uid !== uid && actor?.uid !== data.studentId) {
      throw new HttpsError("permission-denied", "Solo puedes ver tu propio reporte.");
    }
    const catalog = await classes.listAll();
    const [earnedBadges, allBadges] = await Promise.all([studentBadgesRepo.listForStudent(uid), badgesRepo.listAll()]);
    const badgeName = new Map(allBadges.map((b) => [b.id, b.name]));

    const missions: {
      classId: string; title: string; ready: boolean; progressPercent: number; quizScore: number | null;
      quizAttempts: number; interactionSeconds: number; completedAt: string | null;
    }[] = [];
    const quizReports: {
      quizId: string; classId: string; title: string; score: number; maxScore: number; submittedAt: string | null;
      correct: number; total: number; byQuestion: { qid: string; correct: boolean; points: number }[];
    }[] = [];
    const participationReport: { classId: string; skill: string; level: number; note?: string | null }[] = [];
    let evidenceCount = 0;
    let exitTicketCount = 0;

    for (const cls of catalog.sort((a, b) => a.order - b.order)) {
      const [flipped, subs, parts, tickets, quizList] = await Promise.all([
        progress.listByClass(data.courseId, cls.id),
        submissions.listByClass(data.courseId, cls.id),
        participation.listByClass(data.courseId, cls.id),
        exitTickets.listByClass(data.courseId, cls.id),
        quizzes.listByClass(cls.id),
      ]);

      const myFlipped = flipped.find((f) => f.studentId === uid);
      if (myFlipped) {
        missions.push({
          classId: cls.id,
          title: cls.title,
          ready: myFlipped.ready,
          progressPercent: myFlipped.progressPercent,
          quizScore: myFlipped.quizScore ?? null,
          quizAttempts: myFlipped.quizAttempts,
          interactionSeconds: myFlipped.interactionSeconds,
          completedAt: myFlipped.completedAt ?? null,
        });
      }

      for (const part of parts.filter((pr) => pr.studentId === uid)) {
        for (const entry of part.records) {
          participationReport.push({ classId: cls.id, skill: entry.skill, level: entry.level, note: entry.note });
        }
      }

      evidenceCount += subs.filter((s) => s.studentId === uid).length;
      exitTicketCount += tickets.filter((t) => t.studentId === uid).length;

      for (const quiz of quizList) {
        const attempt = await quizAttempts.get(quiz.id, uid);
        if (attempt && attempt.status === "SUBMITTED") {
          quizReports.push({
            quizId: quiz.id,
            classId: cls.id,
            title: quiz.title,
            score: attempt.score,
            maxScore: attempt.maxScore,
            submittedAt: attempt.submittedAt ?? null,
            correct: attempt.answers.filter((a) => a.correct).length,
            total: attempt.answers.length,
            byQuestion: attempt.answers.map((a) => ({ qid: a.qid, correct: a.correct, points: a.points })),
          });
        }
      }
    }

    return {
      courseId: data.courseId,
      student: student ? { id: student.id, displayName: student.displayName, courseId: student.courseId } : null,
      missions,
      quizzes: quizReports,
      participation: participationReport,
      badges: earnedBadges.map((e) => ({
        badgeId: e.badgeId,
        name: badgeName.get(e.badgeId) ?? e.badgeId,
        earnedAt: e.earnedAt,
        via: e.via,
      })),
      evidenceCount,
      exitTickets: exitTicketCount,
      generatedAt: new Date().toISOString(),
    };
  },
);

export const createTeam = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string; name?: string; memberIds?: string[] } | undefined;
    if (!data?.courseId || !data?.name || !Array.isArray(data.memberIds)) throw new HttpsError("invalid-argument", "Datos incompletos.");
    const team = await createTeamUseCase.run({ courseId: data.courseId, name: data.name, memberIds: data.memberIds }, actor);
    await audit.log({
      userId: actor?.uid ?? "server",
      action: "TEAM_CREATED",
      entity: "projectTeams",
      entityId: team.id,
      courseId: team.courseId,
      timestamp: new Date().toISOString(),
      metadata: { members: team.members.length },
    });
    return team;
  },
);

export const updateTeam = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { teamId?: string; courseId?: string; name?: string; addMembers?: string[]; removeMembers?: string[] } | undefined;
    if (!data?.teamId || !data?.courseId) throw new HttpsError("invalid-argument", "Faltan datos.");
    return updateTeamUseCase.run(data as never, actor);
  },
);

export const randomGroups = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string; groupCount?: number } | undefined;
    if (!data?.courseId || !data?.groupCount) throw new HttpsError("invalid-argument", "Faltan datos.");
    const groups = await randomGroupsUseCase.run({ courseId: data.courseId, groupCount: data.groupCount }, actor);
    await audit.log({
      userId: actor?.uid ?? "server",
      action: "TEAM_GROUPS_CREATED",
      entity: "projectTeams",
      courseId: data.courseId,
      timestamp: new Date().toISOString(),
      metadata: { groups: groups.length },
    });
    return groups;
  },
);

export const listTeams = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string } | undefined;
    if (!data?.courseId) throw new HttpsError("invalid-argument", "Falta courseId.");
    return listTeamsUseCase.run(data.courseId, actor);
  },
);

export const saveProject = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { teamId?: string; courseId?: string; classId?: string; fields?: unknown; submit?: boolean } | undefined;
    if (!data?.teamId || !data?.courseId || !data?.classId || !data?.fields) throw new HttpsError("invalid-argument", "Datos incompletos.");
    return saveProjectUseCase.run({ teamId: data.teamId, courseId: data.courseId, classId: data.classId, fields: data.fields as never, submit: data.submit }, actor);
  },
);

export const listProjects = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { courseId?: string; classId?: string } | undefined;
    if (!data?.courseId || !data?.classId) throw new HttpsError("invalid-argument", "Faltan datos.");
    return listProjectsUseCase.run(data.courseId, data.classId, actor);
  },
);

export const getProjectForTeam = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { teamId?: string; classId?: string; courseId?: string } | undefined;
    if (!data?.teamId || !data?.classId || !data?.courseId) throw new HttpsError("invalid-argument", "Faltan datos.");
    return getProjectForTeamUseCase.run(data as never, actor);
  },
);

export const getProjectDetail = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { projectId?: string; courseId?: string } | undefined;
    if (!data?.projectId || !data?.courseId) throw new HttpsError("invalid-argument", "Faltan datos.");
    return getProjectDetailUseCase.run(data.projectId, data.courseId, actor);
  },
);

export const assessProject = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    rateLimit(actor?.uid ?? "anon", "assessProject", 30);
    const data = request.data as { projectId?: string; courseId?: string; rubricId?: string; scores?: Record<string, number>; feedback?: string } | undefined;
    if (!data?.projectId || !data?.courseId || !data?.rubricId || !data?.scores) throw new HttpsError("invalid-argument", "Datos incompletos.");
    return assessProjectUseCase.run(data as never, actor);
  },
);

export const saveSelfPeerAssessment = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { projectId?: string; kind?: string; rubricId?: string; scores?: Record<string, number>; feedback?: string } | undefined;
    if (!data?.projectId || !data?.kind || !data?.rubricId || !data?.scores) throw new HttpsError("invalid-argument", "Datos incompletos.");
    return saveSelfPeerUseCase.run(data as never, actor);
  },
);

export const getRubric = onCall(
  async (request): Promise<unknown> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { rubricId?: string } | undefined;
    if (!data?.rubricId) throw new HttpsError("invalid-argument", "Falta rubricId.");
    return rubricsRepo.getById(data.rubricId);
  },
);
