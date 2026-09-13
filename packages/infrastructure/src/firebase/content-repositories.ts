import { Firestore } from "firebase-admin/firestore";
import type {
  Activity,
  Badge,
  ExitTicket,
  Feedback,
  Material,
  MaterialApproval,
  MaterialVersion,
  ParticipationRecord,
  PositiveMessage,
  Quiz,
  QuizAttempt,
  QuizQuestion,
  ReviewComment,
  ReviewRequest,
  ReviewerRole,
  StudentActivityStats,
  StudentBadge,
  Submission,
} from "@pclab/shared";
import type {
  ActivityRepository,
  ActivityStatsRepository,
  BadgeRepository,
  ClassRepository,
  ExitTicketRepository,
  FeedbackRepository,
  FlippedProgressRepository,
  MaterialRepository,
  MessagesRepository,
  ParticipationRepository,
  QuizAttemptRepository,
  QuizRepository,
  StudentBadgeRepository,
  SubmissionRepository,
} from "@pclab/application";
import { isoToTimestamp, timestampToIso } from "./converters";

export class FirestoreQuizRepository implements QuizRepository {
  constructor(private readonly db: Firestore) {}

  async getById(id: string): Promise<Quiz | null> {
    const doc = await this.db.collection("quizzes").doc(id).get();
    if (!doc.exists) return null;
    return recordToQuiz(doc.id, doc.data() ?? {});
  }

  async listByClass(classId: string): Promise<Quiz[]> {
    const snap = await this.db.collection("quizzes").where("classId", "==", classId).get();
    return snap.docs.map((d) => recordToQuiz(d.id, d.data() ?? {}));
  }

  async getQuestions(quizId: string): Promise<QuizQuestion[]> {
    const snap = await this.db.collection("quizzes").doc(quizId).collection("questions").orderBy("order", "asc").get();
    return snap.docs.map((d) => recordToQuestion(quizId, d.id, d.data() ?? {}));
  }
}

export class FirestoreQuizAttemptRepository implements QuizAttemptRepository {
  constructor(private readonly db: Firestore) {}

  private ref(quizId: string, studentId: string) {
    return this.db.collection("quizAttempts").doc(quizId).collection("attempts").doc(studentId);
  }

  async get(quizId: string, studentId: string): Promise<QuizAttempt | null> {
    const doc = await this.ref(quizId, studentId).get();
    if (!doc.exists) return null;
    return recordToAttempt(quizId, studentId, doc.data() ?? {});
  }

  async upsert(attempt: QuizAttempt): Promise<QuizAttempt> {
    await this.ref(attempt.quizId, attempt.studentId).set(attemptToRecord(attempt), { merge: true });
    return attempt;
  }

  async listByQuiz(quizId: string): Promise<QuizAttempt[]> {
    const snap = await this.db.collection("quizAttempts").doc(quizId).collection("attempts").get();
    return snap.docs.map((d) => recordToAttempt(quizId, d.id, d.data() ?? {}));
  }
}

export class FirestoreActivityRepository implements ActivityRepository {
  constructor(private readonly db: Firestore) {}

  async getById(id: string): Promise<Activity | null> {
    const doc = await this.db.collection("activities").doc(id).get();
    if (!doc.exists) return null;
    return recordToActivity(doc.id, doc.data() ?? {});
  }

  async listByClass(classId: string): Promise<Activity[]> {
    const snap = await this.db.collection("activities").where("classId", "==", classId).get();
    return snap.docs.map((d) => recordToActivity(d.id, d.data() ?? {}));
  }
}

export class FirestoreSubmissionRepository implements SubmissionRepository {
  constructor(private readonly db: Firestore) {}

  async getById(id: string): Promise<Submission | null> {
    const doc = await this.db.collection("submissions").doc(id).get();
    if (!doc.exists) return null;
    return recordToSubmission(doc.id, doc.data() ?? {});
  }

  async findByStudentAndActivity(studentId: string, activityId: string): Promise<Submission | null> {
    const snap = await this.db
      .collection("submissions")
      .where("studentId", "==", studentId)
      .where("activityId", "==", activityId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0]!;
    return recordToSubmission(doc.id, doc.data() ?? {});
  }

