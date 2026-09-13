import { ROLES } from "@pclab/shared";
import type {
  ConceptQuiz,
  ConceptQuizAnswerResult,
  ConceptQuizPublic,
  ConceptQuizResult,
  FarmActionResult,
  FarmNotice,
  FarmSnapshot,
  FarmState,
  BuyFarmItemResult,
} from "@pclab/shared";
import { AVATAR_STYLE_BY_ID, FARM_ITEM_BY_ID } from "@pclab/shared";
import {
  ValidationError,
  addInventoryEntry,
  canBuy,
  canPlant,
  checkGoldenHarvest,
  conceptXpAward,
  defaultFarmState,
  effectivePlotCapacity,
  harvestRewards,
  isPlotReady,
  levelFromXp,
  ownedItems,
  perksForState,
  progressFromXp,
  readyAtFor,
  syncPlots,
} from "@pclab/domain";
import type { AuthContext, ConceptQuizRepository, FarmRepository } from "../ports";
import { generateId } from "../id";

function isStaffRole(actor: AuthContext | null): boolean {
  if (!actor) return false;
  return actor.role === ROLES.PROFESOR || actor.role === ROLES.ADMIN || actor.role === ROLES.MASTER;
}

function assertFarmAccess(actor: AuthContext | null, studentId: string, write: boolean): void {
  if (!actor || actor.isServer) return;
  if (actor.uid === studentId) return;
  if (!write && isStaffRole(actor)) return;
  throw new ValidationError("No puedes acceder a esta granja.", "FORBIDDEN");
}

