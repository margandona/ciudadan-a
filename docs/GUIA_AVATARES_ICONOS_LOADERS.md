# Guía de implementación — Avatares, Iconos y Loaders

Sistema de personalización visual extraído del proyecto **Providencia Ciudadanía Lab**
(`apps/web`). Es autocontenido y portable a cualquier app **Vue 3 + TypeScript + Vite**.

Incluye tres piezas independientes:

| Pieza | Qué resuelve | Dependencias |
|---|---|---|
| **Avatares** | Avatar generado por DiceBear + mejoras visuales según nivel | Vue 3, `localStorage`, internet (API DiceBear) |
| **Iconos** | Set SVG inline sin librerías externas | Vue 3 |
| **Loaders** | Indicador de carga elegible por el usuario (orbe por defecto) | Vue 3, `localStorage` |

Todas las preferencias se persisten en `localStorage` y se sincronizan entre
componentes mediante `CustomEvent` (`pclab-avatar` / `pclab-loader`).

---

## 1. Requisitos previos

- Vue 3 (`^3.5`) con `<script setup lang="ts">`.
- Vite con alias `@` → `src` (o ajusta las rutas de import).
- Variables CSS globales (ver sección 6). Si no las tienes, define al menos:
  `--color-surface`, `--color-border`, `--color-bg`, `--color-primary`,
  `--color-accent`, `--color-text`, `--color-text-muted`, `--shadow`,
  `--space-3`, `--space-4`, `--space-5`.
- Navegador con `localStorage` (si falta, el código degrada a valores por defecto).

> **Avatares:** usan la API pública de DiceBear por URL. No requiere instalar nada
> ni registrar datos: solo un `seed` local.
> `https://api.dicebear.com/9.x/{style}/svg?seed={seed}&size={size}`

---

## 2. Estructura de archivos a crear

```
src/
├─ composables/
│  ├─ useAvatar.ts        # estado + preferencias + URL DiceBear
│  └─ useLoader.ts        # estado + preferencias del loader
└─ components/ui/
   ├─ Avatar.vue          # avatar con marco y mejora por nivel
   ├─ AppIcon.vue         # set de iconos SVG inline
   ├─ LoaderArt.vue       # 4 animaciones de carga
   └─ SkeletonRows.vue    # estado "Cargando…" usando el loader elegido
```

Además necesitas dos selectores (modales) que ya existen en el proyecto de origen:

- **Selector de avatar** → dentro de `StudentHomeView.vue` (sección 4.1).
- **Selector de loader** → dentro de `AccessibilityBar.vue` (sección 4.2).

Puedes copiarlos o adaptarlos a tu propia pantalla de ajustes.

---

## 3. Código fuente (copiar tal cual)

### 3.1 `src/composables/useAvatar.ts`

