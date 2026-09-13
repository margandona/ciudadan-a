import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type {
  BuyFarmItemResult,
  CalendarAlert,
  CandidateStudent,
  ClassAvailability,
  ClassDashboard,
  ClassSchedule,
  ClassStatus,
  ConceptQuizPublic,
  ConceptQuizResult,
  CourseAnalytics,
  CourseDashboard,
  EvidenceAttachment,
  ExitTicket,
  FarmActionResult,
  FarmSnapshot,
  Feedback,
  FeedbackTendencies,
  FlippedProgress,
  ImportPreview,
  ImportResult,
  Material,
  MaterialDetail,
  MaterialVersion,
  ParticipationOverview,
  Project,
  ProjectAssessmentSummary,
  ProjectionToken,
  ProjectTeam,
  QuizAnswerGiven,
  QuizSubmitResult,
  Rubric,
  SlideDeck,
  Student,
  StudentBadge,
  StudentBadgesOverview,
  StudentQuiz,
  Submission,
  SubmissionStatus,
  VoteResult,
} from "@pclab/shared";

/** Cliente de Cloud Functions (emulador en desarrollo). */

const previewStudentsFn = httpsCallable<{ fileName: string; data: string }, ImportPreview>(functions, "previewStudents");
const importStudentsFn = httpsCallable<{ rows: CandidateStudent[]; fileName?: string; year?: number }, ImportResult>(functions, "importStudents");
const setStudentActiveFn = httpsCallable<{ courseId: string; studentId: string; active: boolean }, Student>(functions, "setStudentActive");
const setClassScheduleFn = httpsCallable<
  { courseId: string; classId: string; status?: ClassStatus; availability?: Partial<ClassAvailability> },
  ClassSchedule
>(functions, "setClassSchedule");
const getFlippedOverviewFn = httpsCallable<
  { courseId: string; classId: string },
  { total: number; completed: number; rows: { studentId: string; displayName: string; progress: FlippedProgress | null; completed: boolean }[] }
>(functions, "getFlippedOverview");
const getQuizForStudentFn = httpsCallable<{ quizId: string }, StudentQuiz>(functions, "getQuizForStudent");
const submitQuizAttemptFn = httpsCallable<{ quizId: string; answers: QuizAnswerGiven[] }, QuizSubmitResult>(functions, "submitQuizAttempt");
const submitEvidenceFn = httpsCallable<
  { activityId: string; classId: string; courseId: string; content: Submission["content"]; attachments?: EvidenceAttachment[] },
  Submission
>(functions, "submitEvidence");
const reviewSubmissionFn = httpsCallable<
  { submissionId: string; courseId: string; status?: SubmissionStatus; score?: number | null; teacherFeedback?: string },
  Submission
>(functions, "reviewSubmission");
const submitExitTicketFn = httpsCallable<
  { classId: string; courseId: string; answers: ExitTicket["answers"]; difficulty?: number },
  ExitTicket
>(functions, "submitExitTicket");
const listExitTicketsFn = httpsCallable<{ courseId: string; classId: string }, ExitTicket[]>(functions, "listExitTickets");
const registerParticipationFn = httpsCallable<
  { courseId: string; classId: string; entries: { studentId: string; skill: string; level: number; note?: string }[] },
  { saved: number }