function assertStaff(actor: AuthContext | null): void {
  if (!actor || actor.isServer) return;
  if (!isStaffRole(actor)) {
    throw new ValidationError("Solo el equipo docente puede otorgar regalos.", "FORBIDDEN");
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

async function loadState(farm: FarmRepository, studentId: string, at: string): Promise<FarmState> {
  const existing = await farm.get(studentId);
  return existing ?? defaultFarmState(studentId, at);
}

/** Recalcula nivel, perks, capacidad y casillas usando el XP cacheado + bonus. */
function project(state: FarmState, at: string): { state: FarmState; snap: FarmSnapshot } {
  const xp = Math.max(0, state.activityXp) + state.bonusXp;
  const level = levelFromXp(xp);
  const perks = perksForState(state);
  const capacity = effectivePlotCapacity(level, perks);
  const plots = syncPlots(state, capacity);
  const next: FarmState = { ...state, plots, updatedAt: at };
  const legendaryOwned = ownedItems(next).some((item) => item.rarity === "legendary");
  next.goldenHarvest = checkGoldenHarvest(next, capacity, legendaryOwned);
  const snap: FarmSnapshot = {
    state: next,
    level,
    xp,
    progressToNext: progressFromXp(xp),
    plotCapacity: capacity,
    perks,
    goldenHarvest: next.goldenHarvest,
  };
  return { state: next, snap };
}

export interface FarmReadInput {
  studentId: string;
  /** XP de actividad calculado server-side (nunca provisto por el cliente). */
  activityXp: number;
}

export interface FarmMutateInput {
  studentId: string;
}

/** Obtiene (o crea) la granja y refresca el XP de actividad cacheado. */
export class GetFarmUseCase {
  constructor(private readonly deps: { farm: FarmRepository }) {}

  async run(input: FarmReadInput, actor: AuthContext | null): Promise<FarmSnapshot> {
    assertFarmAccess(actor, input.studentId, false);
    const at = nowIso();
    const state = await loadState(this.deps.farm, input.studentId, at);
    state.activityXp = Math.max(0, input.activityXp);
    const { state: next, snap } = project(state, at);
    await this.deps.farm.save(next);
    return snap;
  }
}

export interface PlantSeedInput extends FarmMutateInput {
  plotIndex: number;
  cropId: string;
}

export class PlantSeedUseCase {
  constructor(private readonly deps: { farm: FarmRepository }) {}

  async run(input: PlantSeedInput, actor: AuthContext | null): Promise<FarmSnapshot> {
    assertFarmAccess(actor, input.studentId, true);
    const at = nowIso();
    const state = await loadState(this.deps.farm, input.studentId, at);
    const { state: base, snap } = project(state, at);
    const crop = FARM_ITEM_BY_ID[input.cropId];
    if (!crop) throw new ValidationError("El cultivo no existe.", "NOT_FOUND");
    const plot = base.plots.find((p) => p.index === input.plotIndex);
    const check = canPlant(base, plot, crop, snap.level);
    if (!check.ok || !plot) throw new ValidationError(check.reason ?? "No puedes plantar aquí.", "PLANT_INVALID");
    base.plots = base.plots.map((p) =>
      p.index === input.plotIndex
        ? { ...p, cropId: crop.id, plantedAt: at, readyAt: readyAtFor(crop, at, snap.perks.growthSpeedPercent) }
        : p,
    );
    base.seeds -= crop.seedCost ?? 0;
    const saved = await this.deps.farm.save(base);
    return project(saved, at).snap;
  }
}

export interface HarvestInput extends FarmMutateInput {
  plotIndex: number;
}

export class HarvestPlotUseCase {
  constructor(private readonly deps: { farm: FarmRepository }) {}

  async run(input: HarvestInput, actor: AuthContext | null): Promise<FarmActionResult> {
    assertFarmAccess(actor, input.studentId, true);
    const at = nowIso();
    const state = await loadState(this.deps.farm, input.studentId, at);
    const { state: base, snap } = project(state, at);
    const plot = base.plots.find((p) => p.index === input.plotIndex);
    if (!plot?.cropId) throw new ValidationError("No hay nada que cosechar.", "HARVEST_EMPTY");
    if (!isPlotReady(plot, at)) throw new ValidationError("El cultivo aún no está listo.", "HARVEST_NOT_READY");
    const crop = FARM_ITEM_BY_ID[plot.cropId];
    if (!crop) throw new ValidationError("El cultivo no existe.", "NOT_FOUND");
    const rewards = harvestRewards(crop, snap.perks);
    base.coins += rewards.coins;
    base.seeds += rewards.seeds;
    base.bonusXp += rewards.xp;
    base.totalHarvests += 1;
    base.plots = base.plots.map((p) => (p.index === input.plotIndex ? { index: p.index, unlocked: p.unlocked } : p));
    const saved = await this.deps.farm.save(base);
    return { farm: project(saved, at).snap, rewards, message: `Cosechaste ${crop.name}.` };
  }
}

export interface BuyFarmItemInput extends FarmMutateInput {
  itemId: string;
}

export class BuyFarmItemUseCase {
  constructor(private readonly deps: { farm: FarmRepository }) {}

  async run(input: BuyFarmItemInput, actor: AuthContext | null): Promise<BuyFarmItemResult> {
    assertFarmAccess(actor, input.studentId, true);
    const at = nowIso();
    const state = await loadState(this.deps.farm, input.studentId, at);
    const { state: base, snap } = project(state, at);
    const item = FARM_ITEM_BY_ID[input.itemId];
    if (!item) throw new ValidationError("El objeto no existe.", "NOT_FOUND");
    const check = canBuy(base, item, snap.level);
    if (!check.ok) throw new ValidationError(check.reason ?? "No puedes comprar esto.", "BUY_INVALID");
    base.coins -= item.cost;
    base.inventory = addInventoryEntry(base.inventory, item.id, at);
    if (item.category !== "decoration" && !base.equipped[item.category]) {
      base.equipped[item.category] = item.id;
    }
    const saved = await this.deps.farm.save(base);
    return { farm: project(saved, at).snap, item, message: `Compraste ${item.name}.` };
  }
}

export interface EquipFarmItemInput extends FarmMutateInput {
  itemId: string;
}

export class EquipFarmItemUseCase {
  constructor(private readonly deps: { farm: FarmRepository }) {}

  async run(input: EquipFarmItemInput, actor: AuthContext | null): Promise<FarmSnapshot> {
    assertFarmAccess(actor, input.studentId, true);
    const at = nowIso();
    const state = await loadState(this.deps.farm, input.studentId, at);
    const item = FARM_ITEM_BY_ID[input.itemId];
    if (!item) throw new ValidationError("El objeto no existe.", "NOT_FOUND");
    if (!state.inventory.some((entry) => entry.itemId === item.id)) {
      throw new ValidationError("No tienes este objeto.", "NOT_OWNED");
    }
    if (state.equipped[item.category] === item.id) {
      delete state.equipped[item.category];
    } else {
      state.equipped[item.category] = item.id;
    }
    state.updatedAt = at;
    const saved = await this.deps.farm.save(state);
    return project(saved, at).snap;
  }
}

function sanitize(quiz: ConceptQuiz): ConceptQuizPublic {
  return {
    level: quiz.level,
    title: quiz.title,
    passPercent: quiz.passPercent,
    xpReward: quiz.xpReward,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      concept: q.concept,
      explanation: q.explanation,
    })),
  };
}

export class GetConceptQuizUseCase {
  constructor(private readonly deps: { quizzes: ConceptQuizRepository }) {}

  async run(input: { level: number }, actor: AuthContext | null): Promise<ConceptQuizPublic> {
    if (!actor) throw new ValidationError("Sesión requerida.", "UNAUTHENTICATED");
    const quiz = await this.deps.quizzes.getByLevel(input.level);
    if (!quiz) throw new ValidationError("No hay desafío para este nivel.", "NOT_FOUND");
    return sanitize(quiz);
  }
}

export interface SubmitConceptQuizInput extends FarmMutateInput {
  level: number;
  answers: { id: string; given: number }[];
}

export class SubmitConceptQuizUseCase {
  constructor(private readonly deps: { quizzes: ConceptQuizRepository; farm: FarmRepository }) {}