  async findByStudentAndClass(studentId: string, classId: string): Promise<Submission[]> {
    const snap = await this.db
      .collection("submissions")
      .where("studentId", "==", studentId)
      .where("classId", "==", classId)
      .get();
    return snap.docs.map((doc) => recordToSubmission(doc.id, doc.data() ?? {}));
  }

  async findByStudent(studentId: string): Promise<Submission[]> {
    const snap = await this.db.collection("submissions").where("studentId", "==", studentId).get();
    return snap.docs.map((doc) => recordToSubmission(doc.id, doc.data() ?? {}));
  }

  async listByClass(courseId: string, classId: string): Promise<Submission[]> {
    const snap = await this.db
      .collection("submissions")
      .where("courseId", "==", courseId)
      .where("classId", "==", classId)
      .get();
    return snap.docs.map((d) => recordToSubmission(d.id, d.data() ?? {}));
  }

  async upsert(submission: Submission): Promise<Submission> {
    const data = submissionToRecord(submission);
    if (submission.id) {
      await this.db.collection("submissions").doc(submission.id).set(data, { merge: true });
      return submission;
    }
    const ref = await this.db.collection("submissions").add(data);
    return { ...submission, id: ref.id };
  }
}

export class FirestoreExitTicketRepository implements ExitTicketRepository {
  constructor(private readonly db: Firestore) {}

  private ref(classId: string, studentId: string) {
    return this.db.collection("exitTickets").doc(classId).collection("tickets").doc(studentId);
  }

  async get(classId: string, studentId: string): Promise<ExitTicket | null> {
    const doc = await this.ref(classId, studentId).get();
    if (!doc.exists) return null;
    return recordToExitTicket(classId, studentId, doc.data() ?? {});
  }

  async upsert(ticket: ExitTicket): Promise<ExitTicket> {
    await this.ref(ticket.classId, ticket.studentId).set(exitTicketToRecord(ticket), { merge: true });
    return ticket;
  }

  async listByClass(courseId: string, classId: string): Promise<ExitTicket[]> {
    const snap = await this.db
      .collection("exitTickets")
      .doc(classId)
      .collection("tickets")
      .where("courseId", "==", courseId)
      .get();
    return snap.docs.map((d) => recordToExitTicket(classId, d.id, d.data() ?? {}));
  }
}

export class FirestoreParticipationRepository implements ParticipationRepository {
  constructor(private readonly db: Firestore) {}

  private ref(courseId: string, classId: string, studentId: string) {
    return this.db.collection("participation").doc(courseId).collection(classId).doc(studentId);
  }

  async get(courseId: string, classId: string, studentId: string): Promise<ParticipationRecord | null> {
    const doc = await this.ref(courseId, classId, studentId).get();
    if (!doc.exists) return null;
    return recordToParticipation(courseId, classId, studentId, doc.data() ?? {});
  }

  async listByClass(courseId: string, classId: string): Promise<ParticipationRecord[]> {
    const snap = await this.db.collection("participation").doc(courseId).collection(classId).get();
    return snap.docs.map((d) => recordToParticipation(courseId, classId, d.id, d.data() ?? {}));
  }

  async upsert(record: ParticipationRecord): Promise<ParticipationRecord> {
    await this.ref(record.courseId, record.classId, record.studentId).set(participationToRecord(record), { merge: true });
    return record;
  }
}

export class FirestoreMaterialRepository implements MaterialRepository {
  constructor(private readonly db: Firestore) {}

  private ref(id: string) {
    return this.db.collection("materials").doc(id);
  }

  async getById(id: string): Promise<Material | null> {
    const doc = await this.ref(id).get();
    if (!doc.exists) return null;
    return recordToMaterial(doc.id, doc.data() ?? {});
  }

  async listByCourse(courseId: string): Promise<Material[]> {
    const snap = await this.db.collection("materials").where("courseId", "==", courseId).get();
    return snap.docs.map((d) => recordToMaterial(d.id, d.data() ?? {}));
  }

  async listByEvaluator(evaluatorId: string): Promise<Material[]> {
    const snap = await this.db.collection("materials").where("evaluatorId", "==", evaluatorId).get();
    return snap.docs.map((d) => recordToMaterial(d.id, d.data() ?? {}));
  }

  async upsert(material: Material): Promise<Material> {
    await this.ref(material.id).set(materialToRecord(material), { merge: true });
    return material;
  }

  async addVersion(version: MaterialVersion): Promise<MaterialVersion> {
    await this.ref(version.materialId).collection("versions").doc(version.id).set(versionToRecord(version), { merge: true });
    return version;
  }

