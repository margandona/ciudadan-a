import type {
  FarmItem,
  FarmPerk,
  FarmPlot,
  FarmRewards,
  FarmState,
  InventoryEntry,
} from "@pclab/shared";
import { FARM_ITEM_BY_ID, PLACED_BONUS_CAP, PLACED_BONUS_CATEGORY } from "@pclab/shared";

/** XP necesaria por nivel (coincide con `getStudentGamification`). */
export const XP_PER_LEVEL = 150;
/** Tope de casillas de la parcela. */
export const MAX_PLOTS = 20;
/** Reducción máxima del tiempo de crecimiento por perks. */
export const MAX_GROWTH_REDUCTION = 70;
export const BASE_PLOT_CAPACITY = 3;
export const GOLDEN_HARVEST_TARGET = 30;

export interface FarmPerkTotals {
  xpBonusPercent: number;
  coinBonusPercent: number;
  growthSpeedPercent: number;
  seedBonus: number;
  unlockPlots: number;
  conceptHints: number;
}

export const EMPTY_PERKS: FarmPerkTotals = {
  xpBonusPercent: 0,
  coinBonusPercent: 0,
  growthSpeedPercent: 0,
  seedBonus: 0,
  unlockPlots: 0,
  conceptHints: 0,
};

export function levelFromXp(xp: number): number {
  return Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
}

/** Progreso dentro del nivel, siempre entre 0 y 100. */
export function progressFromXp(xp: number): number {
  const safe = Math.max(0, xp);
  const inLevel = safe % XP_PER_LEVEL;
  return Math.min(100, Math.round((inLevel / XP_PER_LEVEL) * 100));
}

export function plotCapacityForLevel(level: number): number {
  return Math.min(MAX_PLOTS, BASE_PLOT_CAPACITY + Math.max(1, level));
}

export function defaultFarmState(studentId: string, at: string): FarmState {
  const capacity = plotCapacityForLevel(1);
  return {
    studentId,
    coins: 60,
    seeds: 6,
    plots: Array.from({ length: capacity }, (_, index) => ({ index, unlocked: true })),
    inventory: [],
    equipped: {},
    unlockedAvatarStyles: [],
    notices: [],
    activityXp: 0,
    bonusXp: 0,
    conceptLevelsPassed: [],
    totalHarvests: 0,
    goldenHarvest: false,
    createdAt: at,
    updatedAt: at,
  };
}

export function ownedItems(state: FarmState): FarmItem[] {
  const items: FarmItem[] = [];
  for (const entry of state.inventory) {
    const item = FARM_ITEM_BY_ID[entry.itemId];
    if (item) items.push(item);
  }
  return items;
}

export function hasItem(state: FarmState, itemId: string): boolean {
  return state.inventory.some((entry) => entry.itemId === itemId);
}

function applyPerk(totals: FarmPerkTotals, perk: FarmPerk): void {
  switch (perk.kind) {
    case "xp_bonus":
      totals.xpBonusPercent += perk.value;
      break;
    case "coin_bonus":
      totals.coinBonusPercent += perk.value;
      break;
    case "growth_speed":
      totals.growthSpeedPercent += perk.value;
      break;
    case "seed_bonus":
      totals.seedBonus += perk.value;
      break;
    case "unlock_plot":
      totals.unlockPlots += perk.value;
      break;
    case "concept_hint":
      totals.conceptHints += perk.value;
      break;
  }
}

/** Suma los perks de los objetos poseídos (los perks aplican al poseerlos). */
export function aggregatePerks(items: FarmItem[]): FarmPerkTotals {
  const totals: FarmPerkTotals = { ...EMPTY_PERKS };
  for (const item of items) {
    if (item.perk) applyPerk(totals, item.perk);
  }
  totals.growthSpeedPercent = Math.min(MAX_GROWTH_REDUCTION, totals.growthSpeedPercent);
  return totals;
}

/** Objetos colocados en la escena que la estudiante posee. */
export function placedItemCount(state: FarmState): number {
  const owned = new Set(state.inventory.map((entry) => entry.itemId));
  return Object.keys(state.layout ?? {}).filter((id) => owned.has(id)).length;
}

export interface PlacementBonuses {
  coinBonusPercent: number;
  xpBonusPercent: number;
  growthSpeedPercent: number;
}

/** Bonus que aportan los objetos colocados, según su categoría (con topes). */
export function placementBonuses(state: FarmState): PlacementBonuses {
  const owned = new Set(state.inventory.map((entry) => entry.itemId));
  let coin = 0;
  let xp = 0;
  let growth = 0;
  for (const id of Object.keys(state.layout ?? {})) {
    if (!owned.has(id)) continue;
    const item = FARM_ITEM_BY_ID[id];
    const bonus = item ? PLACED_BONUS_CATEGORY[item.category] : undefined;
    if (!bonus) continue;
    coin += bonus.coin ?? 0;
    xp += bonus.xp ?? 0;
    growth += bonus.growth ?? 0;
  }
  return {
    coinBonusPercent: Math.min(PLACED_BONUS_CAP, coin),
    xpBonusPercent: Math.min(PLACED_BONUS_CAP, xp),
    growthSpeedPercent: Math.min(PLACED_BONUS_CAP, growth),
  };
}

