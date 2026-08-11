import { PROJECT_STATUS, ROLES, type Project, type ProjectAssessment, type ProjectAssessmentSummary, type ProjectFields, type ProjectTeam, type Rubric } from "@pclab/shared";
import { assessmentPercent, rubricTotalPoints, validateAssessment, validateProjectFields, validateTeamMembership } from "@pclab/domain";
import { assertCourse, assertRole } from "../auth";
import { generateId } from "../id";
import type {
  AuditRepository,
  AuthContext,
  ProjectAssessmentRepository,
  ProjectRepository,
  ProjectTeamRepository,
  RubricRepository,
  StudentRepository,
} from "../ports";

const PROJECT_CLASS = "class-11";

// ---------------------------------------------------------------- equipos

export class CreateTeamUseCase {
  constructor(
    private deps: {
      teams: ProjectTeamRepository;
      students: StudentRepository;
    },
  ) {}

  async run(
    input: { courseId: string; name: string; memberIds: string[] },
    actor: AuthContext | null,
  ): Promise<ProjectTeam> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    assertCourse(actor, input.courseId);
    const students = await this.deps.students.findByCourse(input.courseId);
    const valid = new Set(students.filter((s) => s.active).map((s) => s.id));
    for (const id of input.memberIds) {
      if (!valid.has(id)) throw new Error(`La estudiante ${id} no pertenece a este curso.`);
    }
    const existing = await this.deps.teams.listByCourse(input.courseId);
    validateTeamMembership(input.memberIds, existing);

    const now = new Date().toISOString();
    const team: ProjectTeam = {
      id: generateId(),
      courseId: input.courseId,
      name: input.name.trim(),
      members: input.memberIds,
      createdAt: now,
      updatedAt: now,
    };
    return this.deps.teams.create(team);
  }
}

export class UpdateTeamUseCase {
  constructor(
    private deps: {
      teams: ProjectTeamRepository;
      students: StudentRepository;
    },
  ) {}

  async run(
    input: { teamId: string; courseId: string; name?: string; addMembers?: string[]; removeMembers?: string[] },
    actor: AuthContext | null,
  ): Promise<ProjectTeam> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    const team = await this.deps.teams.getById(input.teamId);
    if (!team) throw new Error("Equipo no encontrado.");
    assertCourse(actor, team.courseId);

    const students = await this.deps.students.findByCourse(team.courseId);
    const valid = new Set(students.filter((s) => s.active).map((s) => s.id));
    let members = [...team.members];
    if (input.addMembers) {
      for (const id of input.addMembers) {
        if (!valid.has(id)) throw new Error(`La estudiante ${id} no pertenece a este curso.`);
        if (!members.includes(id)) members.push(id);
      }
    }
    if (input.removeMembers) members = members.filter((id) => !input.removeMembers!.includes(id));

    const existing = await this.deps.teams.listByCourse(team.courseId);
    validateTeamMembership(members, existing, team.id);

    team.name = input.name?.trim() || team.name;
    team.members = members;
    team.updatedAt = new Date().toISOString();
    return this.deps.teams.update(team);
  }
}

export class RandomGroupsUseCase {
  constructor(
    private deps: {
      teams: ProjectTeamRepository;
      students: StudentRepository;
    },
  ) {}

  async run(input: { courseId: string; groupCount: number }, actor: AuthContext | null): Promise<ProjectTeam[]> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    assertCourse(actor, input.courseId);
    if (input.groupCount < 1) throw new Error("Debe haber al menos un grupo.");

    const students = (await this.deps.students.findByCourse(input.courseId)).filter((s) => s.active);
    const existing = await this.deps.teams.listByCourse(input.courseId);
    const assigned = new Set(existing.flatMap((t) => t.members));
    const available = students.filter((s) => !assigned.has(s.id));
    if (available.length === 0) throw new Error("Todas las estudiantes ya están en un equipo.");

    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const groups: string[][] = Array.from({ length: input.groupCount }, () => []);
    shuffled.forEach((student, i) => groups[i % input.groupCount]!.push(student.id));

