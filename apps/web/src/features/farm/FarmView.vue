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

// ── Escena visual: casa, granja decorable (drag & drop) ────────
const HOUSE_STYLES = [
  { id: "camp", label: "Refugio", icon: "🏕️" },
  { id: "cabin", label: "Cabaña", icon: "🛖" },
  { id: "cottage", label: "Casa", icon: "🏠" },
  { id: "garden", label: "Casa con jardín", icon: "🏡" },
  { id: "mansion", label: "Casona", icon: "🏘️" },
  { id: "castle", label: "Castillo", icon: "🏰" },
  { id: "old", label: "Casa antigua", icon: "🏚️" },
  { id: "japanese", label: "Casa oriental", icon: "🏯" },
  { id: "classical", label: "Palacete", icon: "🏛️" },
  { id: "factory", label: "Fábrica", icon: "🏭" },
];
const DEFAULT_SPOTS = [
  { x: 12, y: 74 }, { x: 24, y: 84 }, { x: 37, y: 70 }, { x: 52, y: 82 },
  { x: 66, y: 72 }, { x: 80, y: 84 }, { x: 90, y: 72 }, { x: 18, y: 62 },
  { x: 45, y: 62 }, { x: 74, y: 62 },
];

const sceneEl = ref<HTMLElement | null>(null);
const sceneState = ref<{ items: Record<string, { x: number; y: number }>; house: string }>({
  items: {},
  house: "cottage",
});
const drag = ref<{ item: FarmItem; fromPlaced: boolean; x: number; y: number; moved: boolean } | null>(null);
const houseOpen = ref(false);

const ownedItems = computed<FarmItem[]>(() =>
  farm.inventory.value.map((entry) => FARM_ITEM_BY_ID[entry.itemId]).filter((item): item is FarmItem => !!item),
);
const placeableItems = computed(() =>
  ownedItems.value.filter(
    (item) =>
      item.category === "decoration" ||
      item.category === "npc" ||
      item.category === "tool" ||
      item.category === "weapon",
  ),
);
const placedItems = computed(() =>
  placeableItems.value
    .filter((item) => sceneState.value.items[item.id])
    .map((item) => ({ item, x: sceneState.value.items[item.id]!.x, y: sceneState.value.items[item.id]!.y })),
);
const unplacedItems = computed(() => placeableItems.value.filter((item) => !sceneState.value.items[item.id]));
const ownedAnimals = computed(() => ownedItems.value.filter((item) => item.category === "npc"));
const ownedDecorations = computed(() => ownedItems.value.filter((item) => item.category === "decoration"));
const ownedTools = computed(() =>
  ownedItems.value.filter((item) => item.category === "tool" || item.category === "weapon"),
);
const houseIcon = computed(() => HOUSE_STYLES.find((h) => h.id === sceneState.value.house)?.icon ?? "🏠");

