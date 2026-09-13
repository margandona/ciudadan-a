import { describe, expect, it } from "vitest";
import type { ConceptQuiz, FarmState } from "@pclab/shared";
import {
  BuyFarmItemUseCase,
  EquipFarmItemUseCase,
  GetFarmUseCase,
  HarvestPlotUseCase,
  PlantSeedUseCase,
  SubmitConceptQuizUseCase,
  TeacherGrantUseCase,
} from "./farm.use-case";
import type { AuthContext, ConceptQuizRepository, FarmRepository } from "../ports";

class FakeFarm implements FarmRepository {
  states = new Map<string, FarmState>();
  async get(studentId: string): Promise<FarmState | null> {
    return this.states.get(studentId) ?? null;
  }
  async save(state: FarmState): Promise<FarmState> {
    this.states.set(state.studentId, state);
    return state;
  }
}

class FakeConceptQuizzes implements ConceptQuizRepository {
  constructor(private readonly quiz: ConceptQuiz | null) {}
  async getByLevel(level: number): Promise<ConceptQuiz | null> {
    return this.quiz && this.quiz.level === level ? this.quiz : null;
  }
}

const actor: AuthContext = { uid: "s1", role: "ESTUDIANTE", courses: ["c1"] };
const other: AuthContext = { uid: "s2", role: "ESTUDIANTE", courses: ["c1"] };

const quiz: ConceptQuiz = {
  level: 1,
  title: "Ciudadanía",
  passPercent: 70,
  xpReward: 40,
  questions: [
    { id: "q1", prompt: "A", options: ["x", "y"], concept: "c", correctIndex: 1 },
    { id: "q2", prompt: "B", options: ["x", "y"], concept: "c", correctIndex: 0 },
  ],
};

describe("farm use cases", () => {
  it("crea y devuelve la granja con nivel y perks", async () => {
    const repo = new FakeFarm();
    const uc = new GetFarmUseCase({ farm: repo });
    const snap = await uc.run({ studentId: "s1", activityXp: 160 }, actor);
    expect(snap.level).toBe(2);
    expect(snap.progressToNext).toBe(7);
    expect(snap.state.coins).toBe(60);
    expect(snap.plotCapacity).toBe(5);
  });

  it("impide que otra estudiante acceda a la granja", async () => {
    const repo = new FakeFarm();
    const uc = new GetFarmUseCase({ farm: repo });
    await expect(uc.run({ studentId: "s1", activityXp: 0 }, other)).rejects.toThrow();
  });

  it("planta un cultivo descontando semillas", async () => {
    const repo = new FakeFarm();
    const uc = new PlantSeedUseCase({ farm: repo });
    const snap = await uc.run({ studentId: "s1", plotIndex: 0, cropId: "crop-wheat" }, actor);
    expect(snap.state.seeds).toBe(2);
    expect(snap.state.plots[0]!.cropId).toBe("crop-wheat");
    expect(snap.state.plots[0]!.readyAt).toBeTruthy();
  });

  it("no cosecha un cultivo inmaduro y sí uno listo", async () => {
    const repo = new FakeFarm();
    const plant = new PlantSeedUseCase({ farm: repo });
    await plant.run({ studentId: "s1", plotIndex: 0, cropId: "crop-wheat" }, actor);
    const harvest = new HarvestPlotUseCase({ farm: repo });
    await expect(harvest.run({ studentId: "s1", plotIndex: 0 }, actor)).rejects.toThrow();

    const state = repo.states.get("s1")!;
    state.plots[0] = { index: 0, unlocked: true, cropId: "crop-wheat", plantedAt: state.createdAt, readyAt: "2000-01-01T00:00:00.000Z" };
    await repo.save(state);

    const result = await harvest.run({ studentId: "s1", plotIndex: 0 }, actor);
    expect(result.rewards?.coins).toBe(10);
    expect(result.farm.state.coins).toBe(70);
    expect(result.farm.state.bonusXp).toBe(4);
    expect(result.farm.state.totalHarvests).toBe(1);
  });

  it("compra un objeto, lo equipa y lo desequipa", async () => {
    const repo = new FakeFarm();
    const buy = new BuyFarmItemUseCase({ farm: repo });
    const bought = await buy.run({ studentId: "s1", itemId: "tool-hoe" }, actor);
    expect(bought.farm.state.coins).toBe(10);
    expect(bought.farm.state.inventory.some((e) => e.itemId === "tool-hoe")).toBe(true);
    expect(bought.farm.state.equipped.tool).toBe("tool-hoe");

    const equip = new EquipFarmItemUseCase({ farm: repo });
    const unequipped = await equip.run({ studentId: "s1", itemId: "tool-hoe" }, actor);
    expect(unequipped.state.equipped.tool).toBeUndefined();
  });

  it("califica el quiz de conceptos y otorga XP una sola vez", async () => {
    const repo = new FakeFarm();
    const uc = new SubmitConceptQuizUseCase({ quizzes: new FakeConceptQuizzes(quiz), farm: repo });
    const first = await uc.run(
      { studentId: "s1", level: 1, answers: [{ id: "q1", given: 1 }, { id: "q2", given: 0 }] },
      actor,
    );
    expect(first.result.passed).toBe(true);
    expect(first.result.percent).toBe(100);
    expect(first.result.xpAwarded).toBe(40);
    expect(first.farm.state.bonusXp).toBe(40);
    expect(first.farm.state.conceptLevelsPassed).toEqual([1]);

    const second = await uc.run(
      { studentId: "s1", level: 1, answers: [{ id: "q1", given: 0 }, { id: "q2", given: 1 }] },
      actor,
    );
    expect(second.result.passed).toBe(false);
    expect(second.result.alreadyPassed).toBe(true);
    expect(second.result.xpAwarded).toBe(0);
  });

  it("permite al docente regalar avatar premium, objeto y monedas/semillas", async () => {
    const repo = new FakeFarm();
    const uc = new TeacherGrantUseCase({ farm: repo });
    const teacher: AuthContext = { uid: "t1", role: "PROFESOR", courses: ["c1"] };

    const avatar = await uc.run({ studentId: "s1", kind: "avatar", styleId: "pixel-art" }, teacher);
    expect(avatar.state.unlockedAvatarStyles).toContain("pixel-art");
    expect(avatar.state.notices.some((n) => n.kind === "avatar")).toBe(true);

    const item = await uc.run({ studentId: "s1", kind: "item", itemId: "tool-hoe" }, teacher);
    expect(item.state.inventory.some((e) => e.itemId === "tool-hoe")).toBe(true);

    const currency = await uc.run({ studentId: "s1", kind: "currency", coins: 100, seeds: 5 }, teacher);
    expect(currency.state.coins).toBe(160);
    expect(currency.state.seeds).toBe(11);
  });

  it("impide que una estudiante se regale a sí misma", async () => {
    const repo = new FakeFarm();
    const uc = new TeacherGrantUseCase({ farm: repo });
    await expect(uc.run({ studentId: "s1", kind: "currency", coins: 100 }, actor)).rejects.toThrow();
  });
});