  async listVersions(materialId: string): Promise<MaterialVersion[]> {
    const snap = await this.ref(materialId).collection("versions").orderBy("version", "asc").get();
    return snap.docs.map((d) => recordToVersion(d.id, d.data() ?? {}));
  }

  async addComment(comment: ReviewComment): Promise<ReviewComment> {
    await this.ref(comment.materialId).collection("reviewComments").doc(comment.id).set(commentToRecord(comment), { merge: true });
    return comment;
  }

  async listComments(materialId: string): Promise<ReviewComment[]> {
    const snap = await this.ref(materialId).collection("reviewComments").orderBy("at", "asc").get();
    return snap.docs.map((d) => recordToComment(d.id, d.data() ?? {}));
  }

  async updateComment(commentId: string, patch: Partial<ReviewComment>): Promise<void> {
    const snap = await this.db.collectionGroup("reviewComments").where("id", "==", commentId).limit(1).get();
    if (snap.empty) return;
    const data: Record<string, unknown> = {};
    if (patch.text !== undefined) data.text = patch.text;
    if (patch.resolved !== undefined) data.resolved = patch.resolved;
    if (patch.resolvedBy !== undefined) data.resolvedBy = patch.resolvedBy ?? null;
    if (patch.resolvedAt !== undefined) data.resolvedAt = isoToTimestamp(patch.resolvedAt ?? null);
    if (patch.section !== undefined) data.section = patch.section ?? null;
    if (patch.versionId !== undefined) data.versionId = patch.versionId ?? null;
    if (Object.keys(data).length > 0) await snap.docs[0]!.ref.update(data);
  }

  async listApprovals(materialId: string): Promise<MaterialApproval[]> {
    const snap = await this.ref(materialId).collection("approvals").get();
    return snap.docs.map((d) => recordToApproval(d.id, d.data() ?? {}));
  }

  async setApproval(materialId: string, approval: MaterialApproval): Promise<void> {
    await this.ref(materialId).collection("approvals").doc(approval.role).set(approvalToRecord(approval), { merge: true });
  }

  async listByReviewer(role: ReviewerRole, uid: string): Promise<Material[]> {
    const field = role === "EVALUADOR" ? "evaluatorId" : role === "PIE" ? "pieReviewerId" : "utpReviewerId";
    const snap = await this.db.collection("materials").where(field, "==", uid).get();
    return snap.docs.map((d) => recordToMaterial(d.id, d.data() ?? {}));
  }

  async listArchived(courseId: string): Promise<Material[]> {
    const snap = await this.db.collection("materials").where("courseId", "==", courseId).where("status", "==", "ARCHIVED").get();
    return snap.docs.map((d) => recordToMaterial(d.id, d.data() ?? {}));
  }

  async addReviewRequest(request: ReviewRequest): Promise<ReviewRequest> {
    await this.ref(request.materialId).collection("reviewRequests").doc(request.id).set(requestToRecord(request), { merge: true });
    return request;
  }

  async listReviewRequests(materialId: string): Promise<ReviewRequest[]> {
    const snap = await this.ref(materialId).collection("reviewRequests").orderBy("requestedAt", "asc").get();
    return snap.docs.map((d) => recordToRequest(d.id, d.data() ?? {}));
  }

  async respondReviewRequest(requestId: string, respondedAt: string): Promise<void> {
    const snap = await this.db.collectionGroup("reviewRequests").where("id", "==", requestId).limit(1).get();
    if (snap.empty) return;
    await snap.docs[0]!.ref.update({ state: "RESPONDED", respondedAt: isoToTimestamp(respondedAt) });
  }
}

export class FirestoreBadgeRepository implements BadgeRepository {
  constructor(private readonly db: Firestore) {}

  async listAll(): Promise<Badge[]> {
    const snap = await this.db.collection("badges").orderBy("order", "asc").get();
    return snap.docs.map((d) => recordToBadge(d.id, d.data() ?? {}));
  }
}

export class FirestoreStudentBadgeRepository implements StudentBadgeRepository {
  constructor(private readonly db: Firestore) {}

  private ref(studentId: string, badgeId: string) {
    return this.db.collection("studentBadges").doc(studentId).collection("badges").doc(badgeId);
  }