>(functions, "registerParticipation");
const getParticipationOverviewFn = httpsCallable<{ courseId: string; classId: string }, ParticipationOverview>(functions, "getParticipationOverview");
const getCourseDashboardFn = httpsCallable<{ courseId: string }, CourseDashboard>(functions, "getCourseDashboard");
const getClassDashboardFn = httpsCallable<{ courseId: string; classId: string }, ClassDashboard>(functions, "getClassDashboard");
const getCalendarAlertsFn = httpsCallable<{ courseId: string }, CalendarAlert[]>(functions, "getCalendarAlerts");
const getPresentationFn = httpsCallable<{ classId: string; tokenId?: string }, { deck: SlideDeck; isProjection: boolean }>(functions, "getPresentation");
const savePresentationFn = httpsCallable<{ classId: string; courseId: string; slides: unknown[]; config?: unknown }, SlideDeck>(functions, "savePresentation");
const createProjectionTokenFn = httpsCallable<{ classId: string; courseId: string }, ProjectionToken>(functions, "createProjectionToken");
const submitVoteFn = httpsCallable<{ classId: string; questionId: string; option: number }, VoteResult>(functions, "submitVote");
const recordManualVotesFn = httpsCallable<{ classId: string; questionId: string; counts: Record<string, number> }, VoteResult>(functions, "recordManualVotes");
const getVotesFn = httpsCallable<{ classId: string; questionId: string }, VoteResult | null>(functions, "getVotes");
const createMaterialFn = httpsCallable<{ courseId: string; type: string; title: string; classId?: string; hasDUA: boolean; oaIds?: string[]; printDeadline?: string | null; reviewDeadline?: string | null }, Material>(functions, "createMaterial");
const addMaterialVersionFn = httpsCallable<{ materialId: string; courseId: string; kind: string; fileName: string; mime?: string; size?: number; url?: string; storagePath?: string; note?: string }, MaterialVersion>(functions, "addMaterialVersion");
const sendMaterialForReviewFn = httpsCallable<
  { materialId: string; courseId: string; evaluatorEmail: string; pieEmail?: string; utpEmail?: string },
  Material
>(functions, "sendMaterialForReview");
const listMaterialsForTeacherFn = httpsCallable<{ courseId: string }, Material[]>(functions, "listMaterialsForTeacher");
const listMaterialsForEvaluatorFn = httpsCallable<Record<string, never>, Material[]>(functions, "listMaterialsForEvaluator");
const getMaterialDetailFn = httpsCallable<{ materialId: string }, MaterialDetail>(functions, "getMaterialDetail");
const reviewMaterialFn = httpsCallable<{ materialId: string; courseId: string; status: string; comment: string }, MaterialDetail>(functions, "reviewMaterial");
const getBadgesForStudentFn = httpsCallable<{ courseId: string; studentId: string }, StudentBadgesOverview>(functions, "getBadgesForStudent");
const evaluateBadgesFn = httpsCallable<{ courseId: string; studentId: string }, { awarded: string[]; overview: StudentBadgesOverview }>(functions, "evaluateBadges");
const awardBadgeFn = httpsCallable<{ courseId: string; studentId: string; badgeId: string }, StudentBadge>(functions, "awardBadge");
const getPositiveMessageFn = httpsCallable<{ context: string }, { message: string | null; context: string }>(functions, "getPositiveMessage");
const submitFeedbackFn = httpsCallable<{ classId: string; courseId: string; anon: boolean; app: Feedback["app"]; learning: Feedback["learning"] }, Feedback>(functions, "submitFeedback");
const getFeedbackTendenciesFn = httpsCallable<{ courseId: string }, FeedbackTendencies>(functions, "getFeedbackTendencies");
const getCourseAnalyticsFn = httpsCallable<{ courseId: string }, CourseAnalytics>(functions, "getCourseAnalytics");
const createTeamFn = httpsCallable<{ courseId: string; name: string; memberIds: string[] }, ProjectTeam>(functions, "createTeam");
const listTeamsFn = httpsCallable<{ courseId: string }, ProjectTeam[]>(functions, "listTeams");
const randomGroupsFn = httpsCallable<{ courseId: string; groupCount: number }, ProjectTeam[]>(functions, "randomGroups");
const saveProjectFn = httpsCallable<{ teamId: string; courseId: string; classId: string; fields: Project["fields"]; submit?: boolean }, Project>(functions, "saveProject");
const listProjectsFn = httpsCallable<{ courseId: string; classId: string }, Project[]>(functions, "listProjects");
const getProjectDetailFn = httpsCallable<{ projectId: string; courseId: string }, { project: Project; team: ProjectTeam; assessments: ProjectAssessmentSummary }>(functions, "getProjectDetail");
const getProjectForTeamFn = httpsCallable<{ teamId: string; classId: string; courseId: string }, Project | null>(functions, "getProjectForTeam");
const assessProjectFn = httpsCallable<{ projectId: string; courseId: string; rubricId: string; scores: Record<string, number>; feedback?: string }, unknown>(functions, "assessProject");
const getRubricFn = httpsCallable<{ rubricId: string }, Rubric>(functions, "getRubric");

