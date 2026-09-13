import { Firestore } from "firebase-admin/firestore";
import type {
  ConceptQuiz,
  ConceptQuestionWithAnswer,
  FarmItemCategory,
  FarmNotice,
  FarmPlot,
  FarmState,
  InventoryEntry,
} from "@pclab/shared";
import type { ConceptQuizRepository, FarmRepository } from "@pclab/application";

function recordToFarm(studentId: string, data: Record<string, unknown>): FarmState {
  return {
    studentId,
    coins: Number(data.coins ?? 0),
    seeds: Number(data.seeds ?? 0),
    plots: Array.isArray(data.plots) ? (data.plots as FarmPlot[]) : [],
    inventory: Array.isArray(data.inventory) ? (data.inventory as InventoryEntry[]) : [],
    equipped: (data.equipped ?? {}) as Partial<Record<FarmItemCategory, string>>,
    unlockedAvatarStyles: Array.isArray(data.unlockedAvatarStyles)
      ? (data.unlockedAvatarStyles as string[])
      : [],
    notices: Array.isArray(data.notices) ? (data.notices as FarmNotice[]) : [],
    activityXp: Number(data.activityXp ?? 0),
    bonusXp: Number(data.bonusXp ?? 0),
    conceptLevelsPassed: Array.isArray(data.conceptLevelsPassed)
      ? (data.conceptLevelsPassed as number[])
      : [],
    totalHarvests: Number(data.totalHarvests ?? 0),
    goldenHarvest: Boolean(data.goldenHarvest),
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  };
}

export class FirestoreFarmRepository implements FarmRepository {
  constructor(private readonly db: Firestore) {}

  private ref(studentId: string) {
    return this.db.collection("farms").doc(studentId);
  }

  async get(studentId: string): Promise<FarmState | null> {
    const doc = await this.ref(studentId).get();
    if (!doc.exists) return null;
    return recordToFarm(studentId, doc.data() ?? {});
  }

  async save(state: FarmState): Promise<FarmState> {
    await this.ref(state.studentId).set(state, { merge: true });
    return state;
  }
}

function recordToConceptQuiz(data: Record<string, unknown>): ConceptQuiz {
  return {
    level: Number(data.level ?? 0),
    title: String(data.title ?? ""),
    passPercent: Number(data.passPercent ?? 70),
    xpReward: Number(data.xpReward ?? 40),
    questions: Array.isArray(data.questions) ? (data.questions as ConceptQuestionWithAnswer[]) : [],
  };
}

export class FirestoreConceptQuizRepository implements ConceptQuizRepository {
  constructor(private readonly db: Firestore) {}

  async getByLevel(level: number): Promise<ConceptQuiz | null> {
    const doc = await this.db.collection("conceptQuizzes").doc(String(level)).get();
    if (!doc.exists) return null;
    return recordToConceptQuiz(doc.data() ?? {});
  }
}