function houseKey(): string {
  return `pclab-farm-house-${farm.snapshot.value?.state.studentId ?? "anon"}`;
}
function defaultHouse(): string {
  const level = farm.level.value;
  if (level < 3) return "camp";
  if (level < 5) return "cottage";
  if (level < 8) return "garden";
  return "mansion";
}
function loadScene(): void {
  // Las posiciones viven en el servidor (state.layout); la casa es cosmética local.
  sceneState.value = { items: { ...(farm.snapshot.value?.state.layout ?? {}) }, house: defaultHouse() };
  try {
    const savedHouse = localStorage.getItem(houseKey());
    if (savedHouse) sceneState.value.house = savedHouse;
  } catch {
    // sin almacenamiento
  }
}
function persistHouse(): void {
  try {
    localStorage.setItem(houseKey(), sceneState.value.house);
  } catch {
    // sin almacenamiento
  }
}
function persistLayout(): void {
  void farm.saveLayout(courseId.value, sceneState.value.items);
}
function setItemPos(itemId: string, x: number, y: number): void {
  sceneState.value = { ...sceneState.value, items: { ...sceneState.value.items, [itemId]: { x, y } } };
  persistLayout();
}
function removeItem(itemId: string): void {
  const items = { ...sceneState.value.items };
  delete items[itemId];
  sceneState.value = { ...sceneState.value, items };
  persistLayout();
}
function defaultSpot(): { x: number; y: number } {
  const used = new Set(Object.values(sceneState.value.items).map((p) => `${Math.round(p.x)},${Math.round(p.y)}`));
  return DEFAULT_SPOTS.find((s) => !used.has(`${s.x},${s.y}`)) ?? { x: 8 + Math.random() * 84, y: 60 + Math.random() * 28 };
}
function pct(client: number, start: number, size: number): number {
  return Math.min(96, Math.max(4, ((client - start) / size) * 100));
}
function onTrayDown(item: FarmItem, e: PointerEvent): void {
  e.preventDefault();
  drag.value = { item, fromPlaced: false, x: e.clientX, y: e.clientY, moved: false };
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
}
function onPlacedDown(item: FarmItem, e: PointerEvent): void {
  e.preventDefault();
  drag.value = { item, fromPlaced: true, x: e.clientX, y: e.clientY, moved: false };
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
}
function onPointerMove(e: PointerEvent): void {
  const d = drag.value;
  if (!d) return;
  if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 6) d.moved = true;
  d.x = e.clientX;
  d.y = e.clientY;
}
function onPointerUp(e: PointerEvent): void {
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  const d = drag.value;
  drag.value = null;
  if (!d) return;
  const rect = sceneEl.value?.getBoundingClientRect();
  const inside = !!rect && e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (d.fromPlaced) {
    if (!d.moved) {
      removeItem(d.item.id);
      notify({ kind: "info", icon: "🧹", title: `Quitaste ${d.item.name}`, sound: false });
      return;
    }
    if (inside && rect) setItemPos(d.item.id, pct(e.clientX, rect.left, rect.width), pct(e.clientY, rect.top, rect.height));
    else removeItem(d.item.id);
    return;
  }
  if (d.moved && inside && rect) {
    setItemPos(d.item.id, pct(e.clientX, rect.left, rect.width), pct(e.clientY, rect.top, rect.height));
  } else {
    const spot = defaultSpot();
    setItemPos(d.item.id, spot.x, spot.y);
    notify({ kind: "item", icon: d.item.icon, title: `Colocaste ${d.item.name}`, detail: "Arrástralo para moverlo.", sound: false });
  }
}
function chooseHouse(id: string): void {
  sceneState.value = { ...sceneState.value, house: id };
  persistHouse();
}

function placementClass(item: FarmItem): string {
  if (item.category !== "npc") return "";
  if (/bird|dove|butterfly|owl/.test(item.id)) return "flying";
  if (/fish|frog|turtle|duck/.test(item.id)) return "swimming";
  return "animal";
}

const HOUSE_FLOORS = [
  { minLevel: 1, id: "ground", label: "Living", icon: "🛋️", caption: "Living", wall: "#f6e7cf", props: ["🛋️", "📺", "🪴", "🖼️"] },
  { minLevel: 2, id: "kitchen", label: "Cocina", icon: "🍳", caption: "Cocina", wall: "#fdf1d6", props: ["🍳", "🥘", "🧊", "🧑‍🍳"] },
  { minLevel: 4, id: "bedroom", label: "Dormitorio", icon: "🛏️", caption: "Dormitorio", wall: "#e7e0f6", props: ["🛏️", "🧸", "🪟", "🕯️"] },
  { minLevel: 7, id: "study", label: "Estudio", icon: "📚", caption: "Estudio", wall: "#dcefe0", props: ["📚", "🖥️", "🪑", "🖊️"] },
  { minLevel: 9, id: "workshop", label: "Taller", icon: "🔨", caption: "Taller", wall: "#e6e2da", props: ["🔨", "🧰", "🪚", "🪑"] },
  { minLevel: 11, id: "terrace", label: "Terraza", icon: "🌇", caption: "Terraza", wall: "#ffd9a8", props: ["🌇", "🪴", "⛱️", "🪑"] },
];
const HOUSE_THEMES: Record<string, { floorA: string; floorB: string }> = {
  camp: { floorA: "#8a7653", floorB: "#6f5f42" },
  cabin: { floorA: "#8a6a45", floorB: "#6f5233" },
  cottage: { floorA: "#b98a5a", floorB: "#a8763f" },
  garden: { floorA: "#9ec27a", floorB: "#7ba85c" },
  mansion: { floorA: "#c9a04f", floorB: "#a87f36" },
  castle: { floorA: "#9aa4b0", floorB: "#7a8694" },
  old: { floorA: "#8a7a68", floorB: "#6f6152" },
  japanese: { floorA: "#b5886a", floorB: "#956a4f" },
  classical: { floorA: "#d8cbb0", floorB: "#bca98a" },
  factory: { floorA: "#8c8f97", floorB: "#6f737b" },
};
const activeFloor = ref("ground");
const activeRoom = computed(() => HOUSE_FLOORS.find((f) => f.id === activeFloor.value) ?? HOUSE_FLOORS[0]!);
const activeRoomBg = computed(() => {
  const theme = HOUSE_THEMES[sceneState.value.house] ?? HOUSE_THEMES.cottage!;
  const wall = activeRoom.value.wall;
  return `linear-gradient(180deg, ${wall} 0%, ${wall} 60%, ${theme.floorA} 60%, ${theme.floorB} 100%)`;
});
function selectFloor(id: string): void {
  activeFloor.value = id;
}
function openHouse(): void {
  const unlocked = HOUSE_FLOORS.filter((f) => farm.level.value >= f.minLevel);
  activeFloor.value = unlocked[unlocked.length - 1]?.id ?? "ground";
  houseOpen.value = true;
}
function openShop(category?: FarmItem["category"]): void {
  if (category) shopCategory.value = category;
  panel.value = "shop";
}

