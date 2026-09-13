import { computed, ref } from "vue";
import type { BuyFarmItemResult, FarmActionResult, FarmSnapshot } from "@pclab/shared";
import {
  buyFarmItem as buyFarmItemApi,
  equipFarmItem as equipFarmItemApi,
  getFarm,
  harvestPlot as harvestPlotApi,
  plantSeed as plantSeedApi,
} from "@/services/importApi";

/**
 * Estado reactivo de la Granja Ciudadana. Toda la persistencia es
 * server-authoritative: este composable solo orquesta llamadas a Cloud Functions.
 */
export function useFarm() {
  const snapshot = ref<FarmSnapshot | null>(null);
  const loading = ref(false);
  const busy = ref(false);
  const error = ref("");

  function messageOf(e: unknown, fallback: string): string {
    return e instanceof Error ? e.message : fallback;
  }

  async function load(courseId: string): Promise<void> {
    loading.value = true;
    error.value = "";
    try {
      snapshot.value = await getFarm(courseId);
    } catch (e) {
      error.value = messageOf(e, "No se pudo cargar la granja.");
    } finally {
      loading.value = false;
    }
  }

  async function plant(courseId: string, plotIndex: number, cropId: string): Promise<FarmSnapshot | null> {
    busy.value = true;
    error.value = "";
    try {
      const snap = await plantSeedApi(courseId, plotIndex, cropId);
      snapshot.value = snap;
      return snap;
    } catch (e) {
      error.value = messageOf(e, "No se pudo plantar.");
      return null;
    } finally {
      busy.value = false;
    }
  }

  async function harvest(courseId: string, plotIndex: number): Promise<FarmActionResult | null> {
    busy.value = true;
    error.value = "";
    try {
      const result = await harvestPlotApi(courseId, plotIndex);
      snapshot.value = result.farm;
      return result;
    } catch (e) {
      error.value = messageOf(e, "No se pudo cosechar.");
      return null;
    } finally {
      busy.value = false;
    }
  }

  async function buy(courseId: string, itemId: string): Promise<BuyFarmItemResult | null> {
    busy.value = true;
    error.value = "";
    try {
      const result = await buyFarmItemApi(courseId, itemId);
      snapshot.value = result.farm;
      return result;
    } catch (e) {
      error.value = messageOf(e, "No se pudo comprar.");
      return null;
    } finally {
      busy.value = false;
    }
  }

  async function equip(courseId: string, itemId: string): Promise<FarmSnapshot | null> {
    busy.value = true;
    error.value = "";
    try {
      const snap = await equipFarmItemApi(courseId, itemId);
      snapshot.value = snap;
      return snap;
    } catch (e) {
      error.value = messageOf(e, "No se pudo equipar.");
      return null;
    } finally {
      busy.value = false;
    }
  }

  const level = computed(() => snapshot.value?.level ?? 1);
  const xp = computed(() => snapshot.value?.xp ?? 0);
  const progressToNext = computed(() => snapshot.value?.progressToNext ?? 0);
  const coins = computed(() => snapshot.value?.state.coins ?? 0);
  const seeds = computed(() => snapshot.value?.state.seeds ?? 0);
  const plots = computed(() => snapshot.value?.state.plots ?? []);
  const inventory = computed(() => snapshot.value?.state.inventory ?? []);
  const equipped = computed(() => snapshot.value?.state.equipped ?? {});
  const perks = computed(() => snapshot.value?.perks ?? null);
  const goldenHarvest = computed(() => snapshot.value?.goldenHarvest ?? false);
  const conceptLevelsPassed = computed(() => snapshot.value?.state.conceptLevelsPassed ?? []);

  return {
    snapshot,
    loading,
    busy,
    error,
    level,
    xp,
    progressToNext,
    coins,
    seeds,
    plots,
    inventory,
    equipped,
    perks,
    goldenHarvest,
    conceptLevelsPassed,
    load,
    plant,
    harvest,
    buy,
    equip,
  };
}