    const now = new Date().toISOString();
    const created: ProjectTeam[] = [];
    for (let g = 0; g < groups.length; g++) {
      const members = groups[g]!;
      if (members.length === 0) continue;
      const team: ProjectTeam = {
        id: generateId(),
        courseId: input.courseId,
        name: `Equipo ${g + 1}`,
        members,
        createdAt: now,
        updatedAt: now,
      };
      created.push(await this.deps.teams.create(team));
    }
    return created;
  }
}

export class ListTeamsUseCase {
  constructor(private deps: { teams: ProjectTeamRepository }) {}

  async run(courseId: string, actor: AuthContext | null): Promise<ProjectTeam[]> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER, ROLES.ESTUDIANTE]);
    if (actor?.role === ROLES.ESTUDIANTE) {
      const teams = await this.deps.teams.listByCourse(courseId);
      return teams.filter((t) => t.members.includes(actor.uid));
    }
    assertCourse(actor, courseId);
    return this.deps.teams.listByCourse(courseId);
  }
}

// ---------------------------------------------------------------- proyecto

export class SaveProjectUseCase {
  constructor(
    private deps: {
      teams: ProjectTeamRepository;
      projects: ProjectRepository;
    },
  ) {}

  async run(
    input: { teamId: string; courseId: string; classId: string; fields: ProjectFields; submit?: boolean },
    actor: AuthContext | null,
  ): Promise<Project> {
    const team = await this.deps.teams.getById(input.teamId);
    if (!team) throw new Error("Equipo no encontrado.");
    if (team.courseId !== input.courseId) throw new Error("Curso incorrecto.");

    if (actor?.role === ROLES.ESTUDIANTE) {
      if (!team.members.includes(actor.uid)) throw new Error("No perteneces a este equipo.");
    } else {
      assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
      assertCourse(actor, input.courseId);
    }

    validateProjectFields(input.fields);
    const existing = await this.deps.projects.getByTeam(input.classId, input.teamId);
    const now = new Date().toISOString();
    const project: Project = {
      id: existing?.id ?? `project-${input.teamId}`,
      classId: input.classId,
      courseId: input.courseId,
      teamId: input.teamId,
      fields: input.fields,
      status: input.submit ? PROJECT_STATUS.ENTREGADO : existing?.status ?? PROJECT_STATUS.EN_PROGRESO,
      attachments: existing?.attachments ?? [],
      submittedAt: input.submit ? now : existing?.submittedAt ?? null,
      updatedAt: now,
    };
    return this.deps.projects.upsert(project);
  }
}

export class ListProjectsUseCase {
  constructor(private deps: { projects: ProjectRepository }) {}

  async run(courseId: string, classId: string, actor: AuthContext | null): Promise<Project[]> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    assertCourse(actor, courseId);
    return (await this.deps.projects.listByClass(classId)).filter((p) => p.courseId === courseId);
  }
}

export class GetProjectForTeamUseCase {
  constructor(
    private deps: {
      teams: ProjectTeamRepository;
      projects: ProjectRepository;
    },
  ) {}

  async run(
    input: { teamId: string; classId: string; courseId: string },
    actor: AuthContext | null,
  ): Promise<Project | null> {
    const team = await this.deps.teams.getById(input.teamId);
    if (!team) throw new Error("Equipo no encontrado.");
    if (actor?.role === ROLES.ESTUDIANTE && !team.members.includes(actor.uid)) {
      throw new Error("No perteneces a este equipo.");
    }
    return this.deps.projects.getByTeam(input.classId, input.teamId);
  }
}

export class GetProjectDetailUseCase {
  constructor(
    private deps: {
      teams: ProjectTeamRepository;
      projects: ProjectRepository;
      assessments: ProjectAssessmentRepository;
    },
  ) {}

