import { describe, expect, it } from "vitest";
import { SUBMISSION_STATUS, type Activity, type AuditLog, type ExitTicket, type Submission } from "@pclab/shared";
import type { ActivityRepository, AuditRepository, ExitTicketRepository, SubmissionRepository } from "../ports";
import { ListSubmissionsUseCase, ReviewSubmissionUseCase, SubmitEvidenceUseCase } from "./submission.use-case";
import { SubmitExitTicketUseCase } from "./exit-ticket.use-case";

const ACTIVITY: Activity = {
  id: "act-1",
  classId: "class-01",
  courseId: "course-d",
  title: "Dilemas ciudadanos",
  type: "dilemma",
  description: "Analiza un dilema",
  instructions: ["Lee el caso", "Responde"],
  evidenceRequired: true,
  evidenceTypes: ["text"],
  order: 1,
  active: true,
};

class FakeActivities implements ActivityRepository {
  async getById(id: string): Promise<Activity | null> {
    return id === ACTIVITY.id ? ACTIVITY : null;
  }
  async listByClass(): Promise<Activity[]> {
    return [ACTIVITY];
  }
}

class FakeSubmissions implements SubmissionRepository {
  byId = new Map<string, Submission>();
  async getById(id: string): Promise<Submission | null> {
    return this.byId.get(id) ?? null;
  }
  async findByStudentAndActivity(studentId: string, activityId: string): Promise<Submission | null> {
    return [...this.byId.values()].find((s) => s.studentId === studentId && s.activityId === activityId) ?? null;
  }
  async listByClass(courseId: string, classId: string): Promise<Submission[]> {
    return [...this.byId.values()].filter((s) => s.courseId === courseId && s.classId === classId);
  }
  async upsert(s: Submission): Promise<Submission> {
    if (!s.id) s = { ...s, id: `s-${this.byId.size + 1}` };
    this.byId.set(s.id, s);
    return s;
  }
}

class FakeTickets implements ExitTicketRepository {
  byKey = new Map<string, ExitTicket>();
  async get(classId: string, studentId: string): Promise<ExitTicket | null> {
    return this.byKey.get(`${classId}|${studentId}`) ?? null;
  }
  async upsert(t: ExitTicket): Promise<ExitTicket> {
    this.byKey.set(`${t.classId}|${t.studentId}`, t);
    return t;
  }
  async listByClass(classId: string): Promise<ExitTicket[]> {
    return [...this.byKey.values()].filter((t) => t.classId === classId);
  }
}

class FakeAudit implements AuditRepository {
  logs: AuditLog[] = [];
  async log(entry: AuditLog): Promise<void> {
    this.logs.push(entry);
  }
}

const STUDENT = { uid: "studA", role: "ESTUDIANTE", courses: ["course-d"] };
const TEACHER = { uid: "teach1", role: "PROFESOR", courses: ["course-d"] };
const OTHER_TEACHER = { uid: "teach2", role: "PROFESOR", courses: ["course-e"] };

describe("SubmitEvidenceUseCase", () => {
  it("la estudiante entrega su evidencia en ENTREGADO", async () => {
    const subs = new FakeSubmissions();
    const uc = new SubmitEvidenceUseCase({ activities: new FakeActivities(), submissions: subs });
    const result = await uc.run(
      { activityId: "act-1", studentId: "studA", classId: "class-01", courseId: "course-d", content: { text: "Mi análisis" } },
      STUDENT,
    );
    expect(result.status).toBe(SUBMISSION_STATUS.ENTREGADO);
    expect(result.attempts).toBe(1);
    expect(result.id).toBeTruthy();
  });

  it("rechaza evidencia vacía", async () => {
    const uc = new SubmitEvidenceUseCase({ activities: new FakeActivities(), submissions: new FakeSubmissions() });
    await expect(
      uc.run(
        { activityId: "act-1", studentId: "studA", classId: "class-01", courseId: "course-d", content: {} },
        STUDENT,
      ),
    ).rejects.toThrow();
  });

  it("permite re-entregar cuando pidió corrección e incrementa intentos", async () => {
    const subs = new FakeSubmissions();
    const uc = new SubmitEvidenceUseCase({ activities: new FakeActivities(), submissions: subs });
    const first = await uc.run(
      { activityId: "act-1", studentId: "studA", classId: "class-01", courseId: "course-d", content: { text: "v1" } },
      STUDENT,
    );
    subs.byId.get(first.id)!.status = SUBMISSION_STATUS.REQUIERE_CORRECCION;
    const second = await uc.run(
      { activityId: "act-1", studentId: "studA", classId: "class-01", courseId: "course-d", content: { text: "v2" } },
      STUDENT,
    );
    expect(second.attempts).toBe(2);
    expect(second.content.text).toBe("v2");
  });

  it("no permite re-entregar una evidencia retroalimentada", async () => {
    const subs = new FakeSubmissions();
    const uc = new SubmitEvidenceUseCase({ activities: new FakeActivities(), submissions: subs });
    const first = await uc.run(
      { activityId: "act-1", studentId: "studA", classId: "class-01", courseId: "course-d", content: { text: "v1" } },
      STUDENT,
    );
    subs.byId.get(first.id)!.status = SUBMISSION_STATUS.RETROALIMENTADO;
    await expect(
      uc.run(
        { activityId: "act-1", studentId: "studA", classId: "class-01", courseId: "course-d", content: { text: "v2" } },
        STUDENT,
      ),
    ).rejects.toThrow();
  });
});