const FIELD_KEY = "pclab-farm-field";
const fieldOpen = ref(
  (() => {
    try {
      return localStorage.getItem(FIELD_KEY) !== "0";
    } catch {
      return true;
    }
  })(),
);
function toggleField(): void {
  fieldOpen.value = !fieldOpen.value;
  try {
    localStorage.setItem(FIELD_KEY, fieldOpen.value ? "1" : "0");
  } catch {
    // sin almacenamiento
  }
}

const HELP_KEY = "pclab-farm-help";
const showHelp = ref(
  (() => {
    try {
      return localStorage.getItem(HELP_KEY) !== "1";
    } catch {
      return true;
    }
  })(),
);
function dismissHelp(): void {
  showHelp.value = false;
  try {
    localStorage.setItem(HELP_KEY, "1");
  } catch {
    // sin almacenamiento
  }
}

const panel = ref<"shop" | "inventory" | null>(null);
const shopCategory = ref<FarmItem["category"]>("npc");
const cropPickerPlot = ref<number | null>(null);
const now = ref(Date.now());
let timer: number | undefined;

onMounted(async () => {
  if (courseId.value) {
    await farm.load(courseId.value);
    loadScene();
  }
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
      <div class="farm-head-actions">
        <button class="btn-primary" @click="openShop()"><AppIcon name="shop" /> Tienda</button>
        <button class="btn-ghost" @click="showHelp = true"><AppIcon name="help" /> ¿Cómo juego?</button>
        <button class="btn-ghost" @click="router.push('/student')"><AppIcon name="arrow" /> Volver a mis misiones</button>
      </div>
    </header>

    <section v-if="showHelp" class="farm-help" aria-label="Cómo jugar en la granja">
      <div class="farm-help-head">
        <strong><AppIcon name="graduation" /> ¿Cómo juego en la granja?</strong>
        <button type="button" class="farm-help-close" aria-label="Cerrar ayuda" @click="dismissHelp">×</button>
      </div>
      <ol>
        <li><b>Gana</b> semillas y monedas con tus misiones, quizzes y participación.</li>
        <li><b>Planta</b>: toca una casilla y elige un cultivo.</li>
        <li><b>Cosecha</b>: cuando aparezca <b>«¡Cosechar!»</b>, tócala para ganar monedas, semillas y XP.</li>
        <li><b>Compra</b> en la <b>Tienda</b> (botón arriba y abajo): cultivos, animalitos, herramientas, vestimenta y decoración.</li>
        <li><b>Decora</b>: en «Decora tu granja» (debajo del mapa) <b>arrastra</b> una ficha al mapa o <b>tócala</b> para colocarla: animalitos, decoraciones, <b>herramientas y talismanes</b>. Toca un objeto colocado para quitarlo. <b>Cada objeto colocado te da mejora</b> (monedas, XP o crecimiento). Si te falta espacio, toca <b>«Ocultar cultivos»</b> en Mi parcela para dejar el mapa libre.</li>
        <li><b>Amplía tu parcela</b>: toca «＋ Ampliar parcela» y compra cercos o estanques para tener más casillas.</li>
        <li><b>Mi casa</b>: toca tu casa para entrar, cambiar de estilo y recorrer sus pisos (Living, Cocina, Dormitorio, Estudio, Taller, Terraza). Cada piso y estilo cambia los muebles y colores.</li>
        <li><b>Sube de nivel</b> con misiones, quizzes y el Desafío de conceptos (la barra llega a 100%).</li>
      </ol>
    </section>

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

        <div ref="sceneEl" class="farm-scene">
          <div class="scene-sky" aria-hidden="true">
            <span class="sun">☀️</span>
            <span class="cloud cloud-a">☁️</span>
            <span class="cloud cloud-b">☁️</span>
          </div>

          <button type="button" class="scene-house" aria-label="Entrar a mi casa" @click="openHouse">
            <span class="house-ico" aria-hidden="true">{{ houseIcon }}</span>
            <span class="house-name">Mi casa · entrar ›</span>
          </button>

          <div class="scene-field" :class="{ collapsed: !fieldOpen }">
            <div class="scene-title-row">
              <h2 class="scene-title">Mi parcela <small>({{ farm.plots.value.length }} casillas)</small></h2>
              <div class="scene-title-actions">
                <button type="button" class="scene-expand" @click="toggleField">
                  {{ fieldOpen ? "▾ Ocultar cultivos" : "▸ Mostrar cultivos" }}
                </button>
                <button type="button" class="scene-expand" @click="openShop('decoration')">＋ Ampliar parcela</button>
              </div>
            </div>
            <p v-if="!fieldOpen" class="field-collapsed-hint">Cultivos ocultos · usa este espacio para colocar tus adornos 🎨</p>
            <div v-show="fieldOpen" class="plot-grid">
              <button
                v-for="plot in farm.plots.value"
                :key="plot.index"
                class="plot"
                :class="{ ready: plotInfo(plot).ready, growing: !!plotInfo(plot).crop && !plotInfo(plot).ready, locked: !plot.unlocked }"
                :disabled="farm.busy.value || !plot.unlocked"
                @click="onPlotClick(plot)"
              >
                <template v-if="plotInfo(plot).crop">
                  <span class="plot-emoji">{{ plotInfo(plot).ready ? plotInfo(plot).crop!.icon : "🌱" }}</span>
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

          <button
            v-for="p in placedItems"
            :key="p.item.id"
            type="button"
            class="placed-item"
            :class="placementClass(p.item)"
            :style="{ left: `${p.x}%`, top: `${p.y}%` }"
            :title="`${p.item.name} — arrastra para mover, toca para quitar`"
            :aria-label="`${p.item.name} colocado`"
            @pointerdown="onPlacedDown(p.item, $event)"
          >
            {{ p.item.icon }}
          </button>

          <span v-if="drag" class="drag-ghost" :style="{ left: `${drag.x}px`, top: `${drag.y}px` }" aria-hidden="true">{{ drag.item.icon }}</span>
        </div>

        <section class="decor-panel" aria-label="Decora tu granja">
          <div class="lawn-head">
            <span class="lawn-title">🎨 Decora tu granja</span>
            <span class="muted small">{{ placedItems.length }}/{{ placeableItems.length }} colocados</span>
          </div>
          <p class="muted small">
            Arrastra una ficha al mapa o tócala para colocarla; toca un objeto colocado para quitarlo.
            <b>Cada objeto colocado da mejora</b> (monedas, XP o crecimiento).
          </p>
          <div v-if="unplacedItems.length" class="deco-tray">
            <button
              v-for="item in unplacedItems"
              :key="item.id"
              type="button"
              class="deco-chip"
              :title="`Arrastra o toca para colocar ${item.name}`"
              @pointerdown="onTrayDown(item, $event)"
            >
              {{ item.icon }} {{ item.name }}
            </button>
          </div>
          <div v-else-if="!placeableItems.length" class="lawn-empty">
            <p class="muted small">Compra animalitos, decoraciones, herramientas y talismanes para adornar tu granja.</p>
            <button type="button" class="btn-primary" @click="openShop('decoration')"><AppIcon name="shop" /> Ir a la Tienda</button>
          </div>
          <p v-else class="muted small">¡Todo colocado! Arrastra para reordenar o toca un objeto para quitarlo.</p>
        </section>
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
          <span v-if="farm.snapshot.value.placement.objects > 0">
            🎨 {{ farm.snapshot.value.placement.objects }} objeto(s) colocado(s): +{{ farm.snapshot.value.placement.coinBonusPercent }}% 🪙 ·
            +{{ farm.snapshot.value.placement.xpBonusPercent }}% ⭐ · +{{ farm.snapshot.value.placement.growthSpeedPercent }}% ⚡
          </span>
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

      <div v-if="houseOpen" class="overlay" @click.self="houseOpen = false">
        <div class="house-modal" role="dialog" aria-modal="true" aria-label="Mi casa">
          <div class="modal-head">
            <h2>🏠 Mi casa</h2>
            <button class="close" aria-label="Cerrar" @click="houseOpen = false">×</button>
          </div>
          <div class="house-room" :style="{ background: activeRoomBg }">
            <span class="room-caption">{{ activeRoom.caption }}</span>
            <div class="room-window" aria-hidden="true"><span>🌤️</span></div>
            <div class="room-props" aria-hidden="true"><span v-for="(prop, i) in activeRoom.props" :key="i">{{ prop }}</span></div>
            <div v-if="activeFloor === 'ground'" class="room-fire" aria-hidden="true">🔥</div>
            <div class="room-rug" aria-hidden="true"></div>
            <div class="room-avatar">
              <Avatar
                :seed="avatar.pref.value.seed"
                :style="avatar.pref.value.style"
                :level="farm.level.value"
                :size="120"
                :outfit="outfitEmoji"
                :accessory="accessoryEmoji"
              />
            </div>
          </div>
          <p class="muted small">Descansa, ordena tus tesoros y elige el estilo de tu casa.</p>
          <p class="group-title">Pisos de la casa</p>
          <div class="house-floors">
            <button
              v-for="f in HOUSE_FLOORS"
              :key="f.id"
              type="button"
              class="house-floor"
              :class="{ active: activeFloor === f.id, locked: farm.level.value < f.minLevel }"
              :disabled="farm.level.value < f.minLevel"
              @click="selectFloor(f.id)"
            >
              <span class="house-floor-ico" aria-hidden="true">{{ farm.level.value >= f.minLevel ? f.icon : "🔒" }}</span>
              <span>{{ f.label }}</span>
              <small v-if="farm.level.value < f.minLevel">Nivel {{ f.minLevel }}</small>
            </button>
          </div>

          <p class="group-title">Estilo de casa</p>
          <div class="house-styles">
            <button
              v-for="h in HOUSE_STYLES"
              :key="h.id"
              type="button"
              class="house-style"
              :class="{ active: sceneState.house === h.id }"
              @click="chooseHouse(h.id)"
            >
              <span class="house-style-ico" aria-hidden="true">{{ h.icon }}</span>
              <span>{{ h.label }}</span>
            </button>
          </div>
          <div class="house-treasures">
            <span>🐾 Animales: {{ ownedAnimals.length }}</span>
            <span>🌳 Decoraciones: {{ ownedDecorations.length }}</span>
            <span>🧰 Herramientas: {{ ownedTools.length }}</span>
            <span>🎒 Objetos: {{ ownedIds.size }}</span>
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
.farm-main { display: flex; flex-direction: column; gap: var(--space-4); margin: var(--space-4) 0; }
.character { display: flex; align-items: center; gap: 12px; text-align: left; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 12px 16px; box-shadow: var(--shadow); }
.farm-scene { position: relative; border-radius: 18px; overflow: hidden; border: 1px solid var(--color-border); box-shadow: var(--shadow); background: linear-gradient(180deg, #bfe3ff 0%, #d9efff 26%, #8ec46f 26%, #6fae55 100%); padding: 14px; display: flex; flex-direction: column; gap: 12px; min-height: 380px; }
.scene-sky { position: relative; height: 34px; }
.sun { position: absolute; right: 8px; top: -6px; font-size: 1.8rem; animation: sunpulse 4s ease-in-out infinite; }
.cloud { position: absolute; font-size: 1.3rem; opacity: .92; animation: drift 20s ease-in-out infinite alternate; }
.cloud-a { top: 2px; left: 8%; }
.cloud-b { top: 12px; left: 42%; animation-duration: 28s; }
@keyframes drift { from { transform: translateX(0); } to { transform: translateX(50px); } }
@keyframes sunpulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
.scene-house { align-self: flex-end; display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,.9); border: 1px solid rgba(0,0,0,.12); border-radius: 12px; padding: 4px 12px; margin-top: -30px; position: relative; z-index: 2; cursor: pointer; font: inherit; box-shadow: var(--shadow); }
.scene-house:hover { border-color: #2f9e83; }
.house-ico { font-size: 1.9rem; }
.house-name { font-weight: 800; color: #4a4a2a; font-size: .8rem; }
.scene-field { background: repeating-linear-gradient(90deg, #8b5e34, #8b5e34 16px, #7d532d 16px, #7d532d 32px); border-radius: 14px; padding: 12px; box-shadow: inset 0 0 0 4px rgba(255,255,255,.14); }
.scene-field.collapsed { background: rgba(0,0,0,.18); box-shadow: none; }
.scene-title { margin: 0 0 8px; color: #fff; font-size: 1rem; text-shadow: 0 1px 2px rgba(0,0,0,.4); }
.scene-title small { color: rgba(255,255,255,.85); font-weight: 600; }
.plot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 10px; }
.plot { position: relative; aspect-ratio: 1; border: 2px dashed #6b4a24; border-radius: 14px; background: linear-gradient(180deg, #e9d6ae, #d8b98a); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; cursor: pointer; font: inherit; color: #3f2c14; overflow: hidden; }
.plot.growing { border-style: solid; border-color: #2f9e83; }
.plot.ready { border-style: solid; border-color: #e0b34f; background: #fffaf0; animation: pulse 1.4s ease-in-out infinite; }
.plot.locked { opacity: .6; cursor: not-allowed; }
.plot-emoji { font-size: 2rem; }
.plot-plus { font-size: 1.6rem; color: #6b4a24; }
.plot-label { font-size: .78rem; font-weight: 700; color: #5b4426; }
.plot-progress { position: absolute; left: 8px; right: 8px; bottom: 8px; height: 5px; background: rgba(0,0,0,.12); border-radius: 999px; overflow: hidden; }
.plot-progress span { display: block; height: 100%; background: #2f9e83; }
@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.03); } }
.decor-panel { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; box-shadow: var(--shadow); }
.lawn-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.lawn-title { font-weight: 800; color: #33502a; font-size: .9rem; }
.deco-tray { display: flex; flex-wrap: wrap; gap: 6px; }
.deco-chip { border: 1px solid var(--color-border); background: var(--color-surface); border-radius: 999px; padding: 4px 10px; font: inherit; font-size: .8rem; cursor: grab; color: var(--color-text); touch-action: none; }
.deco-chip:hover { border-color: var(--color-accent); }
.placed-item { position: absolute; transform: translate(-50%, -50%); background: transparent; border: 0; padding: 0; font-size: 1.9rem; line-height: 1; cursor: grab; touch-action: none; z-index: 3; filter: drop-shadow(0 2px 2px rgba(0,0,0,.28)); }
.placed-item:active { cursor: grabbing; }
.placed-item.animal { animation: bob 3s ease-in-out infinite; }
@keyframes bob { 0%,100% { transform: translate(-50%, -50%) rotate(-4deg); } 50% { transform: translate(-50%, -58%) rotate(4deg); } }
.drag-ghost { position: fixed; transform: translate(-50%, -50%); font-size: 2rem; line-height: 1; pointer-events: none; z-index: 5000; opacity: .92; filter: drop-shadow(0 3px 4px rgba(0,0,0,.35)); }
.group-title { font-weight: 800; color: var(--color-primary); margin: var(--space-3) 0 6px; font-size: .9rem; }
.house-modal { width: min(560px, 96vw); max-height: 90vh; overflow: auto; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 18px; padding: var(--space-5); box-shadow: 0 20px 50px rgba(0,0,0,.4); }
.house-room { position: relative; height: 240px; border-radius: 14px; overflow: hidden; margin: var(--space-4) 0; background: linear-gradient(180deg, #f6e7cf 0%, #f6e7cf 62%, #b98a5a 62%, #a8763f 100%); border: 1px solid var(--color-border); }
.room-window { position: absolute; top: 16px; left: 20px; width: 84px; height: 64px; border-radius: 8px; background: linear-gradient(#bfe3ff, #dff2ff); border: 6px solid #fff; box-shadow: inset 0 0 0 2px rgba(0,0,0,.06); display: grid; place-items: center; font-size: 1.4rem; }
.room-shelf { position: absolute; top: 18px; right: 20px; font-size: 1.3rem; letter-spacing: 4px; }
.room-fire { position: absolute; bottom: 16px; right: 22px; font-size: 2rem; }
.room-rug { position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%); width: 58%; height: 46px; border-radius: 50%; background: radial-gradient(circle at 50% 40%, #e06d6d, #b8476b); opacity: .85; }
.room-avatar { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); z-index: 2; }
.house-styles { display: flex; flex-wrap: wrap; gap: 8px; }
.house-style { display: inline-flex; align-items: center; gap: 6px; border: 2px solid var(--color-border); background: var(--color-bg); border-radius: 12px; padding: 6px 12px; font: inherit; cursor: pointer; color: var(--color-text); }
.house-style.active { border-color: var(--color-accent); background: #eefaf6; }
.house-style-ico { font-size: 1.3rem; }
.house-treasures { display: flex; flex-wrap: wrap; gap: 8px; margin-top: var(--space-3); }
.house-treasures span { background: var(--color-primary-soft); border-radius: 999px; padding: 6px 12px; font-weight: 700; font-size: .82rem; }
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
.farm-head-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.farm-help { background: #eefaf6; border: 1px solid #2f9e83; border-left: 6px solid #2f9e83; border-radius: var(--radius); padding: 12px 14px; margin: var(--space-3) 0; }
.farm-help-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.farm-help-head strong { display: inline-flex; align-items: center; gap: 6px; color: #0e7c66; }
.farm-help-close { border: 0; background: transparent; font-size: 1.4rem; line-height: 1; cursor: pointer; color: var(--color-text-muted); }
.farm-help ol { margin: 8px 0 0; padding-left: 20px; display: flex; flex-direction: column; gap: 4px; }
.farm-help li { color: var(--color-text); font-size: .9rem; }
.lawn-empty { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
.placed-item.flying { animation: fly 4s ease-in-out infinite; }
@keyframes fly { 0%,100% { transform: translate(-50%, -50%) translateY(0) rotate(-5deg); } 50% { transform: translate(-50%, -50%) translateY(-14px) rotate(5deg); } }
.placed-item.swimming { animation: swim 2.6s ease-in-out infinite; }
@keyframes swim { 0%,100% { transform: translate(-50%, -50%) translateX(-2px); } 50% { transform: translate(-50%, -50%) translateX(2px) translateY(-3px); } }
.room-props { position: absolute; top: 18px; right: 20px; display: flex; gap: 4px; font-size: 1.3rem; }
.house-floors { display: flex; flex-wrap: wrap; gap: 8px; }
.house-floor { display: inline-flex; flex-direction: column; align-items: center; gap: 2px; border: 2px solid var(--color-border); background: var(--color-bg); border-radius: 12px; padding: 6px 12px; font: inherit; cursor: pointer; color: var(--color-text); font-size: .82rem; }
.house-floor.active { border-color: var(--color-accent); background: #eefaf6; }
.house-floor.locked { opacity: .55; cursor: not-allowed; }
.house-floor small { color: var(--color-text-muted); font-size: .68rem; }
.house-floor-ico { font-size: 1.3rem; }
.scene-title-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.scene-expand { border: 1px solid rgba(255,255,255,.7); background: rgba(255,255,255,.85); color: #33502a; border-radius: 999px; padding: 4px 10px; font: inherit; font-size: .78rem; font-weight: 700; cursor: pointer; }
.scene-expand:hover { background: #fff; }
.scene-title-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.field-collapsed-hint { margin: 6px 0 0; color: #fff; font-size: .82rem; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,.4); }
.room-caption { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); font-weight: 800; color: rgba(0,0,0,.55); font-size: .82rem; }
</style>