export async function previewStudents(fileName: string, base64: string): Promise<ImportPreview> {
  const res = await previewStudentsFn({ fileName, data: base64 });
  return res.data;
}

export async function importStudents(rows: CandidateStudent[], fileName?: string): Promise<ImportResult> {
  const res = await importStudentsFn({ rows, fileName });
  return res.data;
}

export async function setStudentActive(courseId: string, studentId: string, active: boolean): Promise<Student> {
  const res = await setStudentActiveFn({ courseId, studentId, active });
  return res.data;
}

export async function setClassSchedule(
  courseId: string,
  classId: string,
  payload: { status?: ClassStatus; availability?: Partial<ClassAvailability> },
): Promise<ClassSchedule> {
  const res = await setClassScheduleFn({ courseId, classId, ...payload });
  return res.data;
}

export async function getFlippedOverview(courseId: string, classId: string) {
  const res = await getFlippedOverviewFn({ courseId, classId });
  return res.data;
}

export async function getQuizForStudent(quizId: string): Promise<StudentQuiz> {
  const res = await getQuizForStudentFn({ quizId });
  return res.data;
}

export async function submitQuizAttempt(quizId: string, answers: QuizAnswerGiven[]): Promise<QuizSubmitResult> {
  const res = await submitQuizAttemptFn({ quizId, answers });
  return res.data;
}

export interface LiveQuestion {
  id: string;
  type: string;
  prompt: string;
  options?: string[];
  points: number;
  order: number;
  correctIndex?: number;
}

export async function getQuizForTeacher(quizId: string): Promise<{
  id: string; title: string; classId: string; courseId: string; questionCount: number; questions: LiveQuestion[];
}> {
  const res = await httpsCallable<{ quizId: string }, { id: string; title: string; classId: string; courseId: string; questionCount: number; questions: LiveQuestion[] }>(
    functions,
    "getQuizForTeacher",
  )({ quizId });
  return res.data;
}

export async function startLiveQuiz(quizId: string): Promise<{ sessionId: string; code: string }> {
  const res = await httpsCallable<{ quizId: string }, { sessionId: string; code: string }>(functions, "startLiveQuiz")({ quizId });
  return res.data;
}

export async function getLiveSessionByCode(code: string): Promise<{
  sessionId: string; code: string; quizId: string; title: string; classId: string; courseId: string; questionCount: number;
}> {
  const res = await httpsCallable<{ code: string }, {
    sessionId: string; code: string; quizId: string; title: string; classId: string; courseId: string; questionCount: number;
  }>(functions, "getLiveSessionByCode")({ code });
  return res.data;
}

export async function joinLiveQuiz(code: string): Promise<{ sessionId: string; title: string; joined: boolean }> {
  const res = await httpsCallable<{ code: string }, { sessionId: string; title: string; joined: boolean }>(functions, "joinLiveQuiz")({ code });
  return res.data;
}

export async function submitLiveAnswer(code: string, index: number, given: number): Promise<{ correct: boolean; points: number; score: number }> {
  const res = await httpsCallable<{ code: string; index: number; given: number }, { correct: boolean; points: number; score: number }>(
    functions,
    "submitLiveAnswer",
  )({ code, index, given });
  return res.data;
}

export async function advanceLiveQuiz(sessionId: string, action: "start" | "next" | "reveal" | "end"): Promise<{ ok: boolean }> {
  const res = await httpsCallable<{ sessionId: string; action: string }, { ok: boolean }>(functions, "advanceLiveQuiz")({ sessionId, action });
  return res.data;
}

export async function getLiveQuestion(code: string, index: number): Promise<{ prompt: string; options: string[]; type: string; index: number }> {
  const res = await httpsCallable<{ code: string; index: number }, { prompt: string; options: string[]; type: string; index: number }>(
    functions,
    "getLiveQuestion",
  )({ code, index });
  return res.data;
}