  async listForStudent(studentId: string): Promise<StudentBadge[]> {
    const snap = await this.db.collection("studentBadges").doc(studentId).collection("badges").get();
    return snap.docs.map((d) => recordToStudentBadge(d.id, studentId, d.data() ?? {}));
  }

  async has(studentId: string, badgeId: string): Promise<boolean> {
    return (await this.ref(studentId, badgeId).get()).exists;
  }

  async award(studentId: string, badgeId: string, via: "auto" | "teacher", at: string): Promise<void> {
    await this.ref(studentId, badgeId).set({ badgeId, studentId, via, earnedAt: isoToTimestamp(at) }, { merge: true });
  }
}

export class FirestoreMessagesRepository implements MessagesRepository {
  constructor(private readonly db: Firestore) {}

  async list(): Promise<PositiveMessage[]> {
    const doc = await this.db.collection("settings").doc("messages").get();
    if (!doc.exists) return [];
    return ((doc.data()?.messages ?? []) as PositiveMessage[]);
  }
}

export class FirestoreActivityStatsRepository implements ActivityStatsRepository {
  constructor(
    private deps: {
      classes: ClassRepository;
      flipped: FlippedProgressRepository;
      submissions: SubmissionRepository;
      participation: ParticipationRepository;
      exitTickets: ExitTicketRepository;
      quizzes: QuizRepository;
      quizAttempts: QuizAttemptRepository;
    },
  ) {}

  async getForStudent(courseId: string, studentId: string): Promise<StudentActivityStats> {
    const classes = await this.deps.classes.listAll();
    const participationBySkill: Record<string, number> = {};
    let flippedCompleted = 0;
    let participationTotal = 0;
    let exitTickets = 0;
    let quizzesPassed = 0;

    // Evidencias: una consulta por estudiante (no escanear cada clase).
    let evidenceCount = 0;
    const byStudent = this.deps.submissions.findByStudent;
    if (byStudent) {
      const subs = await byStudent.call(this.deps.submissions, studentId);
      evidenceCount = subs.filter((s) => s.courseId === courseId).length;
    } else {
      const perClass = await Promise.all(classes.map((cls) => this.deps.submissions.listByClass(courseId, cls.id)));
      evidenceCount = perClass.flat().filter((s) => s.studentId === studentId).length;
    }

    // Solo se leen los registros de este estudiante (antes: todos los del curso).
    for (const cls of classes) {
      const [flipped, participation, ticket, quizzes] = await Promise.all([
        this.deps.flipped.get(cls.id, studentId),
        this.deps.participation.get(courseId, cls.id, studentId),
        this.deps.exitTickets.get(cls.id, studentId),
        this.deps.quizzes.listByClass(cls.id),
      ]);

      if (flipped && flipped.courseId === courseId && flipped.ready) flippedCompleted++;

      if (participation) {
        participationTotal += participation.total;
        for (const entry of participation.records) {
          participationBySkill[entry.skill] = (participationBySkill[entry.skill] ?? 0) + 1;
        }
      }

      if (ticket && ticket.courseId === courseId) exitTickets++;

      for (const quiz of quizzes) {
        const attempt = await this.deps.quizAttempts.get(quiz.id, studentId);
        if (attempt && attempt.status === "SUBMITTED" && attempt.maxScore > 0 && attempt.score / attempt.maxScore >= 0.6) {
          quizzesPassed++;
        }
      }
    }

    return { flippedCompleted, quizzesPassed, evidenceCount, participationTotal, participationBySkill, exitTickets };
  }
}

function recordToBadge(id: string, data: Record<string, unknown>): Badge {
  return {
    id,
    code: (data.code as string) ?? "",
    name: (data.name as string) ?? "",
    description: (data.description as string) ?? "",
    icon: (data.icon as string) ?? "star",
    order: (data.order as number) ?? 0,
    level: (data.level as number) ?? 1,
    criteria: (data.criteria as Badge["criteria"]) ?? [],
    classId: (data.classId as string | undefined) ?? undefined,
  };
}

function recordToStudentBadge(badgeId: string, studentId: string, data: Record<string, unknown>): StudentBadge {
  return {
    badgeId,
    studentId,
    earnedAt: timestampToIso(data.earnedAt) ?? new Date().toISOString(),
    via: (data.via as StudentBadge["via"]) ?? "auto",
  };
}

