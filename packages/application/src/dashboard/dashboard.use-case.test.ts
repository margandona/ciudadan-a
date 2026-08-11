import { describe, expect, it } from "vitest";
import { CALENDAR_STATUS, type ClassEntity, type Material, type ParticipationRecord } from "@pclab/shared";
import type {
  ClassRepository,
  ExitTicketRepository,
  FlippedProgressRepository,
  MaterialRepository,
  ParticipationRepository,
  StudentRepository,
  SubmissionRepository,
} from "../ports";
import { GetCalendarAlertsUseCase, GetClassDashboardUseCase, GetCourseDashboardUseCase } from "./dashboard.use-case";

const NOW = "2026-08-10T12:00:00.000Z";

class FakeStudents implements StudentRepository {
  async findByCourse(): Promise<never[]> {
    return [];
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

class FakeClasses implements ClassRepository {
  constructor(private items: ClassEntity[] = [{ id: "class-01", number: 1, missionId: "m1", title: "M1", unitId: "U3", oaIds: ["OA6"], order: 1, hasFeedback: false, flippedEnabled: true, estMinutes: 12, createdAt: NOW, updatedAt: NOW }]) {}
  async listAll(): Promise<ClassEntity[]> {
    return this.items;
  }
  async getById(id: string): Promise<ClassEntity | null> {
    return this.items.find((c) => c.id === id) ?? null;
  }
}

class FakeFlipped implements FlippedProgressRepository {
  items: { courseId: string; classId: string; ready: boolean }[] = [];
  async get(): Promise<null> {
    return null;
  }
  async upsert(_p: never): Promise<never> {
    throw new Error("no");
  }
  async listByClass(courseId: string, classId: string) {
    return this.items.filter((i) => i.courseId === courseId && i.classId === classId).map((i) => ({
      classId: i.classId,
      studentId: "s",
      courseId: i.courseId,
      ready: i.ready,
      progressPercent: 100,
      blocksVisited: [],
      interactionSeconds: 0,
      quizAttempts: 0,
      quizScore: null,
      updatedAt: NOW,
    }));
  }
}

class FakeSubmissions implements SubmissionRepository {
  items: { courseId: string; classId: string; status: string }[] = [];
  async getById(): Promise<null> {
    return null;
  }
  async findByStudentAndActivity(): Promise<null> {
    return null;
  }
  async listByClass(courseId: string, classId: string) {
    return this.items.filter((i) => i.courseId === courseId && i.classId === classId) as never[];
  }
  async upsert(): Promise<never> {
    throw new Error("no");
  }
}

class FakeExitTickets implements ExitTicketRepository {
  items: { courseId: string; classId: string; difficulty: number }[] = [];
  async get(): Promise<null> {
    return null;
  }
  async upsert(): Promise<never> {
    throw new Error("no");
  }
  async listByClass(courseId: string, classId: string) {
    return this.items.filter((i) => i.courseId === courseId && i.classId === classId) as never[];
  }
}

class FakeParticipation implements ParticipationRepository {
  items: ParticipationRecord[] = [];
  async get(): Promise<null> {
    return null;
  }
  async upsert(): Promise<never> {
    throw new Error("no");
  }
  async listByClass(courseId: string, classId: string) {
    return this.items.filter((r) => r.courseId === courseId && r.classId === classId);
  }
}

class FakeMaterials implements MaterialRepository {
  constructor(private items: Material[] = []) {}
  async listByCourse(courseId: string): Promise<Material[]> {
    return this.items.filter((m) => m.courseId === courseId);
  }
  async getById(): Promise<null> {
    return null;
  }
  async listByEvaluator(): Promise<never[]> {
    return [];
  }
  async upsert(): Promise<never> {
    throw new Error("no");
  }
  async addVersion(): Promise<never> {
    throw new Error("no");
  }
  async listVersions(): Promise<never[]> {
    return [];
  }
  async addComment(): Promise<never> {
    throw new Error("no");
  }
  async listComments(): Promise<never[]> {
    return [];
  }
  async addReviewRequest(): Promise<never> {
    throw new Error("no");
  }
  async listReviewRequests(): Promise<never[]> {
    return [];
  }
  async respondReviewRequest(): Promise<void> {
    return undefined;
  }
}

const TEACHER = { uid: "teach1", role: "PROFESOR", courses: ["course-d"] };

describe("GetCourseDashboardUseCase", () => {
  it("agrega flipped, evidencias, tickets y participación sin rankings", async () => {
    const flipped = new FakeFlipped();
    flipped.items = [
      { courseId: "course-d", classId: "class-01", ready: true },
      { courseId: "course-d", classId: "class-01", ready: false },
      { courseId: "course-d", classId: "class-01", ready: true },
    ];
    const submissions = new FakeSubmissions();
    submissions.items = [
      { courseId: "course-d", classId: "class-01", status: "ENTREGADO" },
      { courseId: "course-d", classId: "class-01", status: "RETROALIMENTADO" },
    ];
    const tickets = new FakeExitTickets();
    tickets.items = [{ courseId: "course-d", classId: "class-01", difficulty: 2 }, { courseId: "course-d", classId: "class-01", difficulty: 4 }];
    const participation = new FakeParticipation();
    participation.items = [{ courseId: "course-d", classId: "class-01", studentId: "s1", records: [], total: 5, updatedAt: NOW }];

    const uc = new GetCourseDashboardUseCase({
      students: new FakeStudents(),
      classes: new FakeClasses(),
      flipped,
      submissions,
      exitTickets: tickets,
      participation,
    });
    const dashboard = await uc.run("course-d", TEACHER);
    expect(dashboard.flippedCompleted).toBe(2);
    expect(dashboard.flippedTotal).toBe(3);
    expect(dashboard.flippedPercent).toBe(67);
    expect(dashboard.submissions).toBe(2);
    expect(dashboard.pendingEvidences).toBe(1);
    expect(dashboard.exitTickets).toBe(2);
    expect(dashboard.participation).toBe(5);
    expect(dashboard.avgDifficulty).toBe(3);
  });
});

describe("GetClassDashboardUseCase", () => {
  it("calcula el dashboard de una clase", async () => {
    const flipped = new FakeFlipped();
    flipped.items = [{ courseId: "course-d", classId: "class-01", ready: true }];
    const uc = new GetClassDashboardUseCase({
      flipped,
      submissions: new FakeSubmissions(),
      exitTickets: new FakeExitTickets(),
      participation: new FakeParticipation(),
    });
    const dashboard = await uc.run("course-d", "class-01", TEACHER);
    expect(dashboard.flippedCompleted).toBe(1);
    expect(dashboard.flippedPercent).toBe(100);
  });
});

describe("GetCalendarAlertsUseCase", () => {
  it("genera alertas verde/amarillo/rojo y ordena por plazo", async () => {
    const materials: Material[] = [
      { id: "m1", courseId: "course-d", classId: "class-03", type: "guia", title: "Guía A", status: "BORRADOR", hasDUA: true, printDeadline: "2026-08-12T18:00:00.000Z", reviewDeadline: null, updatedAt: NOW },
      { id: "m2", courseId: "course-d", classId: "class-05", type: "guia", title: "Guía vencida", status: "BORRADOR", hasDUA: false, printDeadline: "2026-08-07T18:00:00.000Z", reviewDeadline: null, updatedAt: NOW },
      { id: "m3", courseId: "course-d", classId: "class-06", type: "evaluacion", title: "Eval B", status: "BORRADOR", hasDUA: true, printDeadline: null, reviewDeadline: "2026-08-20T18:00:00.000Z", updatedAt: NOW },
    ];
    const uc = new GetCalendarAlertsUseCase({ materials: new FakeMaterials(materials) });
    const alerts = await uc.run("course-d", TEACHER, NOW);

    expect(alerts.length).toBe(3);
    const guiaA = alerts.find((a) => a.materialId === "m1")!;
    const guiaV = alerts.find((a) => a.materialId === "m2")!;
    const evalB = alerts.find((a) => a.materialId === "m3")!;
    expect(guiaA.kind).toBe("print");
    expect(guiaA.status).toBe(CALENDAR_STATUS.YELLOW);
    expect(guiaV.status).toBe(CALENDAR_STATUS.RED);
    expect(evalB.kind).toBe("review");
    expect(evalB.status).toBe(CALENDAR_STATUS.GREEN);
    // ordenados por fecha
    expect(alerts[0]!.materialId).toBe("m2");
  });
});
