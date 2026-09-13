import type {
  Activity,
  AuditLog,
  Badge,
  ClassEntity,
  ClassSchedule,
  ColumnMapping,
  ConceptQuiz,
  Course,
  ExitTicket,
  FarmState,
  Feedback,
  FlippedLesson,
  FlippedProgress,
  Material,
  MaterialApproval,
  MaterialVersion,
  ParsedSheet,
  ParsedWorkbook,
  ParticipationRecord,
  PositiveMessage,
  ProjectionToken,
  Project,
  ProjectAssessment,
  ProjectTeam,
  Quiz,
  QuizAttempt,
  QuizQuestion,
  ReviewComment,
  ReviewRequest,
  ReviewerRole,
  Rubric,
  SlideDeck,
  Student,
  StudentActivityStats,
  StudentBadge,
  Submission,
  VoteResult,
} from "@pclab/shared";
import type { ExistingStudentRef } from "@pclab/domain";

/** Puertos de infraestructura usados por los casos de uso (Clean Architecture). */

export interface StudentRepository {
  findByCourse(courseId: string): Promise<Student[]>;
  upsertMany(students: Student[]): Promise<{ createdIds: string[]; updatedIds: string[] }>;
  getById(id: string): Promise<Student | null>;
  /** Soft delete: active=false + archivedAt. */
  softDelete(courseId: string, studentIds: string[]): Promise<void>;
}

export interface CourseRepository {
  findById(id: string): Promise<Course | null>;
  findBySectionYear(section: string, year: number): Promise<Course | null>;
  upsert(course: Course): Promise<Course>;
}

export interface AuditRepository {
  log(entry: AuditLog): Promise<void>;
}

/** Parser de planillas (implementado con SheetJS en infraestructura). */
export interface SpreadsheetParser {
  parse(data: Uint8Array): Promise<ParsedWorkbook>;
}

/** Detector de columnas de una hoja hacia el modelo. */
export interface ColumnDetector {
  detect(sheet: ParsedSheet): ColumnMapping;
}

/** Catálogo global de clases (12 misiones). */
export interface ClassRepository {
  listAll(): Promise<ClassEntity[]>;
  getById(id: string): Promise<ClassEntity | null>;
}

/** Programación por curso (estado + disponibilidad + ventana). */
export interface ClassScheduleRepository {
  get(courseId: string, classId: string): Promise<ClassSchedule | null>;
  listByCourse(courseId: string): Promise<ClassSchedule[]>;
  upsert(schedule: ClassSchedule): Promise<ClassSchedule>;
}

/** Contenido del aula invertida (global por clase). */
export interface FlippedLessonRepository {
  get(classId: string): Promise<FlippedLesson | null>;
}

/** Progreso individual del aula invertida. */
export interface FlippedProgressRepository {
  get(classId: string, studentId: string): Promise<FlippedProgress | null>;
  upsert(progress: FlippedProgress): Promise<FlippedProgress>;
  listByClass(courseId: string, classId: string): Promise<FlippedProgress[]>;
}

/** Quizzes (las preguntas con `answer` se sirven SOLO server-side). */
export interface QuizRepository {
  getById(id: string): Promise<Quiz | null>;
  listByClass(classId: string): Promise<Quiz[]>;
  getQuestions(quizId: string): Promise<QuizQuestion[]>;
}

/** Intentos de quiz por estudiante. */
export interface QuizAttemptRepository {
  get(quizId: string, studentId: string): Promise<QuizAttempt | null>;
  upsert(attempt: QuizAttempt): Promise<QuizAttempt>;
  listByQuiz(quizId: string): Promise<QuizAttempt[]>;
}

/** Actividades de una clase. */
export interface ActivityRepository {
  getById(id: string): Promise<Activity | null>;
  listByClass(classId: string): Promise<Activity[]>;
}

/** Evidencias (submissions). */
export interface SubmissionRepository {
  getById(id: string): Promise<Submission | null>;
  findByStudentAndActivity(studentId: string, activityId: string): Promise<Submission | null>;
  findByStudentAndClass?(studentId: string, classId: string): Promise<Submission[]>;
  /** Entregas propias de la estudiante (regla: uid == studentId). */
  findByStudent?(studentId: string): Promise<Submission[]>;
  listByClass(courseId: string, classId: string): Promise<Submission[]>;
  upsert(submission: Submission): Promise<Submission>;
}

/** Tickets de salida. */
export interface ExitTicketRepository {
  get(classId: string, studentId: string): Promise<ExitTicket | null>;
  upsert(ticket: ExitTicket): Promise<ExitTicket>;
  /** Filtra por curso (una clase la comparten varios cursos). */
  listByClass(courseId: string, classId: string): Promise<ExitTicket[]>;
}

/** Registro de participación (una por estudiante y clase). */
export interface ParticipationRepository {
  get(courseId: string, classId: string, studentId: string): Promise<ParticipationRecord | null>;
  listByClass(courseId: string, classId: string): Promise<ParticipationRecord[]>;
  upsert(record: ParticipationRecord): Promise<ParticipationRecord>;
}