```ts
import { computed, ref } from "vue";

const KEY = "pclab-avatar";

export interface AvatarPref {
  style: string;
  seed: string;
}

export const AVATAR_STYLES = [
  { id: "adventurer", label: "Aventurera", emoji: "🧗‍♀️" },
  { id: "adventurer-neutral", label: "Neutral", emoji: "🙂" },
  { id: "big-smile", label: "Sonrisa grande", emoji: "😄" },
  { id: "open-peeps", label: "Crew", emoji: "🧑‍🤝‍🧑" },
  { id: "lorelei", label: "Lorelei", emoji: "🧜‍♀️" },
  { id: "micah", label: "Micah", emoji: "🙋‍♀️" },
  { id: "notionists", label: "Notionista", emoji: "🧑‍🎨" },
  { id: "pixel-art", label: "Pixel", emoji: "👾" },
  { id: "bottts-neutral", label: "Robot", emoji: "🤖" },
  { id: "shapes", label: "Formas", emoji: "🟣" },
];

export interface AvatarFeature {
  minLevel: number;
  label: string;
  icon: string;
}

export const AVATAR_FEATURES: AvatarFeature[] = [
  { minLevel: 2, label: "Marco ciudadana", icon: "⭐" },
  { minLevel: 3, label: "Destellos", icon: "✨" },
  { minLevel: 4, label: "Corona cívica", icon: "👑" },
  { minLevel: 5, label: "Alas del bien común", icon: "🕊️" },
  { minLevel: 6, label: "Aura arcoíris", icon: "🌈" },
  { minLevel: 7, label: "Estrella del Observatorio", icon: "🌟" },
  { minLevel: 8, label: "Capa de oro", icon: "🏆" },
];

export function tierFor(level: number): number {
  if (level >= 7) return 3;
  if (level >= 4) return 2;
  if (level >= 2) return 1;
  return 0;
}

export function frameEmojiFor(level: number): string | null {
  const unlocked = AVATAR_FEATURES.filter((f) => level >= f.minLevel);
  if (!unlocked.length) return null;
  return unlocked[unlocked.length - 1]!.icon;
}

export function avatarUrl(pref: AvatarPref, size = 128): string {
  const safe = pref.style || "adventurer";
  return `https://api.dicebear.com/9.x/${encodeURIComponent(safe)}/svg?seed=${encodeURIComponent(pref.seed || "ciudadana")}&size=${size}&backgroundColor=f6f7f9`;
}

export function loadAvatarPref(fallbackSeed?: string): AvatarPref {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AvatarPref;
      if (parsed?.style && parsed.seed) return parsed;
    }
  } catch {
    // se usa el predeterminado
  }
  return { style: "adventurer", seed: fallbackSeed || "ciudadana-2035" };
}

export function saveAvatarPref(pref: AvatarPref): void {
  localStorage.setItem(KEY, JSON.stringify(pref));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pclab-avatar"));
  }
}

export function useAvatar(fallbackSeed?: string) {
  const pref = ref<AvatarPref>(loadAvatarPref(fallbackSeed));
  const seed = computed(() => pref.value.seed);
  const style = computed(() => pref.value.style);

  function choose(next: AvatarPref): void {
    pref.value = next;
    saveAvatarPref(next);
  }
  return { pref, seed, style, choose };
}
```

### 3.2 `src/components/ui/Avatar.vue`

```vue
<script setup lang="ts">
import { computed } from "vue";
import { avatarUrl, frameEmojiFor, tierFor } from "@/composables/useAvatar";

const props = withDefaults(
  defineProps<{ seed: string; style?: string; level?: number; size?: number; hideLevel?: boolean }>(),
  { size: 128, hideLevel: false },
);

const url = computed(() => avatarUrl({ style: props.style || "adventurer", seed: props.seed }, props.size));
const tier = computed(() => tierFor(props.level ?? 1));
const emoji = computed(() => (props.hideLevel ? null : frameEmojiFor(props.level ?? 1)));
const emojiSize = computed(() => Math.max(15, Math.round(props.size * 0.2)));
</script>

<template>
  <span class="avatar" :class="`t${tier}`" :style="{ width: `${size}px`, height: `${size}px` }">
    <img :src="url" :width="size" :height="size" alt="Avatar de mi personaje" loading="lazy" />
    <span v-if="emoji" class="corner" :style="{ fontSize: `${emojiSize}px` }" aria-hidden="true">{{ emoji }}</span>
  </span>
</template>

