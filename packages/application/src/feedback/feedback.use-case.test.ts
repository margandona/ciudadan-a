import { describe, expect, it } from "vitest";
import { ROLES, type Feedback } from "@pclab/shared";
import type { FeedbackRepository } from "../ports";
import { GetFeedbackTendenciesUseCase, SubmitFeedbackUseCase } from "./feedback.use-case";

class FakeFeedback implements FeedbackRepository {
  items: Feedback[] = [];
  async get(classId: string, studentId: string): Promise<Feedback | null> {
    return this.items.find((f) => f.classId === classId && f.studentId === studentId) ?? null;
  }
  async upsert(f: Feedback): Promise<Feedback> {
    const idx = this.items.findIndex((x) => x.classId === f.classId && x.studentId === f.studentId);
    if (idx >= 0) this.items[idx] = f;
    else this.items.push(f);
    return f;
  }
  async listByClass(courseId: string, classId: string): Promise<Feedback[]> {
    return this.items.filter((f) => f.courseId === courseId && f.classId === classId);
  }
}

const STUDENT = { uid: "s1", role: ROLES.ESTUDIANTE, courses: ["course-d"] };
const TEACHER = { uid: "t1", role: ROLES.PROFESOR, courses: ["course-d"] };

const input = {
  classId: "class-01",
  courseId: "course-d",
  studentId: "s1",
  anon: true,
  app: { easyToFind: 4, clear: 4, working: 5, open: "ok" },
  learning: { objective: 4, clarity: 5, helpful: 4, participated: 3, comfortable: 4, bestActivity: "x", change: "", keep: "y" },
};

describe("SubmitFeedbackUseCase", () => {
  it("guarda el feedback privado con anonimato", async () => {
    const repo = new FakeFeedback();
    const uc = new SubmitFeedbackUseCase({ feedback: repo });
    const saved = await uc.run(input, STUDENT);
    expect(saved.anon).toBe(true);
    expect(saved.studentId).toBe("s1");
  });

  it("impide enviar feedback ajeno", async () => {
    const uc = new SubmitFeedbackUseCase({ feedback: new FakeFeedback() });
    await expect(uc.run({ ...input, studentId: "s2" }, STUDENT)).rejects.toThrow(/propio/);
  });
});

describe("GetFeedbackTendenciesUseCase", () => {
  it("agrega solo las clases de feedback (1,4,7,10)", async () => {
    const repo = new FakeFeedback();
    await repo.upsert({ ...input, classId: "class-01" } as Feedback);
    await repo.upsert({ ...input, classId: "class-05" } as Feedback); // no es clase de feedback
    const uc = new GetFeedbackTendenciesUseCase({ feedback: repo });
    const tendencies = await uc.run("course-d", TEACHER);
    expect(tendencies.totalResponses).toBe(1);
    expect(tendencies.tendencies[0]!.classId).toBe("class-01");
  });
});
