import { Firestore } from "firebase-admin/firestore";
import type { Project, ProjectAssessment, ProjectTeam, Rubric } from "@pclab/shared";
import type {
  ProjectAssessmentRepository,
  ProjectRepository,
  ProjectTeamRepository,
  RubricRepository,
} from "@pclab/application";
import { isoToTimestamp, timestampToIso } from "./converters";

export class FirestoreProjectTeamRepository implements ProjectTeamRepository {
  constructor(private readonly db: Firestore) {}

  async create(team: ProjectTeam): Promise<ProjectTeam> {
    await this.db.collection("projectTeams").doc(team.id).set(teamToRecord(team), { merge: true });
    return team;
  }

  async update(team: ProjectTeam): Promise<ProjectTeam> {
    await this.db.collection("projectTeams").doc(team.id).set(teamToRecord(team), { merge: true });
    return team;
  }

  async getById(id: string): Promise<ProjectTeam | null> {
    const doc = await this.db.collection("projectTeams").doc(id).get();
    if (!doc.exists) return null;
    return recordToTeam(doc.id, doc.data() ?? {});
  }

  async listByCourse(courseId: string): Promise<ProjectTeam[]> {
    const snap = await this.db.collection("projectTeams").where("courseId", "==", courseId).get();
    return snap.docs.map((d) => recordToTeam(d.id, d.data() ?? {}));
  }
}

export class FirestoreProjectRepository implements ProjectRepository {
  constructor(private readonly db: Firestore) {}

  async getByTeam(classId: string, teamId: string): Promise<Project | null> {
    const snap = await this.db
      .collection("projects")
      .where("classId", "==", classId)
      .where("teamId", "==", teamId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0]!;
    return recordToProject(doc.id, doc.data() ?? {});
  }

  async upsert(project: Project): Promise<Project> {
    await this.db.collection("projects").doc(project.id).set(projectToRecord(project), { merge: true });
    return project;
  }

  async listByCourse(courseId: string): Promise<Project[]> {
    const snap = await this.db.collection("projects").where("courseId", "==", courseId).get();
    return snap.docs.map((d) => recordToProject(d.id, d.data() ?? {}));
  }

  async listByClass(classId: string): Promise<Project[]> {
    const snap = await this.db.collection("projects").where("classId", "==", classId).get();
    return snap.docs.map((d) => recordToProject(d.id, d.data() ?? {}));
  }
}

export class FirestoreProjectAssessmentRepository implements ProjectAssessmentRepository {
  constructor(private readonly db: Firestore) {}

  private ref(projectId: string, kind: string, by: string) {
    return this.db.collection("projects").doc(projectId).collection("assessments").doc(`${kind}_${by}`);
  }

  async get(projectId: string, kind: string, by: string): Promise<ProjectAssessment | null> {
    const doc = await this.ref(projectId, kind, by).get();
    if (!doc.exists) return null;
    return recordToAssessment(projectId, doc.data() ?? {});
  }

  async upsert(assessment: ProjectAssessment): Promise<ProjectAssessment> {
    await this.ref(assessment.projectId, assessment.kind, assessment.by).set(assessmentToRecord(assessment), { merge: true });
    return assessment;
  }

  async listByProject(projectId: string): Promise<ProjectAssessment[]> {
    const snap = await this.db.collection("projects").doc(projectId).collection("assessments").get();
    return snap.docs.map((d) => recordToAssessment(projectId, d.data() ?? {}));
  }
}

export class FirestoreRubricRepository implements RubricRepository {
  constructor(private readonly db: Firestore) {}

  async getById(id: string): Promise<Rubric | null> {
    const doc = await this.db.collection("rubrics").doc(id).get();
    if (!doc.exists) return null;
    return recordToRubric(doc.id, doc.data() ?? {});
  }
}

// ---------------------------------------------------------------- convertidores

function teamToRecord(t: ProjectTeam): Record<string, unknown> {
  return {
    courseId: t.courseId,
    name: t.name,
    members: t.members,
    createdAt: isoToTimestamp(t.createdAt),
    updatedAt: isoToTimestamp(t.updatedAt),
  };
}

function recordToTeam(id: string, data: Record<string, unknown>): ProjectTeam {
  return {
    id,
    courseId: (data.courseId as string) ?? "",
    name: (data.name as string) ?? "",
    members: (data.members as string[]) ?? [],
    createdAt: timestampToIso(data.createdAt) ?? new Date().toISOString(),
    updatedAt: timestampToIso(data.updatedAt) ?? new Date().toISOString(),
  };
}

function projectToRecord(p: Project): Record<string, unknown> {
  return {
    classId: p.classId,
    courseId: p.courseId,
    teamId: p.teamId,
    fields: p.fields,
    status: p.status,
    attachments: p.attachments,
    submittedAt: isoToTimestamp(p.submittedAt ?? null),
    updatedAt: isoToTimestamp(p.updatedAt),
  };
}

function recordToProject(id: string, data: Record<string, unknown>): Project {
  return {
    id,
    classId: (data.classId as string) ?? "",
    courseId: (data.courseId as string) ?? "",
    teamId: (data.teamId as string) ?? "",
    fields: (data.fields ?? {}) as Project["fields"],
    status: (data.status as Project["status"]) ?? "EN_PROGRESO",
    attachments: (data.attachments as string[]) ?? [],
    submittedAt: timestampToIso(data.submittedAt as never) ?? null,
    updatedAt: timestampToIso(data.updatedAt) ?? new Date().toISOString(),
  };
}

function assessmentToRecord(a: ProjectAssessment): Record<string, unknown> {
  return {
    projectId: a.projectId,
    teamId: a.teamId,
    courseId: a.courseId,
    kind: a.kind,
    by: a.by,
    scores: a.scores,
    feedback: a.feedback ?? null,
    at: isoToTimestamp(a.at),
  };
}

function recordToAssessment(projectId: string, data: Record<string, unknown>): ProjectAssessment {
  return {
    projectId,
    teamId: (data.teamId as string) ?? "",
    courseId: (data.courseId as string) ?? "",
    kind: (data.kind as ProjectAssessment["kind"]) ?? "teacher",
    by: (data.by as string) ?? "",
    scores: (data.scores ?? {}) as Record<string, number>,
    feedback: (data.feedback as string | undefined) ?? undefined,
    at: timestampToIso(data.at) ?? new Date().toISOString(),
  };
}

function recordToRubric(id: string, data: Record<string, unknown>): Rubric {
  return {
    id,
    title: (data.title as string) ?? "",
    oaIds: (data.oaIds as string[] | undefined) ?? undefined,
    criteria: (data.criteria as Rubric["criteria"]) ?? [],
  };
}