export async function submitEvidence(
  payload: { activityId: string; classId: string; courseId: string; content: Submission["content"]; attachments?: EvidenceAttachment[] },
): Promise<Submission> {
  const res = await submitEvidenceFn(payload);
  return res.data;
}

export async function reviewSubmission(
  payload: { submissionId: string; courseId: string; status?: SubmissionStatus; score?: number | null; teacherFeedback?: string },
): Promise<Submission> {
  const res = await reviewSubmissionFn(payload);
  return res.data;
}

export async function submitExitTicket(
  payload: { classId: string; courseId: string; answers: ExitTicket["answers"]; difficulty?: number },
): Promise<ExitTicket> {
  const res = await submitExitTicketFn(payload);
  return res.data;
}

export async function listExitTickets(courseId: string, classId: string): Promise<ExitTicket[]> {
  const res = await listExitTicketsFn({ courseId, classId });
  return res.data;
}

export async function registerParticipation(
  courseId: string,
  classId: string,
  entries: { studentId: string; skill: string; level: number; note?: string }[],
): Promise<number> {
  const res = await registerParticipationFn({ courseId, classId, entries });
  return res.data.saved;
}

export async function getParticipationOverview(courseId: string, classId: string): Promise<ParticipationOverview> {
  const res = await getParticipationOverviewFn({ courseId, classId });
  return res.data;
}

export async function getCourseDashboard(courseId: string): Promise<CourseDashboard> {
  const res = await getCourseDashboardFn({ courseId });
  return res.data;
}

export async function getClassDashboard(courseId: string, classId: string): Promise<ClassDashboard> {
  const res = await getClassDashboardFn({ courseId, classId });
  return res.data;
}

export async function getCalendarAlerts(courseId: string): Promise<CalendarAlert[]> {
  const res = await getCalendarAlertsFn({ courseId });
  return res.data;
}

export async function getPresentation(classId: string, tokenId?: string) {
  const res = await getPresentationFn({ classId, tokenId });
  return res.data;
}

export async function savePresentation(classId: string, courseId: string, slides: unknown[], config?: unknown): Promise<SlideDeck> {
  const res = await savePresentationFn({ classId, courseId, slides, config });
  return res.data;
}

export async function createProjectionToken(classId: string, courseId: string): Promise<ProjectionToken> {
  const res = await createProjectionTokenFn({ classId, courseId });
  return res.data;
}

export async function submitVote(classId: string, questionId: string, option: number): Promise<VoteResult> {
  const res = await submitVoteFn({ classId, questionId, option });
  return res.data;
}

export async function recordManualVotes(classId: string, questionId: string, counts: Record<string, number>): Promise<VoteResult> {
  const res = await recordManualVotesFn({ classId, questionId, counts });
  return res.data;
}

export async function getVotes(classId: string, questionId: string): Promise<VoteResult | null> {
  const res = await getVotesFn({ classId, questionId });
  return res.data;
}

export async function createMaterial(payload: { courseId: string; type: string; title: string; classId?: string; hasDUA: boolean; oaIds?: string[]; printDeadline?: string | null; reviewDeadline?: string | null }): Promise<Material> {
  const res = await createMaterialFn(payload);
  return res.data;
}

export async function addMaterialVersion(payload: { materialId: string; courseId: string; kind: string; fileName: string; mime?: string; size?: number; url?: string; storagePath?: string; note?: string }): Promise<MaterialVersion> {
  const res = await addMaterialVersionFn(payload);
  return res.data;
}

export async function sendMaterialForReview(payload: { materialId: string; courseId: string; evaluatorEmail: string; pieEmail?: string; utpEmail?: string }): Promise<Material> {
  const res = await sendMaterialForReviewFn(payload);
  return res.data;
}

export async function listMaterialsForTeacher(courseId: string): Promise<Material[]> {
  const res = await listMaterialsForTeacherFn({ courseId });
  return res.data;
}

export async function listMaterialsForEvaluator(): Promise<Material[]> {
  const res = await listMaterialsForEvaluatorFn({});
  return res.data;
}

export async function getMaterialDetail(materialId: string): Promise<MaterialDetail> {
  const res = await getMaterialDetailFn({ materialId });
  return res.data;
}