export class FirestoreFeedbackRepository implements FeedbackRepository {
  constructor(private readonly db: Firestore) {}

  private ref(classId: string, studentId: string) {
    return this.db.collection("feedback").doc(classId).collection("records").doc(studentId);
  }

  async get(classId: string, studentId: string): Promise<Feedback | null> {
    const doc = await this.ref(classId, studentId).get();
    if (!doc.exists) return null;
    return recordToFeedback(classId, studentId, doc.data() ?? {});
  }

  async upsert(feedback: Feedback): Promise<Feedback> {
    await this.ref(feedback.classId, feedback.studentId).set(feedbackToRecord(feedback), { merge: true });
    return feedback;
  }

  async listByClass(courseId: string, classId: string): Promise<Feedback[]> {
    const snap = await this.db
      .collection("feedback")
      .doc(classId)
      .collection("records")
      .where("courseId", "==", courseId)
      .get();
    return snap.docs.map((d) => recordToFeedback(classId, d.id, d.data() ?? {}));
  }
}

function recordToFeedback(classId: string, studentId: string, data: Record<string, unknown>): Feedback {
  return {
    classId,
    courseId: (data.courseId as string) ?? "",
    studentId,
    anon: (data.anon as boolean) ?? false,
    app: (data.app ?? {}) as Feedback["app"],
    learning: (data.learning ?? {}) as Feedback["learning"],
    submittedAt: timestampToIso(data.submittedAt) ?? new Date().toISOString(),
  };
}

function feedbackToRecord(f: Feedback): Record<string, unknown> {
  return {
    classId: f.classId,
    courseId: f.courseId,
    studentId: f.studentId,
    anon: f.anon,
    app: f.app,
    learning: f.learning,
    submittedAt: isoToTimestamp(f.submittedAt),
  };
}

// ---------------------------------------------------------------- convertidores

function recordToQuiz(id: string, data: Record<string, unknown>): Quiz {
  const config = (data.config ?? {}) as Record<string, unknown>;
  return {
    id,
    classId: (data.classId as string) ?? "",
    courseId: (data.courseId as string) ?? "",
    title: (data.title as string) ?? "",
    mode: (data.mode as Quiz["mode"]) ?? "INDIVIDUAL",
    config: {
      timerSeconds: (config.timerSeconds as number | null) ?? null,
      points: (config.points as number) ?? 1,
      attempts: (config.attempts as number) ?? 1,
      immediateFeedback: (config.immediateFeedback as boolean) ?? true,
      showExplanation: (config.showExplanation as boolean) ?? true,
    },
    shuffle: (data.shuffle as boolean) ?? false,
    active: (data.active as boolean) ?? true,
    order: (data.order as number) ?? 0,
    questionCount: (data.questionCount as number) ?? 0,
    createdAt: timestampToIso(data.createdAt) ?? new Date().toISOString(),
    updatedAt: timestampToIso(data.updatedAt) ?? new Date().toISOString(),
  };
}

function recordToQuestion(quizId: string, id: string, data: Record<string, unknown>): QuizQuestion {
  return {
    id,
    quizId,
    type: (data.type as QuizQuestion["type"]) ?? "choice",
    prompt: (data.prompt as string) ?? "",
    options: (data.options as string[] | undefined) ?? undefined,
    imageUrl: (data.imageUrl as string | undefined) ?? undefined,
    mapId: (data.mapId as string | undefined) ?? undefined,
    explanation: (data.explanation as string | undefined) ?? undefined,
    points: (data.points as number) ?? 1,
    order: (data.order as number) ?? 0,
    correctIndex: (data.correctIndex as number | undefined) ?? undefined,
    correctOrder: (data.correctOrder as string[] | undefined) ?? undefined,
    correctPairs: (data.correctPairs as Record<string, string> | undefined) ?? undefined,
    correctText: (data.correctText as string[] | undefined) ?? undefined,
    keywords: (data.keywords as string[] | undefined) ?? undefined,
  };
}

function recordToAttempt(quizId: string, studentId: string, data: Record<string, unknown>): QuizAttempt {
  return {
    quizId,
    studentId,
    classId: (data.classId as string) ?? "",
    courseId: (data.courseId as string) ?? "",
    startedAt: timestampToIso(data.startedAt as never) ?? null,
    submittedAt: timestampToIso(data.submittedAt as never) ?? null,
    score: (data.score as number) ?? 0,
    maxScore: (data.maxScore as number) ?? 0,
    answers: (data.answers as QuizAttempt["answers"]) ?? [],
    status: (data.status as QuizAttempt["status"]) ?? "IN_PROGRESS",
  };
}