<style scoped>
.avatar {
  position: relative;
  display: inline-flex;
  border-radius: 24%;
  overflow: visible;
  background: var(--color-surface);
  box-shadow: var(--shadow);
}
.avatar img {
  width: 100%;
  height: 100%;
  border-radius: 24%;
  border: 3px solid transparent;
  object-fit: cover;
}
.avatar.t0 img { border-color: #9fb3c8; }
.avatar.t1 img { border-color: #2f9e83; box-shadow: 0 0 0 3px rgba(47, 158, 131, 0.25); }
.avatar.t2 img { border-color: #e0b34f; box-shadow: 0 0 0 4px rgba(224, 179, 79, 0.35); }
.avatar.t3 img {
  border-color: #ffd166;
  box-shadow: 0 0 0 4px rgba(255, 209, 102, 0.5), 0 0 22px rgba(255, 209, 102, 0.55);
}
.corner {
  position: absolute;
  right: -9px;
  bottom: -9px;
  line-height: 1;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.25));
  animation: float 3s ease-in-out infinite;
}
@keyframes float {
  0%, 100% { transform: translateY(0) rotate(-4deg); }
  50% { transform: translateY(-3px) rotate(6deg); }
}
</style>
```

### 3.3 `src/composables/useLoader.ts`

```ts
import { ref } from "vue";

const KEY = "pclab-loader";

export interface LoaderStyle {
  id: string;
  label: string;
  emoji: string;
}

export const LOADER_STYLES: LoaderStyle[] = [
  { id: "orb", label: "Orbe líquido", emoji: "🫧" },
  { id: "dots", label: "Gotitas", emoji: "💧" },
  { id: "ring", label: "Anillo", emoji: "💫" },
  { id: "pulse", label: "Latido", emoji: "💚" },
];

function read(): string {
  try {
    return localStorage.getItem(KEY) || "orb";
  } catch {
    return "orb";
  }
}

export const loaderStyle = ref<string>(read());

export function chooseLoader(id: string): void {
  loaderStyle.value = LOADER_STYLES.some((s) => s.id === id) ? id : "orb";
  try {
    localStorage.setItem(KEY, loaderStyle.value);
  } catch {
    // sin almacenamiento
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pclab-loader"));
  }
}
```

### 3.4 `src/components/ui/LoaderArt.vue`

```vue
<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{ style?: string; message?: string; size?: number }>(), {
  style: "orb",
  size: 44,
});
const dim = computed(() => ({ "--ls": `${props.size}px` } as Record<string, string>));
</script>

<template>
  <div class="loader" :class="style" :style="dim" role="status" aria-live="polite">
    <template v-if="style === 'orb'">
      <span class="orb" aria-hidden="true"></span>
    </template>
    <template v-else-if="style === 'dots'">
      <span class="dot" aria-hidden="true"></span>
      <span class="dot" aria-hidden="true"></span>
      <span class="dot" aria-hidden="true"></span>
    </template>
    <template v-else-if="style === 'ring'">
      <span class="ring" aria-hidden="true"></span>
    </template>
    <template v-else-if="style === 'pulse'">
      <span class="pulse" aria-hidden="true"></span>
    </template>
    <p v-if="message" class="text">{{ message }}</p>
  </div>
</template>