export async function reviewMaterial(payload: { materialId: string; courseId: string; status: string; comment: string }): Promise<MaterialDetail> {
  const res = await reviewMaterialFn(payload);
  return res.data;
}

// ---------------------------------------------------------------------------
// Módulo de materiales pedagógicos v2 (flujo institucional).
// ---------------------------------------------------------------------------

export type MaterialContent = import("@pclab/shared").MaterialContent;
export type MaterialApproval = import("@pclab/shared").MaterialApproval;
export type ReviewerRole = import("@pclab/shared").ReviewerRole;

export async function generateMaterial(payload: {
  courseId: string;
  classId?: string;
  unitId?: string;
  type: string;
  title: string;
  classDate?: string | null;
  requiresPrinting?: boolean;
  oaIds?: string[];
  classObjective?: string;
  indicators?: string[];
  learningObjectives?: string[];
}): Promise<Material> {
  const res = await httpsCallable<typeof payload, Material>(functions, "generateMaterial")(payload);
  return res.data;
}

export async function updateMaterial(payload: {
  materialId: string;
  courseId: string;
  title?: string;
  description?: string;
  content?: MaterialContent;
  curricular?: MaterialContent["curricular"];
  classDate?: string | null;
  requiresPrinting?: boolean;
  duration?: number;
  changeSummary?: string;
}): Promise<Material> {
  const res = await httpsCallable<typeof payload, Material>(functions, "updateMaterial")(payload);
  return res.data;
}

export async function duplicateMaterial(payload: { materialId: string; courseId: string; targetCourseId?: string }): Promise<Material> {
  const res = await httpsCallable<typeof payload, Material>(functions, "duplicateMaterial")(payload);
  return res.data;
}

/** Copia las guías (GUIDE y afines) de un curso a otro, sin pisar lo existente. */
export async function mirrorCourseGuides(sourceCourseId: string, targetCourseId: string): Promise<{ copied: number; skipped: number }> {
  const res = await httpsCallable<{ sourceCourseId: string; targetCourseId: string }, { copied: number; skipped: number }>(
    functions,
    "mirrorCourseGuides",
  )({ sourceCourseId, targetCourseId });
  return res.data;
}

export async function archiveMaterial(payload: { materialId: string; courseId: string }): Promise<Material> {
  const res = await httpsCallable<typeof payload, Material>(functions, "archiveMaterial")(payload);
  return res.data;
}

export async function approveMaterial(payload: {
  materialId: string;
  courseId: string;
  decision: "APROBADO" | "CON_OBSERVACIONES" | "SOLICITA_CAMBIOS";
  comment: string;
  section?: string;
}): Promise<MaterialDetail> {
  const res = await httpsCallable<typeof payload, MaterialDetail>(functions, "approveMaterial")(payload);
  return res.data;
}

export async function correctMaterial(payload: { materialId: string; courseId: string; content: MaterialContent; changeSummary: string }): Promise<Material> {
  const res = await httpsCallable<typeof payload, Material>(functions, "correctMaterial")(payload);
  return res.data;
}

export async function resubmitMaterial(payload: { materialId: string; courseId: string }): Promise<Material> {
  const res = await httpsCallable<typeof payload, Material>(functions, "resubmitMaterial")(payload);
  return res.data;
}

export async function readyToPrintMaterial(payload: { materialId: string; courseId: string }): Promise<Material> {
  const res = await httpsCallable<typeof payload, Material>(functions, "readyToPrint")(payload);
  return res.data;
}

export async function resolveComment(payload: { materialId: string; commentId: string }): Promise<{ ok: boolean }> {
  const res = await httpsCallable<typeof payload, { ok: boolean }>(functions, "resolveComment")(payload);
  return res.data;
}

export async function listPendingMaterials(courseId?: string): Promise<Material[]> {
  const res = await httpsCallable<{ courseId?: string }, Material[]>(functions, "listPendingMaterials")({ courseId });
  return res.data;
}

