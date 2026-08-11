import {
  SUBMISSION_STATUS,
  type Activity,
  type EvidenceAttachment,
  type Submission,
  type SubmissionStatus,
} from "@pclab/shared";
import { canStudentSubmit, canTransition, validateSubmissionContent } from "@pclab/domain";
import { assertCourse, assertRole } from "../auth";
import type {
  ActivityRepository,
  AuditRepository,
  AuthContext,
  SubmissionRepository,
} from "../ports";

export interface SubmitEvidenceInput {
  activityId: string;
  studentId: string;
  classId: string;
  courseId: string;
  content: Submission["content"];
  attachments?: EvidenceAttachment[];
  now?: string;
}

/** La estudiante entrega (o re-entrega) una evidencia. */
export class SubmitEvidenceUseCase {
  constructor(
    private deps: {
      activities: ActivityRepository;
      submissions: SubmissionRepository;
    },
  ) {}

  async run(input: SubmitEvidenceInput, actor: AuthContext | null): Promise<Submission> {
    assertRole(actor, ["ESTUDIANTE", "MASTER", "ADMIN"]);
    if (actor && !actor.isServer && actor.role === "ESTUDIANTE" && actor.uid !== input.studentId) {
      throw new Error("Solo puedes entregar tus propias evidencias.");
    }
    assertCourse(actor, input.courseId);

    const activity = await this.deps.activities.getById(input.activityId);
    if (!activity) throw new Error("Actividad no encontrada.");
    if (!activity.active) throw new Error("La actividad no está disponible.");

    const now = input.now ?? new Date().toISOString();
    const existing = await this.deps.submissions.findByStudentAndActivity(input.studentId, input.activityId);
    if (existing && !canStudentSubmit(existing.status)) {
      throw new Error(`No puedes re-entregar una evidencia en estado ${existing.status}.`);
    }

    const submission: Submission = {
      id: existing?.id ?? "",
      activityId: input.activityId,
      studentId: input.studentId,
      classId: input.classId,
      courseId: input.courseId,
      status: SUBMISSION_STATUS.ENTREGADO,
      content: input.content,
      attachments: input.attachments ?? [],
      score: existing?.score ?? null,
      teacherFeedback: existing?.teacherFeedback,
      rubricData: existing?.rubricData ?? null,
      attempts: (existing?.attempts ?? 0) + 1,
      submittedAt: now,
      updatedAt: now,
    };
    validateSubmissionContent(submission);
    return this.deps.submissions.upsert(submission);
  }
}

export interface ReviewSubmissionInput {
  submissionId: string;
  courseId: string;
  status?: SubmissionStatus;
  score?: number | null;
  teacherFeedback?: string;
  rubricData?: Record<string, unknown> | null;
}

/** El profesor revisa una evidencia: estado, nota y retroalimentación (con auditoría). */
export class ReviewSubmissionUseCase {
  constructor(
    private deps: {
      submissions: SubmissionRepository;
      audit: AuditRepository;
    },
  ) {}

  async run(input: ReviewSubmissionInput, actor: AuthContext | null): Promise<Submission> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    assertCourse(actor, input.courseId);

    const submission = await this.deps.submissions.getById(input.submissionId);
    if (!submission) throw new Error("Evidencia no encontrada.");
    if (submission.courseId !== input.courseId) throw new Error("Curso incorrecto.");

    const nextStatus = input.status ?? submission.status;
    if (input.status && !canTransition(submission.status, nextStatus)) {
      throw new Error(`Transición inválida: ${submission.status} → ${nextStatus}`);
    }
    if (input.score !== undefined && input.score !== null && input.score < 0) {
      throw new Error("La nota no puede ser negativa.");
    }

    const updated: Submission = {
      ...submission,
      status: nextStatus,
      score: input.score !== undefined ? input.score : submission.score,
      teacherFeedback: input.teacherFeedback !== undefined ? input.teacherFeedback : submission.teacherFeedback,
      rubricData: input.rubricData !== undefined ? input.rubricData : submission.rubricData,
      updatedAt: new Date().toISOString(),
    };

    await this.deps.submissions.upsert(updated);
    await this.deps.audit.log({
      userId: actor?.uid ?? "server",
      action: "SUBMISSION_REVIEW",
      entity: "submissions",
      entityId: input.submissionId,
      courseId: input.courseId,
      timestamp: new Date().toISOString(),
      metadata: { status: nextStatus, hasScore: typeof input.score === "number" },
    });

    return updated;
  }
}

/** Lista evidencias de una clase para el profesor. */
export class ListSubmissionsUseCase {
  constructor(private deps: { submissions: SubmissionRepository }) {}

  async run(courseId: string, classId: string, actor: AuthContext | null): Promise<Submission[]> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    assertCourse(actor, courseId);
    return this.deps.submissions.listByClass(courseId, classId);
  }
}

export type { Activity };