  async run(projectId: string, courseId: string, actor: AuthContext | null): Promise<{
    project: Project;
    team: ProjectTeam;
    assessments: ProjectAssessmentSummary;
  }> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    const project = (await this.deps.projects.listByCourse(courseId)).find((p) => p.id === projectId);
    if (!project) throw new Error("Proyecto no encontrado.");
    const team = await this.deps.teams.getById(project.teamId);
    if (!team) throw new Error("Equipo no encontrado.");

    const assessments = await this.deps.assessments.listByProject(projectId);
    const teacher = assessments.find((a) => a.kind === "teacher") ?? null;
    const self = assessments.find((a) => a.kind === "self") ?? null;
    const peer = assessments.filter((a) => a.kind === "peer");

    const totalPoints: number | null = teacher ? Object.values(teacher.scores).reduce((a, b) => a + b, 0) : null;
    const percent: number | null = null;
    return { project, team, assessments: { teacher, self, peer, totalPoints, percent } };
  }
}

// ---------------------------------------------------------------- evaluación

export class AssessProjectUseCase {
  constructor(
    private deps: {
      projects: ProjectRepository;
      assessments: ProjectAssessmentRepository;
      rubrics: RubricRepository;
      audit: AuditRepository;
    },
  ) {}

  async run(
    input: { projectId: string; courseId: string; rubricId: string; scores: Record<string, number>; feedback?: string },
    actor: AuthContext | null,
  ): Promise<ProjectAssessment> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    assertCourse(actor, input.courseId);
    const project = (await this.deps.projects.listByCourse(input.courseId)).find((p) => p.id === input.projectId);
    if (!project) throw new Error("Proyecto no encontrado.");
    const rubric = await this.deps.rubrics.getById(input.rubricId);
    if (!rubric) throw new Error("Rúbrica no encontrada.");

    const assessment: ProjectAssessment = {
      projectId: input.projectId,
      teamId: project.teamId,
      courseId: input.courseId,
      kind: "teacher",
      by: actor?.uid ?? "server",
      scores: input.scores,
      feedback: input.feedback,
      at: new Date().toISOString(),
    };
    validateAssessment(rubric, assessment);
    await this.deps.assessments.upsert(assessment);
    await this.deps.projects.upsert({ ...project, status: PROJECT_STATUS.REVISADO, updatedAt: new Date().toISOString() });
    await this.deps.audit.log({
      userId: actor?.uid ?? "server",
      action: "PROJECT_ASSESSED",
      entity: "projects",
      entityId: input.projectId,
      courseId: input.courseId,
      timestamp: new Date().toISOString(),
      metadata: { rubricId: input.rubricId },
    });
    return assessment;
  }
}

export class SaveSelfPeerAssessmentUseCase {
  constructor(
    private deps: {
      teams: ProjectTeamRepository;
      projects: ProjectRepository;
      assessments: ProjectAssessmentRepository;
      rubrics: RubricRepository;
    },
  ) {}

  async run(
    input: { projectId: string; kind: "self" | "peer"; rubricId: string; scores: Record<string, number>; feedback?: string },
    actor: AuthContext | null,
  ): Promise<ProjectAssessment> {
    const project = (await this.deps.projects.listByClass(PROJECT_CLASS)).find((p) => p.id === input.projectId);
    if (!project) throw new Error("Proyecto no encontrado.");
    const team = await this.deps.teams.getById(project.teamId);
    if (!team) throw new Error("Equipo no encontrado.");
    if (actor?.role === ROLES.ESTUDIANTE && !team.members.includes(actor.uid)) {
      throw new Error("No perteneces a este equipo.");
    }
    const rubric = await this.deps.rubrics.getById(input.rubricId);
    if (!rubric) throw new Error("Rúbrica no encontrada.");

    const assessment: ProjectAssessment = {
      projectId: input.projectId,
      teamId: project.teamId,
      courseId: project.courseId,
      kind: input.kind,
      by: actor?.uid ?? "server",
      scores: input.scores,
      feedback: input.feedback,
      at: new Date().toISOString(),
    };
    validateAssessment(rubric, assessment);
    return this.deps.assessments.upsert(assessment);
  }
}

export { rubricTotalPoints, assessmentPercent };
export type { Rubric };