  async run(
    input: SubmitConceptQuizInput,
    actor: AuthContext | null,
  ): Promise<{ result: ConceptQuizResult; farm: FarmSnapshot }> {
    assertFarmAccess(actor, input.studentId, true);
    const quiz = await this.deps.quizzes.getByLevel(input.level);
    if (!quiz) throw new ValidationError("No hay desafío para este nivel.", "NOT_FOUND");
    const givenById = new Map(input.answers.map((a) => [a.id, a.given]));
    const results: ConceptQuizAnswerResult[] = quiz.questions.map((q) => {
      const given = givenById.get(q.id);
      return {
        id: q.id,
        correct: typeof given === "number" && given === q.correctIndex,
        correctIndex: q.correctIndex,
        concept: q.concept,
        explanation: q.explanation,
      };
    });
    const total = quiz.questions.length;
    const score = results.filter((r) => r.correct).length;
    const percent = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed = percent >= quiz.passPercent;

    const at = nowIso();
    const state = await loadState(this.deps.farm, input.studentId, at);
    const alreadyPassed = state.conceptLevelsPassed.includes(input.level);
    const perks = perksForState(state);
    let xpAwarded = 0;
    if (passed && !alreadyPassed) {
      xpAwarded = conceptXpAward(quiz.xpReward, alreadyPassed, perks.xpBonusPercent);
      state.bonusXp += xpAwarded;
      state.conceptLevelsPassed = [...state.conceptLevelsPassed, input.level].sort((a, b) => a - b);
      state.updatedAt = at;
      await this.deps.farm.save(state);
    }

    const result: ConceptQuizResult = {
      level: input.level,
      score,
      total,
      percent,
      passed,
      alreadyPassed,
      xpAwarded,
      results,
    };
    const fresh = await loadState(this.deps.farm, input.studentId, at);
    return { result, farm: project(fresh, at).snap };
  }
}

export type TeacherGrantKind = "avatar" | "item" | "currency";

export interface TeacherGrantInput {
  studentId: string;
  kind: TeacherGrantKind;
  styleId?: string;
  itemId?: string;
  coins?: number;
  seeds?: number;
}

/** El docente regala avatares premium, objetos de la granja o monedas/semillas. */
export class TeacherGrantUseCase {
  constructor(private readonly deps: { farm: FarmRepository }) {}

  async run(input: TeacherGrantInput, actor: AuthContext | null): Promise<FarmSnapshot> {
    assertStaff(actor);
    const at = nowIso();
    const state = await loadState(this.deps.farm, input.studentId, at);

    let noticeKind: FarmNotice["kind"];
    let label: string;

    if (input.kind === "avatar") {
      const style = input.styleId ? AVATAR_STYLE_BY_ID[input.styleId] : undefined;
      if (!style) throw new ValidationError("El estilo de avatar no existe.", "NOT_FOUND");
      if (!state.unlockedAvatarStyles.includes(style.id)) {
        state.unlockedAvatarStyles = [...state.unlockedAvatarStyles, style.id];
      }
      noticeKind = "avatar";
      label = `${style.emoji} ${style.label}`;
    } else if (input.kind === "item") {
      const item = input.itemId ? FARM_ITEM_BY_ID[input.itemId] : undefined;
      if (!item) throw new ValidationError("El objeto no existe.", "NOT_FOUND");
      state.inventory = addInventoryEntry(state.inventory, item.id, at);
      noticeKind = "item";
      label = `${item.icon} ${item.name}`;
    } else {
      const coins = Math.max(0, Math.floor(input.coins ?? 0));
      const seeds = Math.max(0, Math.floor(input.seeds ?? 0));
      if (coins === 0 && seeds === 0) throw new ValidationError("Indica monedas o semillas.", "GRANT_EMPTY");
      state.coins += coins;
      state.seeds += seeds;
      noticeKind = "coins";
      label = [coins ? `+${coins} monedas` : "", seeds ? `+${seeds} semillas` : ""].filter(Boolean).join(" · ");
    }

    state.notices = [...state.notices, { id: generateId(), kind: noticeKind, label, at }].slice(-20);
    state.updatedAt = at;
    const saved = await this.deps.farm.save(state);
    return project(saved, at).snap;
  }
}

export interface SaveFarmLayoutInput {
  studentId: string;
  layout: Record<string, { x: number; y: number }>;
}

/**
 * Guarda las posiciones de los objetos colocados (server-authoritative).
 * Solo acepta objetos que la estudiante posee y posiciones dentro de la escena.
 */
export class SaveFarmLayoutUseCase {
  constructor(private readonly deps: { farm: FarmRepository }) {}

  async run(input: SaveFarmLayoutInput, actor: AuthContext | null): Promise<FarmSnapshot> {
    assertFarmAccess(actor, input.studentId, true);
    const at = nowIso();
    const state = await loadState(this.deps.farm, input.studentId, at);
    const owned = new Set(state.inventory.map((entry) => entry.itemId));
    const layout: Record<string, { x: number; y: number }> = {};
    let count = 0;
    for (const [id, pos] of Object.entries(input.layout ?? {})) {
      if (!owned.has(id) || count >= 60) continue;
      const x = Number(pos?.x);
      const y = Number(pos?.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      layout[id] = { x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) };
      count++;
    }
    state.layout = layout;
    state.updatedAt = at;
    const saved = await this.deps.farm.save(state);
    return project(saved, at).snap;
  }
}