export async function downloadMaterial(materialId: string, kind: "PDF" | "DOCX"): Promise<{ buffer: string; mime: string; fileName: string }> {
  const res = await httpsCallable<{ materialId: string; kind: string }, { buffer: string; mime: string; fileName: string }>(functions, "downloadMaterial")({ materialId, kind });
  return res.data;
}

export async function downloadAllMaterials(
  courseId: string,
  kind: "PDF" | "DOCX",
): Promise<{ buffer: string; mime: string; fileName: string }> {
  const res = await httpsCallable<{ courseId: string; kind: string }, { buffer: string; mime: string; fileName: string }>(functions, "downloadAllMaterials")({
    courseId,
    kind,
  });
  return res.data;
}

export interface StudentLoginOption {
  courseId: string;
  name: string;
  email: string;
  listNumber?: number;
}

function studentLoginUrl(): string {
  const useEmulators = (import.meta.env.VITE_USE_EMULATORS ?? "true") !== "false";
  const forceEmulators = import.meta.env.VITE_FORCE_EMULATORS === "true";
  const emulator = useEmulators && (import.meta.env.DEV || forceEmulators);
  const base = emulator ? "http://127.0.0.1:5002/ciudadania-lab/us-central1" : "https://us-central1-ciudadania-lab.cloudfunctions.net";
  return `${base}/listStudentLoginOptions`;
}

export async function listStudentLoginOptions(): Promise<{ courses: { id: string; name: string }[]; students: StudentLoginOption[] }> {
  const res = await fetch(studentLoginUrl());
  if (!res.ok) throw new Error("No se pudieron cargar los estudiantes.");
  const data = (await res.json()) as { courses?: { id: string; name: string }[]; students?: StudentLoginOption[]; error?: string };
  if (data.error) throw new Error(data.error);
  return { courses: data.courses ?? [], students: data.students ?? [] };
}

export async function getBadgesForStudent(courseId: string, studentId: string): Promise<StudentBadgesOverview> {
  const res = await getBadgesForStudentFn({ courseId, studentId });
  return res.data;
}

export async function evaluateBadges(courseId: string, studentId: string) {
  const res = await evaluateBadgesFn({ courseId, studentId });
  return res.data;
}

export async function awardBadge(courseId: string, studentId: string, badgeId: string): Promise<StudentBadge> {
  const res = await awardBadgeFn({ courseId, studentId, badgeId });
  return res.data;
}

export async function getPositiveMessage(context: string): Promise<string | null> {
  const res = await getPositiveMessageFn({ context });
  return res.data.message;
}

export async function awardMissionBadge(
  courseId: string,
  classId: string,
): Promise<{ awarded: boolean; badge: { id: string; name: string; code: string } | null }> {
  const res = await httpsCallable<{ courseId: string; classId: string }, { awarded: boolean; badge: { id: string; name: string; code: string } | null }>(
    functions,
    "awardMissionBadge",
  )({ courseId, classId });
  return res.data;
}

export async function submitFeedback(payload: { classId: string; courseId: string; anon: boolean; app: Feedback["app"]; learning: Feedback["learning"] }): Promise<Feedback> {
  const res = await submitFeedbackFn(payload);
  return res.data;
}

export async function getFeedbackTendencies(courseId: string): Promise<FeedbackTendencies> {
  const res = await getFeedbackTendenciesFn({ courseId });
  return res.data;
}

export async function getCourseAnalytics(courseId: string): Promise<CourseAnalytics> {
  const res = await getCourseAnalyticsFn({ courseId });
  return res.data;
}

export interface StudentEvidenceReport {
  courseId: string;
  student: { id: string; displayName: string; courseId: string } | null;
  missions: {
    classId: string; title: string; ready: boolean; progressPercent: number; quizScore: number | null;
    quizAttempts: number; interactionSeconds: number; completedAt: string | null;
  }[];
  quizzes: {
    quizId: string; classId: string; title: string; score: number; maxScore: number; submittedAt: string | null;
    correct: number; total: number; byQuestion: { qid: string; correct: boolean; points: number }[];
  }[];
  participation: { classId: string; skill: string; level: number; note?: string | null }[];
  badges: { badgeId: string; name: string; earnedAt: string; via: string }[];
  evidenceCount: number;
  exitTickets: number;
  generatedAt: string;
}