function attemptToRecord(a: QuizAttempt): Record<string, unknown> {
  return {
    quizId: a.quizId,
    studentId: a.studentId,
    classId: a.classId,
    courseId: a.courseId,
    startedAt: isoToTimestamp(a.startedAt ?? null),
    submittedAt: isoToTimestamp(a.submittedAt ?? null),
    score: a.score,
    maxScore: a.maxScore,
    answers: a.answers,
    status: a.status,
  };
}

function recordToActivity(id: string, data: Record<string, unknown>): Activity {
  return {
    id,
    classId: (data.classId as string) ?? "",
    courseId: (data.courseId as string) ?? "",
    title: (data.title as string) ?? "",
    type: (data.type as string) ?? "",
    description: (data.description as string) ?? "",
    instructions: (data.instructions as string[]) ?? [],
    evidenceRequired: (data.evidenceRequired as boolean) ?? true,
    evidenceTypes: (data.evidenceTypes as string[]) ?? [],
    rubricId: (data.rubricId as string | undefined) ?? undefined,
    maxScore: (data.maxScore as number | undefined) ?? undefined,
    order: (data.order as number) ?? 0,
    active: (data.active as boolean) ?? true,
  };
}

function recordToSubmission(id: string, data: Record<string, unknown>): Submission {
  return {
    id,
    activityId: (data.activityId as string) ?? "",
    studentId: (data.studentId as string) ?? "",
    classId: (data.classId as string) ?? "",
    courseId: (data.courseId as string) ?? "",
    status: (data.status as Submission["status"]) ?? "PENDIENTE",
    content: (data.content ?? {}) as Submission["content"],
    attachments: (data.attachments ?? []) as Submission["attachments"],
    score: (data.score as number | null) ?? null,
    teacherFeedback: (data.teacherFeedback as string | undefined) ?? undefined,
    rubricData: (data.rubricData as Record<string, unknown> | null) ?? null,
    attempts: (data.attempts as number) ?? 0,
    submittedAt: timestampToIso(data.submittedAt as never) ?? null,
    updatedAt: timestampToIso(data.updatedAt) ?? new Date().toISOString(),
  };
}

function submissionToRecord(s: Submission): Record<string, unknown> {
  return {
    activityId: s.activityId,
    studentId: s.studentId,
    classId: s.classId,
    courseId: s.courseId,
    status: s.status,
    content: s.content,
    attachments: s.attachments,
    score: s.score ?? null,
    teacherFeedback: s.teacherFeedback ?? null,
    rubricData: s.rubricData ?? null,
    attempts: s.attempts,
    submittedAt: isoToTimestamp(s.submittedAt ?? null),
    updatedAt: isoToTimestamp(s.updatedAt),
  };
}

function recordToExitTicket(classId: string, studentId: string, data: Record<string, unknown>): ExitTicket {
  return {
    classId,
    courseId: (data.courseId as string) ?? "",
    studentId,
    answers: (data.answers as ExitTicket["answers"]) ?? { learned: "", evidence: "", concept: "", question: "", relationOvalle: "" },
    difficulty: (data.difficulty as number) ?? 3,
    submittedAt: timestampToIso(data.submittedAt) ?? new Date().toISOString(),
  };
}

function exitTicketToRecord(t: ExitTicket): Record<string, unknown> {
  return {
    classId: t.classId,
    courseId: t.courseId,
    studentId: t.studentId,
    answers: t.answers,
    difficulty: t.difficulty,
    submittedAt: isoToTimestamp(t.submittedAt),
  };
}

function recordToParticipation(
  courseId: string,
  classId: string,
  studentId: string,
  data: Record<string, unknown>,
): ParticipationRecord {
  return {
    courseId,
    classId,
    studentId,
    records: (data.records ?? []) as ParticipationRecord["records"],
    total: (data.total as number) ?? 0,
    updatedAt: timestampToIso(data.updatedAt) ?? new Date().toISOString(),
  };
}

function participationToRecord(r: ParticipationRecord): Record<string, unknown> {
  return {
    courseId: r.courseId,
    classId: r.classId,
    studentId: r.studentId,
    records: r.records,
    total: r.total,
    updatedAt: isoToTimestamp(r.updatedAt),
  };
}