/** Materiales didácticos y su flujo de revisión (calendario, evaluador, DUA). */
export interface MaterialRepository {
  getById(id: string): Promise<Material | null>;
  listByCourse(courseId: string): Promise<Material[]>;
  listByEvaluator(evaluatorId: string): Promise<Material[]>;
  upsert(material: Material): Promise<Material>;
  addVersion(version: MaterialVersion): Promise<MaterialVersion>;
  listVersions(materialId: string): Promise<MaterialVersion[]>;
  addComment(comment: ReviewComment): Promise<ReviewComment>;
  listComments(materialId: string): Promise<ReviewComment[]>;
  updateComment(commentId: string, patch: Partial<ReviewComment>): Promise<void>;
  addReviewRequest(request: ReviewRequest): Promise<ReviewRequest>;
  listReviewRequests(materialId: string): Promise<ReviewRequest[]>;
  respondReviewRequest(requestId: string, respondedAt: string): Promise<void>;
  listApprovals(materialId: string): Promise<MaterialApproval[]>;
  setApproval(materialId: string, approval: MaterialApproval): Promise<void>;
  listByReviewer(role: ReviewerRole, uid: string): Promise<Material[]>;
  listArchived(courseId: string): Promise<Material[]>;
}

/** Directorio de usuarios (para resolver evaluador por email). */
export interface UserDirectoryRepository {
  uidByEmail(email: string): Promise<string | null>;
}

/** Generador de documentos institucionales (PDF/DOCX) a partir de un material. */
export interface MaterialDocumentGenerator {
  buildPdf(material: Material): Promise<{ buffer: Uint8Array; mime: string; fileName: string }>;
  buildDocx(material: Material): Promise<{ buffer: Uint8Array; mime: string; fileName: string }>;
}

/** Catálogo de medallas. */
export interface BadgeRepository {
  listAll(): Promise<Badge[]>;
}

/** Medallas ganadas por estudiantes. */
export interface StudentBadgeRepository {
  listForStudent(studentId: string): Promise<StudentBadge[]>;
  has(studentId: string, badgeId: string): Promise<boolean>;
  award(studentId: string, badgeId: string, via: "auto" | "teacher", at: string): Promise<void>;
}

/** Biblioteca de mensajes positivos (configurable en contenido). */
export interface MessagesRepository {
  list(): Promise<PositiveMessage[]>;
}

/** Agrega estadísticas de actividad de la estudiante para criterios de medallas. */
export interface ActivityStatsRepository {
  getForStudent(courseId: string, studentId: string): Promise<StudentActivityStats>;
}

/** Feedback de estudiantes (privado; anonimato configurable). */
export interface FeedbackRepository {
  get(classId: string, studentId: string): Promise<Feedback | null>;
  upsert(feedback: Feedback): Promise<Feedback>;
  listByClass(courseId: string, classId: string): Promise<Feedback[]>;
}

/** Equipos de trabajo (ABP/ABJ/ApS). */
export interface ProjectTeamRepository {
  create(team: ProjectTeam): Promise<ProjectTeam>;
  update(team: ProjectTeam): Promise<ProjectTeam>;
  getById(id: string): Promise<ProjectTeam | null>;
  listByCourse(courseId: string): Promise<ProjectTeam[]>;
}

/** Proyectos (una entrega por equipo). */
export interface ProjectRepository {
  getByTeam(classId: string, teamId: string): Promise<Project | null>;
  upsert(project: Project): Promise<Project>;
  listByCourse(courseId: string): Promise<Project[]>;
  listByClass(classId: string): Promise<Project[]>;
}

/** Evaluaciones de proyectos (docente, autoevaluación, coevaluación). */
export interface ProjectAssessmentRepository {
  get(projectId: string, kind: string, by: string): Promise<ProjectAssessment | null>;
  upsert(assessment: ProjectAssessment): Promise<ProjectAssessment>;
  listByProject(projectId: string): Promise<ProjectAssessment[]>;
}

/** Rúbricas. */
export interface RubricRepository {
  getById(id: string): Promise<Rubric | null>;
}

/** Presentaciones proyectables (DeckPlayer). */
export interface PresentationRepository {
  get(classId: string): Promise<SlideDeck | null>;
  upsert(deck: SlideDeck): Promise<SlideDeck>;
}

/** Tokens de proyección (expiración corta). */
export interface ProjectionTokenRepository {
  create(token: ProjectionToken): Promise<ProjectionToken>;
  findByTokenId(tokenId: string): Promise<ProjectionToken | null>;
}

/** Votaciones/preguntas colectivas (resultados agregados). */
export interface VoteRepository {
  get(classId: string, questionId: string): Promise<VoteResult | null>;
  increment(classId: string, questionId: string, option: string): Promise<VoteResult>;
  setManual(classId: string, questionId: string, counts: Record<string, number>): Promise<VoteResult>;
}

/** Estado de la Granja Ciudadana (server-authoritative). */
export interface FarmRepository {
  get(studentId: string): Promise<FarmState | null>;
  save(state: FarmState): Promise<FarmState>;
}

/** Banco de preguntas de conceptos clave por nivel. */
export interface ConceptQuizRepository {
  getByLevel(level: number): Promise<ConceptQuiz | null>;
}

/** Contexto de actor autenticado (claims). */
export interface AuthContext {
  uid: string;
  role: string;
  courses: string[];
  /** true si el token es de servidor (Functions). */
  isServer?: boolean;
}

export type { ExistingStudentRef };
