import { describe, expect, it } from "vitest";
import { PROJECT_STATUS, ROLES, type Project, type ProjectAssessment, type ProjectFields, type ProjectTeam, type Rubric } from "@pclab/shared";
import type { ProjectAssessmentRepository, ProjectRepository, ProjectTeamRepository, RubricRepository, StudentRepository } from "../ports";
import { AssessProjectUseCase, CreateTeamUseCase, GetProjectDetailUseCase, ListProjectsUseCase, RandomGroupsUseCase, SaveProjectUseCase } from "./projects.use-case";

const FIELDS: ProjectFields = {
  problem: "a", evidence: "b", territory: "c", affectedPopulation: "d", citizenParticipation: "e",
  publicAgency: "f", privateActor: "g", resources: "h", socialImpact: "i", environmentalImpact: "j", proposal: "k",
};

const RUBRIC: Rubric = {
  id: "rubric-proyecto",
  title: "Proyecto",
  criteria: [
    { id: "problema", name: "Problema", maxPoints: 4, descriptor: "" },
    { id: "propuesta", name: "Propuesta", maxPoints: 4, descriptor: "" },
  ],
};

class FakeTeams implements ProjectTeamRepository {
  items: ProjectTeam[] = [];
  async create(t: ProjectTeam): Promise<ProjectTeam> {
    this.items.push(t);
    return t;
  }
  async update(t: ProjectTeam): Promise<ProjectTeam> {
    return t;
  }
  async getById(id: string): Promise<ProjectTeam | null> {
    return this.items.find((t) => t.id === id) ?? null;
  }
  async listByCourse(courseId: string): Promise<ProjectTeam[]> {
    return this.items.filter((t) => t.courseId === courseId);
  }
}

class FakeProjects implements ProjectRepository {
  items: Project[] = [];
  async getByTeam(classId: string, teamId: string): Promise<Project | null> {
    return this.items.find((p) => p.classId === classId && p.teamId === teamId) ?? null;
  }
  async upsert(p: Project): Promise<Project> {
    const idx = this.items.findIndex((x) => x.id === p.id);
    if (idx >= 0) this.items[idx] = p;
    else this.items.push(p);
    return p;
  }
  async listByCourse(courseId: string): Promise<Project[]> {
    return this.items.filter((p) => p.courseId === courseId);
  }
  async listByClass(classId: string): Promise<Project[]> {
    return this.items.filter((p) => p.classId === classId);
  }
}

class FakeAssessments implements ProjectAssessmentRepository {
  items: ProjectAssessment[] = [];
  async get(): Promise<ProjectAssessment | null> {
    return null;
  }
  async upsert(a: ProjectAssessment): Promise<ProjectAssessment> {
    this.items.push(a);
    return a;
  }
  async listByProject(projectId: string): Promise<ProjectAssessment[]> {
    return this.items.filter((a) => a.projectId === projectId);
  }
}

class FakeRubrics implements RubricRepository {
  async getById(id: string): Promise<Rubric | null> {
    return id === RUBRIC.id ? RUBRIC : null;
  }
}

const student = (id: string) => ({ id, displayName: id, normalizedSearchName: id, courseId: "course-d", active: true, archivedAt: null, createdAt: "x", updatedAt: "x", academicProfile: { participationTrackingEnabled: true, gamificationEnabled: true } });

class FakeStudents implements StudentRepository {
  constructor(private ids: string[]) {}
  async findByCourse(): Promise<never[]> {
    return this.ids.map(student) as never;
  }
  async getById(): Promise<null> {
    return null;
  }
  async upsertMany(): Promise<{ createdIds: string[]; updatedIds: string[] }> {
    return { createdIds: [], updatedIds: [] };
  }
  async softDelete(): Promise<void> {
    return undefined;
  }
}

const TEACHER = { uid: "t1", role: ROLES.PROFESOR, courses: ["course-d"] };
const STUDENT = { uid: "s1", role: ROLES.ESTUDIANTE, courses: ["course-d"] };

describe("CreateTeamUseCase", () => {
  it("crea un equipo validando membresía dentro del curso", async () => {
    const teams = new FakeTeams();
    const uc = new CreateTeamUseCase({ teams, students: new FakeStudents(["s1", "s2"]) as never });
    const team = await uc.run({ courseId: "course-d", name: "Equipo A", memberIds: ["s1", "s2"] }, TEACHER);
    expect(team.members).toEqual(["s1", "s2"]);
  });

  it("rechaza integrantes de otro curso", async () => {
    const uc = new CreateTeamUseCase({ teams: new FakeTeams(), students: new FakeStudents(["s1"]) as never });
    await expect(uc.run({ courseId: "course-d", name: "X", memberIds: ["s3"] }, TEACHER)).rejects.toThrow(/no pertenece/);
  });
});

