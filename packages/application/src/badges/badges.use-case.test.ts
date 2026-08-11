import { describe, expect, it } from "vitest";
import { ROLES, type Badge, type PositiveMessage, type Student, type StudentActivityStats, type StudentBadge } from "@pclab/shared";
import type {
  ActivityStatsRepository,
  BadgeRepository,
  MessagesRepository,
  StudentBadgeRepository,
  StudentRepository,
} from "../ports";
import { AwardBadgeUseCase, EvaluateAndAwardBadgesUseCase, GetBadgesForStudentUseCase, GetPositiveMessageUseCase } from "./badges.use-case";

const CATALOG: Badge[] = [
  { id: "b1", code: "ANALISTA", name: "Analista", description: "", icon: "spyglass", order: 1, level: 1, criteria: [{ kind: "QUIZ_PASSED", threshold: 2 }] },
  { id: "b2", code: "CARTOGRAFA", name: "Cartógrafa", description: "", icon: "map", order: 2, level: 1, criteria: [{ kind: "FLIPPED_COMPLETED", threshold: 3 }] },
];

const STATS: StudentActivityStats = {
  flippedCompleted: 4,
  quizzesPassed: 3,
  evidenceCount: 0,
  participationTotal: 0,
  participationBySkill: {},
  exitTickets: 0,
};

class FakeBadges implements BadgeRepository {
  async listAll(): Promise<Badge[]> {
    return CATALOG;
  }
}

class FakeStudentBadges implements StudentBadgeRepository {
  items: StudentBadge[] = [];
  async listForStudent(studentId: string): Promise<StudentBadge[]> {
    return this.items.filter((b) => b.studentId === studentId);
  }
  async has(studentId: string, badgeId: string): Promise<boolean> {
    return this.items.some((b) => b.studentId === studentId && b.badgeId === badgeId);
  }
  async award(studentId: string, badgeId: string, via: "auto" | "teacher", at: string): Promise<void> {
    this.items.push({ badgeId, studentId, earnedAt: at, via });
  }
}

class FakeStats implements ActivityStatsRepository {
  async getForStudent(): Promise<StudentActivityStats> {
    return STATS;
  }
}

class FakeMessages implements MessagesRepository {
  async list(): Promise<PositiveMessage[]> {
    return [{ id: "1", context: "quiz", text: "Buen trabajo" }];
  }
}

class FakeStudents implements StudentRepository {
  constructor(private studentId: string | null) {}
  async findByCourse(): Promise<never[]> {
    return [];
  }
  async getById(id: string): Promise<Student | null> {
    if (this.studentId === null) return null;
    const now = new Date().toISOString();
    return {
      id,
      displayName: "Estudiante Demo",
      normalizedSearchName: "estudiante demo",
      courseId: "course-d",
      active: true,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      academicProfile: { participationTrackingEnabled: true, gamificationEnabled: true },
    };
  }
  async upsertMany(): Promise<{ createdIds: string[]; updatedIds: string[] }> {
    return { createdIds: [], updatedIds: [] };
  }
  async softDelete(): Promise<void> {
    return undefined;
  }
}

class FakeAudit {
  logs: unknown[] = [];
  async log(entry: unknown): Promise<void> {
    this.logs.push(entry);
  }
}

const STUDENT = { uid: "s1", role: ROLES.ESTUDIANTE, courses: ["course-d"] };
const TEACHER = { uid: "t1", role: ROLES.PROFESOR, courses: ["course-d"] };

describe("GetBadgesForStudentUseCase", () => {
  it("muestra catálogo con estado de cada medalla sin ranking", async () => {
    const uc = new GetBadgesForStudentUseCase({
      badges: new FakeBadges(),
      studentBadges: new FakeStudentBadges(),
      stats: new FakeStats(),
    });
    const overview = await uc.run({ courseId: "course-d", studentId: "s1" }, STUDENT);
    expect(overview.totalCount).toBe(2);
    expect(overview.earnedCount).toBe(0);
    expect(overview.badges.every((b) => b.earned === false)).toBe(true);
  });
});

describe("EvaluateAndAwardBadgesUseCase", () => {
  it("otorga las medallas cuyo criterio se cumple y es idempotente", async () => {
    const repo = new FakeStudentBadges();
    const uc = new EvaluateAndAwardBadgesUseCase({ badges: new FakeBadges(), studentBadges: repo, stats: new FakeStats() });
    const first = await uc.run({ courseId: "course-d", studentId: "s1" }, STUDENT);
    expect(first.awarded).toEqual(["ANALISTA", "CARTOGRAFA"]);
    expect(first.overview.earnedCount).toBe(2);

    const second = await uc.run({ courseId: "course-d", studentId: "s1" }, STUDENT);
    expect(second.awarded).toEqual([]);
    expect(second.overview.earnedCount).toBe(2);
  });

  it("impide evaluar medallas ajenas", async () => {
    const uc = new EvaluateAndAwardBadgesUseCase({ badges: new FakeBadges(), studentBadges: new FakeStudentBadges(), stats: new FakeStats() });
    await expect(uc.run({ courseId: "course-d", studentId: "otra" }, STUDENT)).rejects.toThrow();
  });
});

describe("AwardBadgeUseCase", () => {
  it("el docente otorga manualmente y audita", async () => {
    const repo = new FakeStudentBadges();
    const audit = new FakeAudit();
    const uc = new AwardBadgeUseCase({
      badges: new FakeBadges(),
      studentBadges: repo,
      students: new FakeStudents("s1"),
      audit: audit as never,
    });
    const badge = await uc.run({ courseId: "course-d", studentId: "s1", badgeId: "b1" }, TEACHER);
    expect(badge.via).toBe("teacher");
    expect(audit.logs).toHaveLength(1);
  });

  it("rechaza otorgar una medalla ya ganada", async () => {
    const repo = new FakeStudentBadges();
    await repo.award("s1", "b1", "auto", new Date().toISOString());
    const uc = new AwardBadgeUseCase({
      badges: new FakeBadges(),
      studentBadges: repo,
      students: new FakeStudents("s1"),
      audit: new FakeAudit() as never,
    });
    await expect(uc.run({ courseId: "course-d", studentId: "s1", badgeId: "b1" }, TEACHER)).rejects.toThrow(/ya tiene/);
  });
});

describe("GetPositiveMessageUseCase", () => {
  it("devuelve un mensaje del contexto", async () => {
    const uc = new GetPositiveMessageUseCase({ messages: new FakeMessages() });
    const result = await uc.run("quiz", STUDENT);
    expect(result.message).toBe("Buen trabajo");
  });
});