<style scoped>
.loader {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: calc(var(--ls) * 0.35);
  color: var(--color-text-muted);
}
.text {
  width: 100%;
  margin: 8px 0 0;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 600;
}
/* Orbe líquido */
.orb {
  width: var(--ls);
  height: var(--ls);
  border-radius: 46% 54% 58% 42% / 48% 44% 56% 52%;
  background: conic-gradient(from 200deg, #2f9e83, #37c3a2, #123a5f, #2f9e83);
  box-shadow: inset -4px -6px 14px rgba(13, 35, 60, 0.45), inset 4px 6px 14px rgba(255, 255, 255, 0.4),
    0 8px 18px rgba(13, 35, 60, 0.25);
  position: relative;
  animation: morph 3.6s ease-in-out infinite;
}
.orb::before {
  content: "";
  position: absolute;
  top: calc(var(--ls) * 0.12);
  left: calc(var(--ls) * 0.16);
  width: calc(var(--ls) * 0.24);
  height: calc(var(--ls) * 0.16);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  filter: blur(2px);
  animation: shine 3.6s ease-in-out infinite;
}
@keyframes morph {
  0%, 100% { border-radius: 46% 54% 58% 42% / 48% 44% 56% 52%; transform: rotate(0deg) scale(1); }
  33% { border-radius: 60% 40% 45% 55% / 42% 60% 40% 58%; transform: rotate(8deg) scale(1.05); }
  66% { border-radius: 40% 60% 58% 42% / 55% 42% 58% 45%; transform: rotate(-8deg) scale(0.97); }
}
@keyframes shine {
  0%, 100% { opacity: 0.45; transform: translate(0, 0); }
  50% { opacity: 0.95; transform: translate(calc(var(--ls) * 0.12), calc(var(--ls) * 0.18)); }
}
/* Gotitas */
.dot {
  width: calc(var(--ls) * 0.26);
  height: calc(var(--ls) * 0.26);
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  background: linear-gradient(135deg, #2f9e83, #37c3a2);
  animation: bounce 1.2s ease-in-out infinite;
}
.dot:nth-child(2) { animation-delay: 0.18s; }
.dot:nth-child(3) { animation-delay: 0.36s; }
@keyframes bounce {
  0%, 100% { transform: rotate(-45deg) translateY(0); opacity: 0.6; }
  50% { transform: rotate(-45deg) translateY(calc(var(--ls) * -0.3)); opacity: 1; }
}
/* Anillo */
.ring {
  width: var(--ls);
  height: var(--ls);
  border-radius: 50%;
  border: calc(var(--ls) * 0.1) solid rgba(46, 125, 138, 0.2);
  border-top-color: #2f9e83;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
/* Latido */
.pulse {
  width: calc(var(--ls) * 0.62);
  height: calc(var(--ls) * 0.62);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #7fe3c8, #2f9e83 70%);
  animation: beat 1.1s ease-in-out infinite;
}
@keyframes beat {
  0%, 100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(47, 158, 131, 0.45); }
  45% { transform: scale(1); box-shadow: 0 0 0 calc(var(--ls) * 0.18) rgba(47, 158, 131, 0); }
  60% { transform: scale(0.95); }
}
</style>
```

### 3.5 `src/components/ui/AppIcon.vue`

```vue
<script setup lang="ts">
import { computed } from "vue";

type Elem =
  | { k: "path"; d: string; fill?: boolean }
  | { k: "poly"; points: string; fill?: boolean }
  | { k: "circle"; cx: number; cy: number; r: number }
  | { k: "rect"; x: number; y: number; w: number; h: number; rx?: number }
  | { k: "line"; x1: number; y1: number; x2: number; y2: number };

const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 18 });

