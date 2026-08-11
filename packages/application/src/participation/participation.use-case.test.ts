import { describe, expect, it } from "vitest";
import type { ParticipationRecord } from "@pclab/shared";
import type { ParticipationRepository } from "../ports";
import { GetParticipationOverviewUseCase, GetStudentParticipationUseCase, RegisterParticipationUseCase } from "./participation.use-case";

class FakeParticipation implements ParticipationRepository {
  byKey = new Map<string, ParticipationRecord>();
  async get(courseId: string, classId: string, studentId: string): Promise<ParticipationRecord | null> {
    return this.byKey.get(`${courseId}|${classId}|${studentId}`) ?? null;
  }
  async listByClass(courseId: string, classId: string): Promise<ParticipationRecord[]> {
    return [...this.byKey.values()].filter((r) => r.courseId === courseId && r.classId === classId);
  }
  async upsert(r: ParticipationRecord): Promise<ParticipationRecord> {
    this.byKey.set(`${r.courseId}|${r.classId}|${r.studentId}`, r);
    return r;
  }
}

const TEACHER = { uid: "teach1", role: "PROFESOR", courses: ["course-d"] };
const OTHER = { uid: "teach2", role: "PROFESOR", courses: ["course-e"] };

describe("RegisterParticipationUseCase", () => {
  it("registra en lote a varias estudiantes y acumula", async () => {
    const repo = new FakeParticipation();
    const uc = new RegisterParticipationUseCase({ participation: repo });
    const saved = await uc.run(
      {
        courseId: "course-d",
        classId: "class-01",
        entries: [
          { studentId: "s1", skill: "argumentacion", level: 3 },
          { studentId: "s2", skill: "colaboracion", level: 2 },
        ],
      },
      TEACHER,
    );
    expect(saved).toBe(2);
    const s1 = await repo.get("course-d", "class-01", "s1");
    expect(s1?.total).toBe(1);
    expect(s1?.records[0]?.skill).toBe("argumentacion");
    expect(s1?.records[0]?.by).toBe("teach1");

    await uc.run(
      { courseId: "course-d", classId: "class-01", entries: [{ studentId: "s1", skill: "escucha", level: 1 }] },
      TEACHER,
    );
    const s1b = await repo.get("course-d", "class-01", "s1");
    expect(s1b?.total).toBe(2);
  });

  it("rechaza habilidad inválida", async () => {
    const uc = new RegisterParticipationUseCase({ participation: new FakeParticipation() });
    await expect(
      uc.run({ courseId: "course-d", classId: "class-01", entries: [{ studentId: "s1", skill: "hack", level: 1 }] }, TEACHER),
    ).rejects.toThrow();
  });

  it("rechaza registrar en un curso ajeno", async () => {
    const uc = new RegisterParticipationUseCase({ participation: new FakeParticipation() });
    await expect(
      uc.run({ courseId: "course-d", classId: "class-01", entries: [{ studentId: "s1", skill: "escucha", level: 1 }] }, OTHER),
    ).rejects.toThrow();
  });
});

describe("GetParticipationOverviewUseCase", () => {
  it("agrega el resumen por habilidad", async () => {
    const repo = new FakeParticipation();
    await repo.upsert({
      courseId: "course-d", classId: "class-01", studentId: "s1",
      records: [{ at: "x", skill: "argumentacion", level: 3, by: "t" }], total: 1, updatedAt: "x",
    });
    const uc = new GetParticipationOverviewUseCase({ participation: repo });
    const overview = await uc.run("course-d", "class-01", TEACHER);
    expect(overview.total).toBe(1);
    expect(overview.bySkill.argumentacion.count).toBe(1);
  });
});

describe("GetStudentParticipationUseCase", () => {
  it("devuelve el registro de la estudiante", async () => {
    const repo = new FakeParticipation();
    await repo.upsert({
      courseId: "course-d", classId: "class-01", studentId: "s1",
      records: [], total: 0, updatedAt: "x",
    });
    const uc = new GetStudentParticipationUseCase({ participation: repo });
    const record = await uc.run("course-d", "class-01", "s1", TEACHER);
    expect(record?.studentId).toBe("s1");
  });
});