describe("RandomGroupsUseCase", () => {
  it("genera grupos sin mezclar cursos y sin repetir asignadas", async () => {
    const teams = new FakeTeams();
    await teams.create({ id: "t1", courseId: "course-d", name: "E", members: ["s1"], createdAt: "x", updatedAt: "x" });
    const uc = new RandomGroupsUseCase({ teams, students: new FakeStudents(["s1", "s2", "s3", "s4", "s5"]) as never });
    const groups = await uc.run({ courseId: "course-d", groupCount: 2 }, TEACHER);
    const all = groups.flatMap((g) => g.members);
    expect(all).not.toContain("s1"); // ya estaba asignada
    expect(all.length).toBe(4);
  });
});

describe("SaveProjectUseCase", () => {
  it("una integrante guarda y entrega el proyecto de su equipo", async () => {
    const teams = new FakeTeams();
    await teams.create({ id: "t1", courseId: "course-d", name: "E", members: ["s1"], createdAt: "x", updatedAt: "x" });
    const projects = new FakeProjects();
    const uc = new SaveProjectUseCase({ teams, projects });

    const saved = await uc.run({ teamId: "t1", courseId: "course-d", classId: "class-11", fields: FIELDS }, STUDENT);
    expect(saved.status).toBe(PROJECT_STATUS.EN_PROGRESO);

    const submitted = await uc.run({ teamId: "t1", courseId: "course-d", classId: "class-11", fields: FIELDS, submit: true }, STUDENT);
    expect(submitted.status).toBe(PROJECT_STATUS.ENTREGADO);
    expect(submitted.submittedAt).toBeTruthy();
  });

  it("rechaza que una no integrante guarde el proyecto", async () => {
    const teams = new FakeTeams();
    await teams.create({ id: "t1", courseId: "course-d", name: "E", members: ["s2"], createdAt: "x", updatedAt: "x" });
    const uc = new SaveProjectUseCase({ teams, projects: new FakeProjects() });
    await expect(uc.run({ teamId: "t1", courseId: "course-d", classId: "class-11", fields: FIELDS }, STUDENT)).rejects.toThrow(/perteneces/);
  });
});

describe("AssessProjectUseCase + GetProjectDetailUseCase", () => {
  it("el docente evalúa con rúbrica y el detalle incluye integrantes y evaluaciones", async () => {
    const teams = new FakeTeams();
    await teams.create({ id: "t1", courseId: "course-d", name: "E", members: ["s1", "s2"], createdAt: "x", updatedAt: "x" });
    const projects = new FakeProjects();
    await new SaveProjectUseCase({ teams, projects }).run({ teamId: "t1", courseId: "course-d", classId: "class-11", fields: FIELDS, submit: true }, STUDENT);

    const project = (await projects.listByClass("class-11"))[0]!;
    const assessments = new FakeAssessments(); const assess = new AssessProjectUseCase({ projects, assessments, rubrics: new FakeRubrics(), audit: { log: async () => undefined } });
    const assessment = await assess.run({ projectId: project.id, courseId: "course-d", rubricId: RUBRIC.id, scores: { problema: 4, propuesta: 3 }, feedback: "Bien" }, TEACHER);
    expect(assessment.scores.problema).toBe(4);

    const detail = await new GetProjectDetailUseCase({ teams, projects, assessments }).run(project.id, "course-d", TEACHER);
    expect(detail.team.members).toContain("s1");
    expect(detail.assessments.teacher?.feedback).toBe("Bien");
  });

  it("rechaza puntajes fuera de la rúbrica", async () => {
    const teams = new FakeTeams();
    await teams.create({ id: "t1", courseId: "course-d", name: "E", members: ["s1"], createdAt: "x", updatedAt: "x" });
    const projects = new FakeProjects();
    await new SaveProjectUseCase({ teams, projects }).run({ teamId: "t1", courseId: "course-d", classId: "class-11", fields: FIELDS }, STUDENT);
    const project = (await projects.listByClass("class-11"))[0]!;
    const assessments = new FakeAssessments(); const assess = new AssessProjectUseCase({ projects, assessments, rubrics: new FakeRubrics(), audit: { log: async () => undefined } });
    await expect(assess.run({ projectId: project.id, courseId: "course-d", rubricId: RUBRIC.id, scores: { problema: 9, propuesta: 3 } }, TEACHER)).rejects.toThrow();
  });
});

describe("ListProjectsUseCase", () => {
  it("lista proyectos de la clase sin cruzar cursos", async () => {
    const projects = new FakeProjects();
    await projects.upsert({ id: "p1", classId: "class-11", courseId: "course-d", teamId: "t1", fields: FIELDS, status: PROJECT_STATUS.ENTREGADO, attachments: [], submittedAt: "x", updatedAt: "x" });
    await projects.upsert({ id: "p2", classId: "class-11", courseId: "course-e", teamId: "t2", fields: FIELDS, status: PROJECT_STATUS.EN_PROGRESO, attachments: [], submittedAt: null, updatedAt: "x" });
    const list = await new ListProjectsUseCase({ projects }).run("course-d", "class-11", TEACHER);
    expect(list.map((p) => p.courseId)).toEqual(["course-d"]);
  });
});