export function perksForState(state: FarmState): FarmPerkTotals {
  const base = aggregatePerks(ownedItems(state));
  const placement = placementBonuses(state);
  return {
    ...base,
    coinBonusPercent: base.coinBonusPercent + placement.coinBonusPercent,
    xpBonusPercent: base.xpBonusPercent + placement.xpBonusPercent,
    growthSpeedPercent: Math.min(MAX_GROWTH_REDUCTION, base.growthSpeedPercent + placement.growthSpeedPercent),
  };
}

/** Capacidad total = base por nivel + casillas extra por perks. */
export function effectivePlotCapacity(level: number, perks: FarmPerkTotals): number {
  return Math.min(MAX_PLOTS, plotCapacityForLevel(level) + perks.unlockPlots);
}

export function growthDurationMs(item: FarmItem, growthSpeedPercent: number): number {
  const seconds = Math.max(5, item.growthSeconds ?? 60);
  const factor = 1 - Math.min(MAX_GROWTH_REDUCTION, Math.max(0, growthSpeedPercent)) / 100;
  return Math.round(seconds * 1000 * factor);
}

export function readyAtFor(item: FarmItem, plantedAt: string, growthSpeedPercent: number): string {
  const start = new Date(plantedAt).getTime();
  return new Date(start + growthDurationMs(item, growthSpeedPercent)).toISOString();
}

export function isPlotReady(plot: FarmPlot, now: string): boolean {
  if (!plot.cropId || !plot.readyAt) return false;
  return new Date(plot.readyAt).getTime() <= new Date(now).getTime();
}

export function harvestRewards(item: FarmItem, perks: FarmPerkTotals): FarmRewards {
  const baseCoins = item.yieldCoins ?? 0;
  const baseXp = item.yieldXp ?? 0;
  return {
    coins: Math.round(baseCoins * (1 + perks.coinBonusPercent / 100)),
    seeds: 1 + perks.seedBonus,
    xp: Math.round(baseXp * (1 + perks.xpBonusPercent / 100)),
  };
}

export interface RuleCheck {
  ok: boolean;
  reason?: string;
}

export function canBuy(state: FarmState, item: FarmItem, level: number): RuleCheck {
  if (item.category === "crop" || item.cost <= 0) {
    return { ok: false, reason: "Este objeto no está en venta." };
  }
  if (level < item.levelRequired) {
    return { ok: false, reason: `Necesitas nivel ${item.levelRequired}.` };
  }
  if (hasItem(state, item.id)) {
    return { ok: false, reason: "Ya tienes este objeto." };
  }
  if (state.coins < item.cost) {
    return { ok: false, reason: "Monedas insuficientes." };
  }
  return { ok: true };
}

export function canPlant(state: FarmState, plot: FarmPlot | undefined, item: FarmItem, level: number): RuleCheck {
  if (!plot || !plot.unlocked) return { ok: false, reason: "Casilla bloqueada." };
  if (item.category !== "crop") return { ok: false, reason: "Solo puedes plantar cultivos." };
  if (level < item.levelRequired) return { ok: false, reason: `Necesitas nivel ${item.levelRequired}.` };
  if (plot.cropId) return { ok: false, reason: "La casilla ya tiene un cultivo." };
  if (state.seeds < (item.seedCost ?? 0)) return { ok: false, reason: "Semillas insuficientes." };
  return { ok: true };
}

/** Ajusta la parcela a la capacidad efectiva (desbloquea/crea casillas). */
export function syncPlots(state: FarmState, capacity: number): FarmPlot[] {
  const plots: FarmPlot[] = [];
  for (let index = 0; index < capacity; index++) {
    const existing = state.plots.find((p) => p.index === index);
    plots.push(existing ? { ...existing, unlocked: true } : { index, unlocked: true });
  }
  return plots;
}

export function checkGoldenHarvest(state: FarmState, capacity: number, legendaryOwned: boolean): boolean {
  if (state.goldenHarvest) return true;
  const allUnlocked = state.plots.length >= capacity && state.plots.every((p) => p.unlocked);
  return allUnlocked && state.totalHarvests >= GOLDEN_HARVEST_TARGET && legendaryOwned;
}

/** XP de granja otorgado por aprobar el quiz de conceptos de un nivel. */
export function conceptXpAward(baseReward: number, alreadyPassed: boolean, xpBonusPercent: number): number {
  if (alreadyPassed) return 0;
  return Math.round(baseReward * (1 + Math.max(0, xpBonusPercent) / 100));
}

export function addInventoryEntry(inventory: InventoryEntry[], itemId: string, at: string): InventoryEntry[] {
  const existing = inventory.find((entry) => entry.itemId === itemId);
  if (existing) {
    return inventory.map((entry) =>
      entry.itemId === itemId ? { ...entry, quantity: entry.quantity + 1 } : entry,
    );
  }
  return [...inventory, { itemId, acquiredAt: at, quantity: 1 }];
}
