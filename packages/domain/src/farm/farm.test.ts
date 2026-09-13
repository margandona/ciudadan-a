import { describe, expect, it } from "vitest";
import { FARM_ITEM_BY_ID } from "@pclab/shared";
import {
  aggregatePerks,
  canBuy,
  canPlant,
  checkGoldenHarvest,
  conceptXpAward,
  defaultFarmState,
  effectivePlotCapacity,
  growthDurationMs,
  harvestRewards,
  levelFromXp,
  plotCapacityForLevel,
  progressFromXp,
  readyAtFor,
  syncPlots,
} from "./farm";

const wheat = FARM_ITEM_BY_ID["crop-wheat"]!;
const hoe = FARM_ITEM_BY_ID["tool-hoe"]!;
const gardener = FARM_ITEM_BY_ID["npc-gardener"]!;
const pencil = FARM_ITEM_BY_ID["weapon-pencil"]!;
const tractor = FARM_ITEM_BY_ID["tool-tractor"]!;

describe("farm domain", () => {
  it("deriva nivel y progreso con tope 100%", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(149)).toBe(1);
    expect(levelFromXp(150)).toBe(2);
    expect(progressFromXp(0)).toBe(0);
    expect(progressFromXp(75)).toBe(50);
    expect(progressFromXp(149)).toBe(99);
    expect(progressFromXp(150)).toBe(0);
    expect(progressFromXp(-10)).toBe(0);
  });

  it("calcula la capacidad de casillas por nivel", () => {
    expect(plotCapacityForLevel(1)).toBe(4);
    expect(plotCapacityForLevel(5)).toBe(8);
    expect(plotCapacityForLevel(100)).toBe(20);
  });

  it("crea una granja por defecto con monedas y semillas", () => {
    const state = defaultFarmState("s1", "2026-01-01T00:00:00.000Z");
    expect(state.coins).toBe(60);
    expect(state.seeds).toBe(6);
    expect(state.plots).toHaveLength(4);
    expect(state.inventory).toEqual([]);
    expect(state.bonusXp).toBe(0);
  });

  it("agrega los perks de los objetos poseídos", () => {
    const perks = aggregatePerks([hoe, gardener, pencil]);
    expect(perks.growthSpeedPercent).toBe(10);
    expect(perks.seedBonus).toBe(1);
    expect(perks.xpBonusPercent).toBe(10);
    expect(perks.coinBonusPercent).toBe(0);
  });

  it("aplica casillas extra y tope de crecimiento", () => {
    const perks = aggregatePerks([FARM_ITEM_BY_ID["npc-mayor"]!, hoe, FARM_ITEM_BY_ID["tool-watering"]!]);
    expect(perks.unlockPlots).toBe(1);
    expect(effectivePlotCapacity(1, perks)).toBe(5);
  });

  it("reduce el tiempo de crecimiento según perks", () => {
    expect(growthDurationMs(wheat, 0)).toBe(30000);
    expect(growthDurationMs(wheat, 50)).toBe(15000);
    const readyAt = readyAtFor(wheat, "2026-01-01T00:00:00.000Z", 0);
    expect(readyAt).toBe("2026-01-01T00:00:30.000Z");
  });

  it("calcula recompensas de cosecha con bonuses", () => {
    const perks = aggregatePerks([gardener, pencil, FARM_ITEM_BY_ID["tool-sickle"]!]);
    const rewards = harvestRewards(wheat, perks);
    expect(rewards.coins).toBe(11);
    expect(rewards.seeds).toBe(2);
    expect(rewards.xp).toBe(4);
  });

  it("valida compras por nivel, monedas y duplicados", () => {
    const state = defaultFarmState("s1", "2026-01-01T00:00:00.000Z");
    expect(canBuy(state, hoe, 1).ok).toBe(true);
    expect(canBuy(state, wheat, 1).ok).toBe(false);
    expect(canBuy(state, tractor, 1).ok).toBe(false);
    state.coins = 0;
    expect(canBuy(state, hoe, 1).ok).toBe(false);
    state.coins = 100;
    state.inventory.push({ itemId: hoe.id, acquiredAt: "2026-01-01T00:00:00.000Z", quantity: 1 });
    expect(canBuy(state, hoe, 1).ok).toBe(false);
  });

  it("valida plantar según casilla, nivel y semillas", () => {
    const state = defaultFarmState("s1", "2026-01-01T00:00:00.000Z");
    expect(canPlant(state, state.plots[0], wheat, 1).ok).toBe(true);
    expect(canPlant(state, undefined, wheat, 1).ok).toBe(false);
    const grape = FARM_ITEM_BY_ID["crop-grape"]!;
    expect(canPlant(state, state.plots[0], grape, 1).ok).toBe(false);
    state.seeds = 0;
    expect(canPlant(state, state.plots[0], wheat, 1).ok).toBe(false);
  });

  it("sincroniza casillas y detecta la cosecha dorada", () => {
    const state = defaultFarmState("s1", "2026-01-01T00:00:00.000Z");
    const plots = syncPlots(state, 6);
    expect(plots).toHaveLength(6);
    expect(plots.every((p) => p.unlocked)).toBe(true);
    state.plots = plots;
    state.totalHarvests = 30;
    expect(checkGoldenHarvest(state, 6, true)).toBe(true);
    expect(checkGoldenHarvest(state, 6, false)).toBe(false);
  });

  it("otorga XP de conceptos solo la primera vez", () => {
    expect(conceptXpAward(100, false, 0)).toBe(100);
    expect(conceptXpAward(100, false, 10)).toBe(110);
    expect(conceptXpAward(100, true, 10)).toBe(0);
  });
});