function recordToMaterial(id: string, data: Record<string, unknown>): Material {
  return {
    id,
    courseId: (data.courseId as string) ?? "",
    courseIds: (data.courseIds as string[] | undefined) ?? undefined,
    classId: (data.classId as string | undefined) ?? undefined,
    unitId: (data.unitId as string | undefined) ?? undefined,
    type: (data.type as Material["type"]) ?? "complementario",
    title: (data.title as string) ?? "",
    description: (data.description as string | undefined) ?? undefined,
    oaIds: (data.oaIds as string[] | undefined) ?? undefined,
    learningObjectives: (data.learningObjectives as string[] | undefined) ?? undefined,
    classObjective: (data.classObjective as string | undefined) ?? undefined,
    indicators: (data.indicators as string[] | undefined) ?? undefined,
    duration: (data.duration as number | undefined) ?? undefined,
    estimatedPages: (data.estimatedPages as number | undefined) ?? undefined,
    status: (data.status as Material["status"]) ?? "BORRADOR",
    version: (data.version as number) ?? 1,
    parentMaterialId: (data.parentMaterialId as string | undefined) ?? undefined,
    hasDUA: (data.hasDUA as boolean) ?? false,
    hasPIE: (data.hasPIE as boolean | undefined) ?? undefined,
    requiresPrinting: (data.requiresPrinting as boolean | undefined) ?? undefined,
    requiresReview: (data.requiresReview as boolean | undefined) ?? undefined,
    reviewConfig: (data.reviewConfig as Material["reviewConfig"]) ?? undefined,
    content: (data.content as Material["content"]) ?? undefined,
    evaluatorId: (data.evaluatorId as string | undefined) ?? undefined,
    pieReviewerId: (data.pieReviewerId as string | undefined) ?? undefined,
    utpReviewerId: (data.utpReviewerId as string | undefined) ?? undefined,
    sentAt: timestampToIso(data.sentAt as never) ?? null,
    reviewAt: timestampToIso(data.reviewAt as never) ?? null,
    classDate: timestampToIso(data.classDate as never) ?? null,
    printDeadline: timestampToIso(data.printDeadline as never) ?? null,
    reviewDeadline: timestampToIso(data.reviewDeadline as never) ?? null,
    archivedAt: timestampToIso(data.archivedAt as never) ?? null,
    createdBy: (data.createdBy as string | undefined) ?? undefined,
    createdAt: timestampToIso(data.createdAt as never) ?? null,
    updatedAt: timestampToIso(data.updatedAt) ?? new Date().toISOString(),
  };
}

function materialToRecord(m: Material): Record<string, unknown> {
  return {
    id: m.id,
    courseId: m.courseId,
    courseIds: m.courseIds ?? null,
    classId: m.classId ?? null,
    unitId: m.unitId ?? null,
    type: m.type,
    title: m.title,
    description: m.description ?? null,
    oaIds: m.oaIds ?? null,
    learningObjectives: m.learningObjectives ?? null,
    classObjective: m.classObjective ?? null,
    indicators: m.indicators ?? null,
    duration: m.duration ?? null,
    estimatedPages: m.estimatedPages ?? null,
    status: m.status,
    version: m.version ?? 1,
    parentMaterialId: m.parentMaterialId ?? null,
    hasDUA: m.hasDUA,
    hasPIE: m.hasPIE ?? null,
    requiresPrinting: m.requiresPrinting ?? null,
    requiresReview: m.requiresReview ?? null,
    reviewConfig: m.reviewConfig ?? null,
    content: m.content ?? null,
    evaluatorId: m.evaluatorId ?? null,
    pieReviewerId: m.pieReviewerId ?? null,
    utpReviewerId: m.utpReviewerId ?? null,
    sentAt: isoToTimestamp(m.sentAt ?? null),
    reviewAt: isoToTimestamp(m.reviewAt ?? null),
    classDate: isoToTimestamp(m.classDate ?? null),
    printDeadline: isoToTimestamp(m.printDeadline ?? null),
    reviewDeadline: isoToTimestamp(m.reviewDeadline ?? null),
    archivedAt: isoToTimestamp(m.archivedAt ?? null),
    createdBy: m.createdBy ?? null,
    createdAt: isoToTimestamp(m.createdAt ?? null),
    updatedAt: isoToTimestamp(m.updatedAt),
  };
}