describe("ReviewSubmissionUseCase", () => {
  it("el profesor revisa, retroalimenta, puntúa y audita", async () => {
    const subs = new FakeSubmissions();
    await subs.upsert({
      id: "s1", activityId: "act-1", studentId: "studA", classId: "class-01", courseId: "course-d",
      status: SUBMISSION_STATUS.ENTREGADO, content: { text: "x" }, attachments: [], attempts: 1,
      updatedAt: "2026-08-10T12:00:00.000Z",
    });
    const audit = new FakeAudit();
    const uc = new ReviewSubmissionUseCase({ submissions: subs, audit });
    const updated = await uc.run(
      { submissionId: "s1", courseId: "course-d", status: SUBMISSION_STATUS.RETROALIMENTADO, score: 4, teacherFeedback: "Bien argumentado" },
      TEACHER,
    );
    expect(updated.status).toBe(SUBMISSION_STATUS.RETROALIMENTADO);
    expect(updated.score).toBe(4);
    expect(updated.teacherFeedback).toBe("Bien argumentado");
    expect(audit.logs).toHaveLength(1);
    expect(audit.logs[0]?.action).toBe("SUBMISSION_REVIEW");
  });

  it("rechaza transición inválida", async () => {
    const subs = new FakeSubmissions();
    await subs.upsert({
      id: "s1", activityId: "act-1", studentId: "studA", classId: "class-01", courseId: "course-d",
      status: SUBMISSION_STATUS.PENDIENTE, content: { text: "x" }, attachments: [], attempts: 0,
      updatedAt: "2026-08-10T12:00:00.000Z",
    });
    const uc = new ReviewSubmissionUseCase({ submissions: subs, audit: new FakeAudit() });
    await expect(
      uc.run({ submissionId: "s1", courseId: "course-d", status: SUBMISSION_STATUS.REVISADO }, TEACHER),
    ).rejects.toThrow(/Transición/);
  });

  it("rechaza revisar evidencias de otro curso", async () => {
    const subs = new FakeSubmissions();
    await subs.upsert({
      id: "s1", activityId: "act-1", studentId: "studA", classId: "class-01", courseId: "course-d",
      status: SUBMISSION_STATUS.ENTREGADO, content: { text: "x" }, attachments: [], attempts: 1,
      updatedAt: "2026-08-10T12:00:00.000Z",
    });
    const uc = new ReviewSubmissionUseCase({ submissions: subs, audit: new FakeAudit() });
    await expect(
      uc.run({ submissionId: "s1", courseId: "course-d", status: SUBMISSION_STATUS.REVISADO }, OTHER_TEACHER),
    ).rejects.toThrow();
  });
});

describe("ListSubmissionsUseCase", () => {
  it("lista evidencias de la clase sin cruzar cursos", async () => {
    const subs = new FakeSubmissions();
    await subs.upsert({
      id: "s1", activityId: "act-1", studentId: "studA", classId: "class-01", courseId: "course-d",
      status: SUBMISSION_STATUS.ENTREGADO, content: { text: "x" }, attachments: [], attempts: 1,
      updatedAt: "2026-08-10T12:00:00.000Z",
    });
    await subs.upsert({
      id: "s2", activityId: "act-1", studentId: "studX", classId: "class-01", courseId: "course-e",
      status: SUBMISSION_STATUS.ENTREGADO, content: { text: "y" }, attachments: [], attempts: 1,
      updatedAt: "2026-08-10T12:00:00.000Z",
    });
    const uc = new ListSubmissionsUseCase({ submissions: subs });
    const list = await uc.run("course-d", "class-01", TEACHER);
    expect(list).toHaveLength(1);
    expect(list[0]!.courseId).toBe("course-d");
  });
});

describe("SubmitExitTicketUseCase", () => {
  it("la estudiante envía su ticket de salida", async () => {
    const tickets = new FakeTickets();
    const uc = new SubmitExitTicketUseCase({ tickets, activities: new FakeActivities() });
    const result = await uc.run(
      {
        classId: "class-01",
        courseId: "course-d",
        studentId: "studA",
        answers: {
          learned: "Aprendí participación",
          evidence: "La lectura",
          concept: "Ciudadanía",
          question: "¿Qué es el bien común?",
          relationOvalle: "Plaza del barrio",
        },
        difficulty: 3,
      },
      STUDENT,
    );
    expect(result.studentId).toBe("studA");
    expect(await tickets.get("class-01", "studA")).not.toBeNull();
  });

  it("rechaza ticket incompleto", async () => {
    const uc = new SubmitExitTicketUseCase({ tickets: new FakeTickets(), activities: new FakeActivities() });
    await expect(
      uc.run(
        {
          classId: "class-01",
          courseId: "course-d",
          studentId: "studA",
          answers: { learned: "", evidence: "", concept: "", question: "", relationOvalle: "" },
          difficulty: 3,
        },
        STUDENT,
      ),
    ).rejects.toThrow();
  });
});
