<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import type { FarmItem, FarmPlot } from "@pclab/shared";
import {
  CONCEPT_QUIZ_MAX_LEVEL,
  FARM_CATALOG,
  FARM_CATEGORY_LABELS,
  FARM_CATEGORY_ORDER,
  FARM_ITEM_BY_ID,
} from "@pclab/shared";
import { growthDurationMs } from "@pclab/domain";
import { useSessionStore } from "@/stores/session";
import { useFarm } from "@/composables/useFarm";
import { useAvatar } from "@/composables/useAvatar";
import { celebrate } from "@/composables/useConfetti";
import { notify, notifyLevelUp } from "@/composables/useNotify";
import AppIcon from "@/components/ui/AppIcon.vue";
import Avatar from "@/components/ui/Avatar.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const session = useSessionStore();
const router = useRouter();
const farm = useFarm();
const avatar = useAvatar();

const courseId = computed(() => session.courseId ?? "");
const crops = computed(() => FARM_CATALOG.filter((item) => item.category === "crop"));
const shopItems = computed(() => FARM_CATALOG.filter((item) => item.category !== "crop"));
const shopCategories = computed(() => FARM_CATEGORY_ORDER.filter((cat) => cat !== "crop"));
const ownedIds = computed(() => new Set(farm.inventory.value.map((entry) => entry.itemId)));
const hasConceptQuiz = computed(() => farm.level.value <= CONCEPT_QUIZ_MAX_LEVEL);
const outfitEmoji = computed(() => emojiForSlot("clothing"));
const accessoryEmoji = computed(() => emojiForSlot("accessory"));

function emojiForSlot(category: FarmItem["category"]): string | undefined {
  const id = farm.equipped.value[category];
  return id ? FARM_ITEM_BY_ID[id]?.icon : undefined;
}

const panel = ref<"shop" | "inventory" | null>(null);
const shopCategory = ref<FarmItem["category"]>("npc");
const cropPickerPlot = ref<number | null>(null);
const now = ref(Date.now());
let timer: number | undefined;

onMounted(() => {
  if (courseId.value) void farm.load(courseId.value);
  timer = window.setInterval(() => {
    now.value = Date.now();
  }, 1000);
});
onUnmounted(() => {
  if (timer) window.clearInterval(timer);
});

interface PlotView {
  crop?: FarmItem;
  ready: boolean;
  remainingMs: number;
  progress: number;
}

