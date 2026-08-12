import { onCall, HttpsError } from "firebase-functions/v2/https";
import { rateLimit } from "./rate-limit";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
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
  QuizAttempt,
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
  CorrectMaterialUseCase,
  CreateMaterialUseCase,
  CreateProjectionTokenUseCase,
  CreateTeamUseCase,
  DeactivateStudentUseCase,
  DuplicateMaterialUseCase,
  EvaluateAndAwardBadgesUseCase,
  GenerateDocumentUseCase,
  GenerateMaterialUseCase,
  GetBadgesForStudentUseCase,
  GetCalendarAlertsUseCase,
  GetClassDashboardUseCase,
  GetCourseAnalyticsUseCase,
  GetCourseDashboardUseCase,
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
  ImportStudentsUseCase,
  ListExitTicketsUseCase,
  ListMaterialsForEvaluatorUseCase,
  ListMaterialsForTeacherUseCase,
  ListPendingForRoleUseCase,
  ListProjectsUseCase,
  ListTeamsUseCase,
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
  SubmitEvidenceUseCase,
  SubmitExitTicketUseCase,
  SubmitFeedbackUseCase,
  SubmitQuizAttemptUseCase,
  SubmitVoteUseCase,
  UpdateMaterialUseCase,
  UpdateTeamUseCase,
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
  FirestoreCourseRepository,
  FirestoreExitTicketRepository,
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
} from "@pclab/infrastructure";
import { buildMaterialDocx, buildMaterialPdf } from "./material-docs";

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
  async (request): Promise<QuizAttempt> => {
    const actor = actorFrom(request);
    requireAuth(actor);
    const data = request.data as { quizId?: string; answers?: QuizAnswerGiven[] } | undefined;
    if (!data?.quizId || !Array.isArray(data.answers)) {
      throw new HttpsError("invalid-argument", "Datos incompletos.");
    }
    return submitQuizUseCase.run({ quizId: data.quizId, studentId: actor?.uid ?? "", answers: data.answers }, actor);
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