const ICONS: Record<string, Elem[]> = {
  home: [
    { k: "path", d: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" },
  ],
  calendar: [
    { k: "rect", x: 3, y: 5, w: 18, h: 16, rx: 2 },
    { k: "line", x1: 3, y1: 10, x2: 21, y2: 10 },
    { k: "line", x1: 8, y1: 3, x2: 8, y2: 7 },
    { k: "line", x1: 16, y1: 3, x2: 16, y2: 7 },
  ],
  file: [
    { k: "path", d: "M6 3h8l5 5v13H6z" },
    { k: "line", x1: 14, y1: 3, x2: 14, y2: 8 },
    { k: "line", x1: 19, y1: 8, x2: 14, y2: 8 },
    { k: "line", x1: 9, y1: 13, x2: 15, y2: 13 },
    { k: "line", x1: 9, y1: 17, x2: 15, y2: 17 },
  ],
  chart: [
    { k: "line", x1: 5, y1: 20, x2: 5, y2: 14 },
    { k: "line", x1: 12, y1: 20, x2: 12, y2: 8 },
    { k: "line", x1: 19, y1: 20, x2: 19, y2: 4 },
    { k: "line", x1: 3, y1: 21, x2: 21, y2: 21 },
  ],
  users: [
    { k: "circle", cx: 9, cy: 8, r: 3.5 },
    { k: "path", d: "M3 20c.8-3.2 3.2-5 6-5s5.2 1.8 6 5" },
    { k: "circle", cx: 17, cy: 9, r: 3 },
    { k: "path", d: "M15.5 15.2c2.1.3 4 1.8 4.7 4.8" },
  ],
  teams: [
    { k: "circle", cx: 9, cy: 8, r: 3.5 },
    { k: "circle", cx: 17, cy: 9, r: 3 },
    { k: "path", d: "M3 20c.7-2.9 2.9-4.6 6-4.6 1.6 0 2.8.4 3.8 1.2M15 15.5c2 .4 3.8 1.9 4.5 4.5" },
  ],
  sparkles: [
    { k: "path", d: "M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z", fill: true },
    { k: "path", d: "M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z", fill: true },
  ],
  book: [
    { k: "path", d: "M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z" },
    { k: "path", d: "M4 5v16a2 2 0 0 1 2-2h14" },
  ],
  mic: [
    { k: "rect", x: 9, y: 3, w: 6, h: 11, rx: 3 },
    { k: "path", d: "M5 11a7 7 0 0 0 14 0" },
    { k: "line", x1: 12, y1: 18, x2: 12, y2: 21 },
    { k: "line", x1: 8, y1: 21, x2: 16, y2: 21 },
  ],
  video: [
    { k: "rect", x: 3, y: 6, w: 13, h: 12, rx: 2 },
    { k: "path", d: "M16 11l5-3v8l-5-3z", fill: true },
  ],
  download: [
    { k: "path", d: "M12 4v10" },
    { k: "path", d: "M8 10l4 4 4-4" },
    { k: "path", d: "M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" },
  ],
  trophy: [
    { k: "path", d: "M7 4h10v6a5 5 0 0 1-10 0z" },
    { k: "path", d: "M7 6H4c0 4 2 7 5 8M17 6h3c0 4-2 7-5 8" },
    { k: "line", x1: 12, y1: 15, x2: 12, y2: 19 },
    { k: "line", x1: 8, y1: 20, x2: 16, y2: 20 },
  ],
  medal: [
    { k: "circle", cx: 12, cy: 14, r: 6 },
    { k: "path", d: "M12 12l1.1 2.2 2.4.3-1.8 1.7.5 2.5L12 17l-2.2 1.2.5-2.5L8.5 14.5l2.4-.3z", fill: true },
  ],
  chat: [
    { k: "path", d: "M4 5h16v11H10l-4 3z" },
    { k: "line", x1: 8, y1: 9, x2: 16, y2: 9 },
    { k: "line", x1: 8, y1: 13, x2: 13, y2: 13 },
  ],
  help: [
    { k: "circle", cx: 12, cy: 12, r: 9 },
    { k: "path", d: "M9.5 9.2a2.5 2.5 0 0 1 4.9.7c0 1.6-2.4 2-2.4 3.4" },
    { k: "circle", cx: 12, cy: 16.5, r: 0.9 },
  ],
  check: [
    { k: "path", d: "M4 12.5l5 5 11-11" },
  ],
  arrow: [
    { k: "path", d: "M5 12h14" },
    { k: "path", d: "M13 6l6 6-6 6" },
  ],
  play: [
    { k: "poly", points: "7 4 20 12 7 20", fill: true },
  ],
  eye: [
    { k: "path", d: "M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" },
    { k: "circle", cx: 12, cy: 12, r: 2.5 },
  ],
  logout: [
    { k: "path", d: "M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" },
    { k: "path", d: "M15 8l4 4-4 4" },
    { k: "path", d: "M8 12h10" },
  ],
  map: [
    { k: "path", d: "M9 4 4 6v14l5-2 6 2 5-2V4l-5 2z" },
    { k: "line", x1: 9, y1: 4, x2: 9, y2: 18 },
    { k: "line", x1: 15, y1: 6, x2: 15, y2: 20 },
  ],
  gauge: [
    { k: "path", d: "M4 15a8 8 0 1 1 16 0" },
    { k: "path", d: "M12 15l3.5-3.5" },
  ],
  lightning: [
    { k: "path", d: "M13 2 4 14h6l-1 8 9-12h-6z", fill: true },
  ],
  folder: [
    { k: "path", d: "M3 6a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
  ],
  star: [
    { k: "path", d: "M12 3l2.7 5.6 6.3.9-4.6 4.4 1.2 6.1L12 17l-5.6 3 1.2-6.1L3 9.5l6.3-.9z", fill: true },
  ],
  target: [
    { k: "circle", cx: 12, cy: 12, r: 8.5 },
    { k: "circle", cx: 12, cy: 12, r: 5 },
    { k: "circle", cx: 12, cy: 12, r: 1.4 },
  ],
  pencil: [
    { k: "path", d: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z", fill: true },
  ],
  copy: [
    { k: "path", d: "M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1z" },
    { k: "path", d: "M20 5H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z", fill: true },
  ],
};

const elems = computed(() => ICONS[props.name] ?? ICONS.star);
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-hidden="true">
    <template v-for="(e, i) in elems" :key="i">
      <path v-if="e.k === 'path'" :d="e.d" :fill="e.fill ? 'currentColor' : 'none'" />
      <polygon v-else-if="e.k === 'poly'" :points="e.points" :fill="e.fill ? 'currentColor' : 'none'" />
      <circle v-else-if="e.k === 'circle'" :cx="e.cx" :cy="e.cy" :r="e.r" />
      <rect v-else-if="e.k === 'rect'" :x="e.x" :y="e.y" :width="e.w" :height="e.h" :rx="e.rx ?? 0" />
      <line v-else-if="e.k === 'line'" :x1="e.x1" :y1="e.y1" :x2="e.x2" :y2="e.y2" />
    </template>
  </svg>
</template>
```

### 3.6 `src/components/ui/SkeletonRows.vue`

```vue
<script setup lang="ts">
import { loaderStyle } from "@/composables/useLoader";
import LoaderArt from "./LoaderArt.vue";
</script>

<template>
  <div class="skeleton-wrap">
    <LoaderArt :style="loaderStyle" :size="54" message="Cargando…" />
  </div>
</template>

<style scoped>
.skeleton-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 140px;
}
</style>
```

---

## 4. Selectores (UI para elegir)

### 4.1 Selector de avatar (modal)

Extraído de `StudentHomeView.vue`. La lógica asociada:

```ts
import Avatar from "@/components/ui/Avatar.vue";
import { AVATAR_FEATURES, AVATAR_STYLES, useAvatar } from "@/composables/useAvatar";

const avatar = useAvatar();
const avatarOpen = ref(false);
const previewStyle = ref(avatar.pref.value.style);
const avatarLevel = computed(() => /* tu nivel calculado */ 1);

function chooseAvatarStyle(style: string): void {
  previewStyle.value = style;
}
function saveAvatar(): void {
  avatar.choose({ style: previewStyle.value, seed: avatar.pref.value.seed });
  avatarOpen.value = false;
}
```

Plantilla del modal (usa `Teleport to="body"`):

```vue
<button class="btn" @click="avatarOpen = true; previewStyle = avatar.pref.value.style">
  Elegir personaje
</button>

<Teleport to="body">
  <div v-if="avatarOpen" class="avatar-overlay" role="presentation" @click.self="avatarOpen = false">
    <div class="avatar-dialog" role="dialog" aria-modal="true" aria-label="Elegir mi personaje">
      <div class="dialog-head">
        <div>
          <h2>Mi personaje</h2>
          <p class="muted small">Elige un estilo. Tu avatar evoluciona mientras avanzas de nivel.</p>
        </div>
        <button type="button" class="modal-close" aria-label="Cerrar" @click="avatarOpen = false">×</button>
      </div>

      <div class="preview-row">
        <Avatar :seed="avatar.pref.value.seed" :style="previewStyle" :level="avatarLevel" :size="140" />
        <div>
          <p><strong>Nivel {{ avatarLevel }}</strong></p>
          <p class="muted small">{{ /* xp */ 0 }} puntos</p>
        </div>
      </div>

      <p class="group-title">Estilos</p>
      <div class="styles-grid">
        <button
          v-for="s in AVATAR_STYLES"
          :key="s.id"
          type="button"
          class="style-card"
          :class="{ active: previewStyle === s.id }"
          @click="chooseAvatarStyle(s.id)"
        >
          <span class="style-emoji" aria-hidden="true">{{ s.emoji }}</span>
          <span>{{ s.label }}</span>
        </button>
      </div>

      <p class="group-title">Mejoras por nivel</p>
      <div class="features-grid">
        <div v-for="feature in AVATAR_FEATURES" :key="feature.minLevel" class="feature" :class="{ unlocked: avatarLevel >= feature.minLevel }">
          <span aria-hidden="true">{{ feature.icon }}</span>
          <div><strong>{{ feature.label }}</strong><small>Nivel {{ feature.minLevel }}+</small></div>
        </div>
      </div>

      <div class="dialog-actions">
        <button class="btn-primary-big" @click="saveAvatar">Guardar personaje</button>
      </div>
    </div>
  </div>
</Teleport>
```

> Las clases `.avatar-overlay`, `.avatar-dialog`, `.styles-grid`, `.features-grid`, etc.
> están definidas en los estilos de `StudentHomeView.vue`. Cópialas si quieres el
> mismo aspecto, o reemplázalas por tus propias clases.

### 4.2 Selector de loader (modal)

Extraído de `AccessibilityBar.vue`:

```ts
import { LOADER_STYLES, chooseLoader, loaderStyle } from "@/composables/useLoader";
import LoaderArt from "./LoaderArt.vue";

const loaderOpen = ref(false);
const currentLoader = computed(() => loaderStyle.value);
```

```vue
<button type="button" class="a11y-btn" @click="loaderOpen = true" title="Cambiar el cargador">
  ✨ Cargador
</button>

<Teleport to="body">
  <div v-if="loaderOpen" class="loader-overlay" role="presentation" @click.self="loaderOpen = false">
    <div class="loader-card" role="dialog" aria-modal="true" aria-label="Elegir mi cargador">
      <div class="loader-head">
        <div>
          <h3>Mi cargador</h3>
          <p class="muted small">Elige el estilo de "Cargando…". El orbe líquido es el inicial.</p>
        </div>
        <button type="button" class="loader-close" aria-label="Cerrar" @click="loaderOpen = false">×</button>
      </div>
      <div class="loader-grid">
        <button
          v-for="item in LOADER_STYLES"
          :key="item.id"
          type="button"
          class="loader-opt"
          :class="{ active: currentLoader === item.id }"
          @click="chooseLoader(item.id)"
        >
          <LoaderArt :style="item.id" :size="38" />
          <span>{{ item.emoji }} {{ item.label }}</span>
          <small v-if="currentLoader === item.id" class="picked">✓ En uso</small>
        </button>
      </div>
      <button type="button" class="reset-btn" @click="chooseLoader('orb')">Volver al orbe líquido (inicial)</button>
    </div>
  </div>
</Teleport>
```

### 4.3 Sincronizar el avatar del header

Si muestras el avatar en la barra superior, escucha el evento para refrescarlo
en vivo cuando el usuario guarde uno nuevo (patrón de `App.vue`):

```ts
const avatarTick = ref(0);
function refreshAvatar(): void {
  avatarTick.value += 1;
}
onMounted(() => window.addEventListener("pclab-avatar", refreshAvatar));
onBeforeUnmount(() => window.removeEventListener("pclab-avatar", refreshAvatar));
```

```vue
<span class="header-avatar" :key="avatarTick">
  <Avatar :seed="seedDelUsuario" :style="estiloGuardado" :size="42" hide-level />
</span>
```

---

## 5. Guía rápida de uso

### Icono

```vue
<AppIcon name="trophy" :size="20" />
```

Nombres disponibles: `home, calendar, file, chart, users, teams, sparkles, book,
mic, video, download, trophy, medal, chat, help, check, arrow, play, eye, logout,
map, gauge, lightning, folder, star, target, pencil, copy`.
Si el nombre no existe, cae en `star`.

### Avatar

```vue
<Avatar :seed="'uid-o-correo'" style="adventurer" :level="5" :size="96" />
<Avatar :seed="'uid'" :size="42" hide-level />   <!-- sin mejora, p.ej. header -->
```

### Loader

```vue
<!-- Fijo -->
<LoaderArt style="orb" :size="54" message="Cargando…" />

<!-- Ligado a la preferencia del usuario (recomendado) -->
<SkeletonRows />
```

---

## 6. Variables CSS requeridas

El sistema toma colores de tus variables globales. Este es el set de origen
(`src/styles/main.css`) como referencia; adáptalo a tu paleta:

```css
:root {
  --color-bg: #f6f7f9;
  --color-surface: #ffffff;
  --color-border: #dfe4ea;
  --color-primary: #123a5f;
  --color-primary-soft: #e8eef5;
  --color-accent: #0e7c66;
  --color-text: #1f2933;
  --color-text-muted: #5b6572;
  --radius: 10px;
  --shadow: 0 1px 3px rgba(18, 58, 95, 0.08);
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --font-scale: 1;
}
```

Los colores de los loaders y de los marcos de avatar están **hardcodeados** en
verde/azul/dorado. Si cambias de paleta, edita los valores hex dentro de
`LoaderArt.vue` y `Avatar.vue`.

---

## 7. Personalización y extensiones

### Añadir un estilo de avatar

1. Agrega una entrada a `AVATAR_STYLES` con un `id` que exista en DiceBear
   (consulta https://dicebear.com/styles).
2. No hace falta tocar `Avatar.vue`: la URL se construye con el `id`.

### Añadir una mejora por nivel

1. Agrega `{ minLevel, label, icon }` a `AVATAR_FEATURES`.
2. Ajusta `tierFor(level)` si quieres nuevos colores de marco (y agrega la clase
   `.tN` correspondiente en `Avatar.vue`).

### Añadir un loader

1. Agrega `{ id, label, emoji }` a `LOADER_STYLES`.
2. En `LoaderArt.vue` agrega un `<template v-else-if="style === 'tu-id'">` con el
   markup y su bloque `<style>` con la animación.

### Añadir un icono

Agrega una clave a `ICONS` en `AppIcon.vue` con un array de elementos
`path | poly | circle | rect | line` en un `viewBox` de `0 0 24 24`.

---

## 8. Checklist de integración

- [ ] Copiar los 6 archivos de la sección 3 en las rutas indicadas.
- [ ] Verificar que el alias `@` → `src` funcione (o ajustar imports).
- [ ] Definir las variables CSS de la sección 6.
- [ ] Insertar el selector de avatar y/o loader donde corresponda (sección 4).
- [ ] (Opcional) Escuchar `pclab-avatar` en el header para refresco en vivo.
- [ ] Reemplazar `SkeletonRows` en tus vistas de carga.
- [ ] `vue-tsc --noEmit` y build para validar tipos.

---

## 9. Notas de diseño

- **Sin dependencias npm**: ni iconos ni loaders requieren paquetes; el avatar
  solo usa la API HTTP de DiceBear.
- **Persistencia local**: las preferencias viven en `localStorage`
  (`pclab-avatar`, `pclab-loader`), no en el backend. Si quieres sincronizarlas
  entre dispositivos, guarda `AvatarPref` en tu base de datos.
- **Accesibilidad**: los loaders usan `role="status"` y `aria-live="polite"`;
  los iconos son decorativos (`aria-hidden`). El orbe es el loader por defecto.
- **Privacidad**: DiceBear recibe solo un `seed` (idealmente un UID o alias, no
  el nombre real del usuario).