export async function getStudentEvidenceReport(courseId: string, studentId: string): Promise<StudentEvidenceReport> {
  const res = await httpsCallable<{ courseId: string; studentId: string }, StudentEvidenceReport>(functions, "getStudentEvidenceReport")({
    courseId,
    studentId,
  });
  return res.data;
}

export interface CourseReportRow {
  displayName: string;
  active: boolean;
  missionsDone: number;
  quizzes: number;
  quizPct: number;
  participation: number;
  evidence: number;
  tickets: number;
}

export async function getCourseReport(courseId: string): Promise<{ courseId: string; generatedAt: string; students: CourseReportRow[] }> {
  const res = await httpsCallable<{ courseId: string }, { courseId: string; generatedAt: string; students: CourseReportRow[] }>(
    functions,
    "getCourseReport",
  )({ courseId });
  return res.data;
}

export interface StudentGamification {
  xp: number;
  level: number;
  progressToNext: number;
  streak: number;
  weeklyStars: number;
  breakdown: Record<string, number>;
  badges: number;
  totalBadges: number;
  bonusXp: number;
  unlockedAvatarStyles: string[];
}

export async function getStudentGamification(courseId: string, studentId: string): Promise<StudentGamification> {
  const res = await httpsCallable<{ courseId: string; studentId: string }, StudentGamification>(functions, "getStudentGamification")({
    courseId,
    studentId,
  });
  return res.data;
}

// ── Granja Ciudadana ─────────────────────────────────────────
const getFarmFn = httpsCallable<{ courseId: string; studentId?: string }, FarmSnapshot>(functions, "getFarm");
const plantSeedFn = httpsCallable<{ courseId: string; plotIndex: number; cropId: string }, FarmSnapshot>(functions, "plantSeed");
const harvestPlotFn = httpsCallable<{ courseId: string; plotIndex: number }, FarmActionResult>(functions, "harvestPlot");
const buyFarmItemFn = httpsCallable<{ courseId: string; itemId: string }, BuyFarmItemResult>(functions, "buyFarmItem");
const equipFarmItemFn = httpsCallable<{ courseId: string; itemId: string }, FarmSnapshot>(functions, "equipFarmItem");
const getConceptQuizFn = httpsCallable<{ level: number }, ConceptQuizPublic>(functions, "getConceptQuiz");
const submitConceptQuizFn = httpsCallable<
  { courseId: string; level: number; answers: { id: string; given: number }[] },
  { result: ConceptQuizResult; farm: FarmSnapshot }
>(functions, "submitConceptQuiz");

export async function getFarm(courseId: string, studentId?: string): Promise<FarmSnapshot> {
  const res = await getFarmFn(studentId ? { courseId, studentId } : { courseId });
  return res.data;
}

export async function plantSeed(courseId: string, plotIndex: number, cropId: string): Promise<FarmSnapshot> {
  const res = await plantSeedFn({ courseId, plotIndex, cropId });
  return res.data;
}

export async function harvestPlot(courseId: string, plotIndex: number): Promise<FarmActionResult> {
  const res = await harvestPlotFn({ courseId, plotIndex });
  return res.data;
}

export async function buyFarmItem(courseId: string, itemId: string): Promise<BuyFarmItemResult> {
  const res = await buyFarmItemFn({ courseId, itemId });
  return res.data;
}

export async function equipFarmItem(courseId: string, itemId: string): Promise<FarmSnapshot> {
  const res = await equipFarmItemFn({ courseId, itemId });
  return res.data;
}

export interface TeacherGrantPayload {
  courseId: string;
  studentId: string;
  kind: "avatar" | "item" | "currency";
  styleId?: string;
  itemId?: string;
  coins?: number;
  seeds?: number;
}

export async function teacherGrant(payload: TeacherGrantPayload): Promise<FarmSnapshot> {
  const res = await httpsCallable<TeacherGrantPayload, FarmSnapshot>(functions, "teacherGrant")(payload);
  return res.data;
}