function recordToVersion(id: string, data: Record<string, unknown>): MaterialVersion {
  return {
    id,
    materialId: (data.materialId as string) ?? "",
    version: (data.version as number) ?? 0,
    kind: (data.kind as MaterialVersion["kind"]) ?? "GENERAL",
    fileName: (data.fileName as string) ?? "",
    mime: (data.mime as string | undefined) ?? undefined,
    size: (data.size as number | undefined) ?? undefined,
    url: (data.url as string | undefined) ?? undefined,
    storagePath: (data.storagePath as string | undefined) ?? undefined,
    note: (data.note as string | undefined) ?? undefined,
    changeSummary: (data.changeSummary as string | undefined) ?? undefined,
    uploadedAt: timestampToIso(data.uploadedAt) ?? new Date().toISOString(),
    by: (data.by as string) ?? "",
  };
}

function versionToRecord(v: MaterialVersion): Record<string, unknown> {
  return {
    id: v.id,
    materialId: v.materialId,
    version: v.version,
    kind: v.kind,
    fileName: v.fileName,
    mime: v.mime ?? null,
    size: v.size ?? null,
    url: v.url ?? null,
    storagePath: v.storagePath ?? null,
    note: v.note ?? null,
    changeSummary: v.changeSummary ?? null,
    uploadedAt: isoToTimestamp(v.uploadedAt),
    by: v.by,
  };
}

function recordToComment(id: string, data: Record<string, unknown>): ReviewComment {
  return {
    id,
    materialId: (data.materialId as string) ?? "",
    versionId: (data.versionId as string | undefined) ?? undefined,
    section: (data.section as string | undefined) ?? undefined,
    text: (data.text as string) ?? "",
    by: (data.by as string) ?? "",
    role: (data.role as string) ?? "",
    at: timestampToIso(data.at) ?? new Date().toISOString(),
    resolved: (data.resolved as boolean) ?? false,
    resolvedBy: (data.resolvedBy as string | undefined) ?? undefined,
    resolvedAt: timestampToIso(data.resolvedAt as never) ?? null,
  };
}

function commentToRecord(c: ReviewComment): Record<string, unknown> {
  return {
    id: c.id,
    materialId: c.materialId,
    versionId: c.versionId ?? null,
    section: c.section ?? null,
    text: c.text,
    by: c.by,
    role: c.role,
    at: isoToTimestamp(c.at),
    resolved: c.resolved ?? false,
    resolvedBy: c.resolvedBy ?? null,
    resolvedAt: isoToTimestamp(c.resolvedAt ?? null),
  };
}

function recordToApproval(_id: string, data: Record<string, unknown>): MaterialApproval {
  return {
    role: (data.role as MaterialApproval["role"]) ?? "EVALUADOR",
    status: (data.status as MaterialApproval["status"]) ?? "PENDIENTE",
    by: (data.by as string) ?? "",
    at: timestampToIso(data.at) ?? new Date().toISOString(),
    commentId: (data.commentId as string | undefined) ?? undefined,
  };
}

function approvalToRecord(a: MaterialApproval): Record<string, unknown> {
  return {
    role: a.role,
    status: a.status,
    by: a.by,
    at: isoToTimestamp(a.at),
    commentId: a.commentId ?? null,
  };
}

function recordToRequest(id: string, data: Record<string, unknown>): ReviewRequest {
  return {
    id,
    materialId: (data.materialId as string) ?? "",
    courseId: (data.courseId as string) ?? "",
    requestedBy: (data.requestedBy as string) ?? "",
    evaluatorId: (data.evaluatorId as string) ?? "",
    state: (data.state as ReviewRequest["state"]) ?? "PENDING",
    requestedAt: timestampToIso(data.requestedAt) ?? new Date().toISOString(),
    respondedAt: timestampToIso(data.respondedAt as never) ?? null,
  };
}

function requestToRecord(r: ReviewRequest): Record<string, unknown> {
  return {
    id: r.id,
    materialId: r.materialId,
    courseId: r.courseId,
    requestedBy: r.requestedBy,
    evaluatorId: r.evaluatorId,
    state: r.state,
    requestedAt: isoToTimestamp(r.requestedAt),
    respondedAt: isoToTimestamp(r.respondedAt ?? null),
  };
}