function plotInfo(plot: FarmPlot): PlotView {
  const crop = plot.cropId ? FARM_ITEM_BY_ID[plot.cropId] : undefined;
  if (!crop) return { ready: false, remainingMs: 0, progress: 0 };
  const readyAt = plot.readyAt ? new Date(plot.readyAt).getTime() : 0;
  const total = growthDurationMs(crop, farm.perks.value?.growthSpeedPercent ?? 0);
  const remainingMs = Math.max(0, readyAt - now.value);
  return {
    crop,
    ready: readyAt > 0 && readyAt <= now.value,
    remainingMs,
    progress: total > 0 ? Math.min(100, Math.round((1 - remainingMs / total) * 100)) : 100,
  };
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function cropAvailable(crop: FarmItem): boolean {
  return farm.level.value >= crop.levelRequired && farm.seeds.value >= (crop.seedCost ?? 0);
}

async function doPlant(cropId: string): Promise<void> {
  if (cropPickerPlot.value === null) return;
  await farm.plant(courseId.value, cropPickerPlot.value, cropId);
  cropPickerPlot.value = null;
}

async function doHarvest(plot: FarmPlot): Promise<void> {
  const before = farm.level.value;
  const result = await farm.harvest(courseId.value, plot.index);
  if (!result?.rewards) return;
  const cropName = plot.cropId ? FARM_ITEM_BY_ID[plot.cropId]?.name ?? "tu cultivo" : "tu cultivo";
  notify({
    kind: "xp",
    icon: "🌾",
    title: `Cosechaste ${cropName}`,
    detail: `+${result.rewards.coins} 🪙 · +${result.rewards.xp} XP · +${result.rewards.seeds} 🌰`,
  });
  celebrate();
  notifyLevelUp(before, farm.level.value);
}

function onPlotClick(plot: FarmPlot): void {
  if (!plot.unlocked || farm.busy.value) return;
  if (plotInfo(plot).ready) {
    void doHarvest(plot);
  } else if (!plot.cropId) {
    cropPickerPlot.value = plot.index;
  }
}

async function doBuy(item: FarmItem): Promise<void> {
  const result = await farm.buy(courseId.value, item.id);
  if (result) {
    notify({
      kind: "item",
      icon: "🛍️",
      title: `Compraste ${item.name}`,
      detail: `-${item.cost} 🪙 · ya está en tu inventario`,
    });
  }
}

async function doEquip(itemId: string): Promise<void> {
  await farm.equip(courseId.value, itemId);
}

function goConceptQuiz(): void {
  void router.push({ name: "student-concept-quiz", params: { level: String(farm.level.value) } });
}

function itemsByCategory(category: FarmItem["category"]): FarmItem[] {
  return shopItems.value.filter((item) => item.category === category);
}
</script>

<template>
  <section class="farm">
    <header class="farm-head">
      <div>
        <p class="eyebrow"><AppIcon name="farm" /> Granja Ciudadana</p>
        <h1>Cultiva tu bien común</h1>
        <p class="muted">
          Gana semillas y monedas con tus misiones, haz crecer tu parcela y compra ayudantes, herramientas y
          vestimenta. Cada objeto desbloquea mejoras.
        </p>
      </div>
      <button class="btn-ghost" @click="router.push('/student')"><AppIcon name="arrow" /> Volver a mis misiones</button>
    </header>

    <SkeletonRows v-if="farm.loading.value" />
    <AppErrorState v-else-if="farm.error.value" :message="farm.error.value" @retry="farm.load(courseId)" />

    <template v-else-if="farm.snapshot.value">
      <section class="farm-stats">
        <div class="stat"><span class="stat-ico">🪙</span><strong>{{ farm.coins.value }}</strong><small>monedas</small></div>
        <div class="stat"><span class="stat-ico">🌰</span><strong>{{ farm.seeds.value }}</strong><small>semillas</small></div>
        <div class="stat"><span class="stat-ico">🌾</span><strong>{{ farm.snapshot.value.state.totalHarvests }}</strong><small>cosechas</small></div>
        <div class="stat"><span class="stat-ico">⭐</span><strong>{{ farm.level.value }}</strong><small>nivel</small></div>
      </section>

      <section class="farm-level">
        <div class="level-row">
          <span>Nivel {{ farm.level.value }}</span>
          <span>{{ farm.progressToNext.value }}% para el próximo nivel</span>
        </div>
        <div class="bar"><div class="bar-fill" :style="{ width: `${farm.progressToNext.value}%` }"></div></div>
        <div class="level-actions">
          <button v-if="hasConceptQuiz" class="btn-primary" @click="goConceptQuiz">
            <AppIcon name="graduation" />
            {{ farm.conceptLevelsPassed.value.includes(farm.level.value) ? "Repetir desafío de conceptos" : "Desafío de conceptos (+XP)" }}
          </button>
          <span v-else class="muted small">¡Completaste todos los desafíos de conceptos!</span>
          <span v-if="farm.goldenHarvest.value" class="golden">🏆 ¡Cosecha dorada desbloqueada!</span>
        </div>
      </section>

      <section class="farm-main">
        <div class="character">
          <Avatar
            :seed="avatar.pref.value.seed"
            :style="avatar.pref.value.style"
            :level="farm.level.value"
            :size="132"
            :outfit="outfitEmoji"
            :accessory="accessoryEmoji"
          />
          <p class="muted small">Tu personaje viste lo que equipas en el inventario.</p>
        </div>

        <div class="plots">
          <h2>Mi parcela <small class="muted">({{ farm.plots.value.length }} casillas)</small></h2>
          <div class="plot-grid">
            <button
              v-for="plot in farm.plots.value"
              :key="plot.index"
              class="plot"
              :class="{ ready: plotInfo(plot).ready, growing: !!plotInfo(plot).crop && !plotInfo(plot).ready, locked: !plot.unlocked }"
              :disabled="farm.busy.value || !plot.unlocked"
              @click="onPlotClick(plot)"
            >
              <template v-if="plotInfo(plot).crop">
                <span class="plot-emoji">{{ plotInfo(plot).crop!.icon }}</span>
                <span v-if="plotInfo(plot).ready" class="plot-label">¡Cosechar!</span>
                <span v-else class="plot-label">{{ formatRemaining(plotInfo(plot).remainingMs) }}</span>
                <span class="plot-progress"><span :style="{ width: `${plotInfo(plot).progress}%` }"></span></span>
              </template>
              <template v-else-if="plot.unlocked">
                <span class="plot-plus">＋</span>
                <span class="plot-label">Plantar</span>
              </template>
              <template v-else>
                <span class="plot-plus">🔒</span>
                <span class="plot-label">Nivel {{ plot.index + 1 }}</span>
              </template>
            </button>
          </div>
        </div>
      </section>

      <section class="farm-actions">
        <button class="btn-primary-big" @click="panel = 'shop'"><AppIcon name="shop" /> Tienda</button>
        <button class="btn-ghost" @click="panel = 'inventory'"><AppIcon name="bag" /> Inventario ({{ ownedIds.size }})</button>
      </section>

      <section class="perks" v-if="farm.perks.value">
        <h2>Mejoras activas</h2>
        <div class="perk-grid">
          <span>⭐ XP +{{ farm.perks.value.xpBonusPercent }}%</span>
          <span>🪙 Monedas +{{ farm.perks.value.coinBonusPercent }}%</span>
          <span>⚡ Crecimiento +{{ farm.perks.value.growthSpeedPercent }}%</span>
          <span>🌰 Semillas +{{ farm.perks.value.seedBonus }}</span>
        </div>
      </section>
    </template>

    <Teleport to="body">
      <div v-if="cropPickerPlot !== null" class="overlay" @click.self="cropPickerPlot = null">
        <div class="modal" role="dialog" aria-modal="true" aria-label="Elegir cultivo">
          <div class="modal-head">
            <h2>¿Qué plantamos?</h2>
            <button class="close" aria-label="Cerrar" @click="cropPickerPlot = null">×</button>
          </div>
          <div class="card-grid">
            <button
              v-for="crop in crops"
              :key="crop.id"
              class="item-card"
              :disabled="!cropAvailable(crop) || farm.busy.value"
              @click="doPlant(crop.id)"
            >
              <span class="item-ico">{{ crop.icon }}</span>
              <strong>{{ crop.name }}</strong>
              <small>🌰 {{ crop.seedCost }} · 🪙 {{ crop.yieldCoins }} · +{{ crop.yieldXp }} XP</small>
              <small class="muted">{{ Math.round((crop.growthSeconds ?? 0)) }}s · nivel {{ crop.levelRequired }}</small>
            </button>
          </div>
        </div>
      </div>

      <div v-if="panel" class="overlay" @click.self="panel = null">
        <div class="modal wide" role="dialog" aria-modal="true" aria-label="Tienda e inventario">
          <div class="modal-head">
            <h2>{{ panel === "shop" ? "Tienda de la granja" : "Mi inventario" }}</h2>
            <button class="close" aria-label="Cerrar" @click="panel = null">×</button>
          </div>

          <div v-if="panel === 'shop'" class="tabs">
            <button
              v-for="cat in shopCategories"
              :key="cat"
              class="tab"
              :class="{ active: shopCategory === cat }"
              @click="shopCategory = cat"
            >
              {{ FARM_CATEGORY_LABELS[cat] }}
            </button>
          </div>

          <div v-if="panel === 'shop'" class="card-grid">
            <button
              v-for="item in itemsByCategory(shopCategory)"
              :key="item.id"
              class="item-card"
              :class="{ owned: ownedIds.has(item.id) }"
              :disabled="farm.busy.value || ownedIds.has(item.id) || farm.level.value < item.levelRequired || farm.coins.value < item.cost"
              @click="doBuy(item)"
            >
              <span class="item-ico">{{ item.icon }}</span>
              <strong>{{ item.name }}</strong>
              <small>{{ item.description }}</small>
              <small class="cost">🪙 {{ item.cost }} · nivel {{ item.levelRequired }}</small>
              <small v-if="ownedIds.has(item.id)" class="owned-tag">✓ En tu inventario</small>
            </button>
          </div>

          <div v-else class="card-grid">
            <button
              v-for="item in shopItems.filter((i) => ownedIds.has(i.id))"
              :key="item.id"
              class="item-card"
              :class="{ equipped: farm.equipped.value[item.category] === item.id }"
              :disabled="farm.busy.value || item.category === 'decoration'"
              @click="doEquip(item.id)"
            >
              <span class="item-ico">{{ item.icon }}</span>
              <strong>{{ item.name }}</strong>
              <small>{{ item.description }}</small>
              <small v-if="item.category === 'decoration'" class="muted">Decoración de parcela</small>
              <small v-else-if="farm.equipped.value[item.category] === item.id" class="owned-tag">✓ Equipado</small>
              <small v-else class="muted">Tocar para equipar</small>
            </button>
            <p v-if="!ownedIds.size" class="muted">Aún no tienes objetos. ¡Visita la tienda!</p>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.farm { max-width: 1080px; margin: 0 auto; padding: var(--space-5) var(--space-4) 64px; }
.farm-head { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-4); flex-wrap: wrap; }
.eyebrow { display: inline-flex; gap: 6px; align-items: center; color: var(--color-accent); font-weight: 800; text-transform: uppercase; letter-spacing: .06em; font-size: .75rem; margin: 0; }
.farm-head h1 { margin: 4px 0 6px; color: var(--color-primary); }
.farm-head .muted { max-width: 620px; }
.farm-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin: var(--space-4) 0; }
.stat { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 12px; display: flex; flex-direction: column; gap: 2px; box-shadow: var(--shadow); }
.stat-ico { font-size: 1.3rem; }
.stat strong { font-size: 1.4rem; color: var(--color-primary); }
.stat small { color: var(--color-text-muted); }
.farm-level { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 14px; box-shadow: var(--shadow); }
.level-row { display: flex; justify-content: space-between; font-weight: 700; color: var(--color-primary); font-size: .9rem; }
.bar { height: 12px; background: var(--color-primary-soft); border-radius: 999px; overflow: hidden; margin: 8px 0; }
.bar-fill { height: 100%; background: linear-gradient(90deg, #2f9e83, #37c3a2); border-radius: 999px; transition: width .4s ease; }
.level-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.golden { color: #b7791f; font-weight: 800; }
.farm-main { display: grid; grid-template-columns: 200px 1fr; gap: var(--space-4); margin: var(--space-4) 0; align-items: start; }
.character { text-align: center; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow); }
.plots h2 { margin: 0 0 10px; color: var(--color-primary); }
.plot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 10px; }
.plot { position: relative; aspect-ratio: 1; border: 2px dashed var(--color-border); border-radius: 14px; background: var(--color-surface); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; cursor: pointer; font: inherit; color: var(--color-text); overflow: hidden; }
.plot.growing { border-style: solid; border-color: #2f9e83; }
.plot.ready { border-style: solid; border-color: #e0b34f; background: #fffaf0; animation: pulse 1.4s ease-in-out infinite; }
.plot.locked { opacity: .6; cursor: not-allowed; }
.plot-emoji { font-size: 2rem; }
.plot-plus { font-size: 1.6rem; color: var(--color-text-muted); }
.plot-label { font-size: .78rem; font-weight: 700; color: var(--color-text-muted); }
.plot-progress { position: absolute; left: 8px; right: 8px; bottom: 8px; height: 5px; background: var(--color-primary-soft); border-radius: 999px; overflow: hidden; }
.plot-progress span { display: block; height: 100%; background: #2f9e83; }
@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.03); } }
.farm-actions { display: flex; gap: 10px; flex-wrap: wrap; margin: var(--space-4) 0; }
.perks { margin-top: var(--space-4); }
.perks h2 { color: var(--color-primary); font-size: 1.05rem; }
.perk-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.perk-grid span { background: var(--color-primary-soft); border-radius: 999px; padding: 6px 12px; font-weight: 700; font-size: .85rem; }
.overlay { position: fixed; inset: 0; z-index: 2600; background: rgba(8,15,25,.6); backdrop-filter: blur(4px); display: grid; place-items: center; padding: var(--space-4); }
.modal { width: min(560px, 96vw); max-height: 88vh; overflow: auto; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 18px; padding: var(--space-5); box-shadow: 0 20px 50px rgba(0,0,0,.4); }
.modal.wide { width: min(820px, 96vw); }
.modal-head { display: flex; justify-content: space-between; align-items: center; }
.modal-head h2 { margin: 0; color: var(--color-primary); }
.close { border: 0; background: transparent; font-size: 1.7rem; cursor: pointer; color: var(--color-text-muted); line-height: 1; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; margin-top: var(--space-4); }
.item-card { display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; padding: 12px 8px; border: 2px solid var(--color-border); border-radius: 14px; background: var(--color-bg); cursor: pointer; font: inherit; color: var(--color-text); }
.item-card:disabled { opacity: .55; cursor: not-allowed; }
.item-card.equipped { border-color: var(--color-accent); background: #eefaf6; }
.item-card.owned { border-color: #2f9e83; }
.item-ico { font-size: 1.8rem; }
.item-card small { color: var(--color-text-muted); font-size: .76rem; }
.item-card .cost { font-weight: 800; color: var(--color-primary); }
.owned-tag { color: #0e7c66; font-weight: 800; }
.tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: var(--space-3); }
.tab { border: 1px solid var(--color-border); background: var(--color-bg); border-radius: 999px; padding: 6px 12px; cursor: pointer; font: inherit; font-weight: 700; color: var(--color-primary); }
.tab.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
@media (max-width: 720px) { .farm-main { grid-template-columns: 1fr; } }
</style>