export async function getConceptQuiz(level: number): Promise<ConceptQuizPublic> {
  const res = await getConceptQuizFn({ level });
  return res.data;
}

export async function submitConceptQuiz(
  courseId: string,
  level: number,
  answers: { id: string; given: number }[],
): Promise<{ result: ConceptQuizResult; farm: FarmSnapshot }> {
  const res = await submitConceptQuizFn({ courseId, level, answers });
  return res.data;
}

export async function createTeam(courseId: string, name: string, memberIds: string[]): Promise<ProjectTeam> {
  const res = await createTeamFn({ courseId, name, memberIds });
  return res.data;
}

export async function listTeams(courseId: string): Promise<ProjectTeam[]> {
  const res = await listTeamsFn({ courseId });
  return res.data;
}

export async function randomGroups(courseId: string, groupCount: number): Promise<ProjectTeam[]> {
  const res = await randomGroupsFn({ courseId, groupCount });
  return res.data;
}

export async function saveProject(payload: { teamId: string; courseId: string; classId: string; fields: Project["fields"]; submit?: boolean }): Promise<Project> {
  const res = await saveProjectFn(payload);
  return res.data;
}

export async function listProjects(courseId: string, classId: string): Promise<Project[]> {
  const res = await listProjectsFn({ courseId, classId });
  return res.data;
}

export async function getProjectDetail(projectId: string, courseId: string) {
  const res = await getProjectDetailFn({ projectId, courseId });
  return res.data;
}

export async function getProjectForTeam(teamId: string, classId: string, courseId: string): Promise<Project | null> {
  const res = await getProjectForTeamFn({ teamId, classId, courseId });
  return res.data;
}

export async function assessProject(payload: { projectId: string; courseId: string; rubricId: string; scores: Record<string, number>; feedback?: string }) {
  const res = await assessProjectFn(payload);
  return res.data;
}

export async function getRubric(rubricId: string): Promise<Rubric> {
  const res = await getRubricFn({ rubricId });
  return res.data;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// ---------------------------------------------------------------------------
// Guías de trabajo para estudiantes (leer y descargar dentro de cada misión).
// ---------------------------------------------------------------------------

const getStudentGuideFn = httpsCallable<{ courseId: string; classId: string }, { material: Material | null }>(
  functions,
  "getStudentGuide",
);
const downloadStudentGuideFn = httpsCallable<
  { courseId: string; classId: string; materialId: string; kind: "PDF" | "DOCX" },
  { buffer: string; mime: string; fileName: string }
>(functions, "downloadStudentGuide");

export async function getStudentGuide(courseId: string, classId: string): Promise<Material | null> {
  const res = await getStudentGuideFn({ courseId, classId });
  return res.data.material;
}

export async function downloadStudentGuide(courseId: string, classId: string, materialId: string, kind: "PDF" | "DOCX"): Promise<void> {
  const res = await downloadStudentGuideFn({ courseId, classId, materialId, kind });
  triggerBrowserDownload(res.data.buffer, res.data.mime, res.data.fileName);
}

/** Convierte un archivo base64 del servidor en una descarga real en el navegador. */
export function triggerBrowserDownload(base64: string, mime: string, fileName: string): void {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Presencia en vivo y seguimiento del curso (docente, en tiempo real).
// ---------------------------------------------------------------------------

export interface LiveSnapshotStudent {
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

export interface LiveCourseSnapshot {
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
  students: LiveSnapshotStudent[];
}

const studentHeartbeatFn = httpsCallable<{ courseId: string }, { ok: boolean }>(functions, "studentHeartbeat");
const getLiveCourseSnapshotFn = httpsCallable<{ courseId: string; activeSeconds?: number }, LiveCourseSnapshot>(
  functions,
  "getLiveCourseSnapshot",
);

export async function studentHeartbeat(courseId: string): Promise<void> {
  await studentHeartbeatFn({ courseId }).catch(() => undefined);
}

export async function getLiveCourseSnapshot(courseId: string, activeSeconds = 120): Promise<LiveCourseSnapshot> {
  const res = await getLiveCourseSnapshotFn({ courseId, activeSeconds });
  return res.data;
}
