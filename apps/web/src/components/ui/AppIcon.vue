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
    { k: "circle", cx: 12, cy: 16.5, r: 0.9, },
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
    { k: "circle", cx: 12, cy: 12, r: 1.4, },
  ],
  pencil: [
    { k: "path", d: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z", fill: true },
  ],
  copy: [
    { k: "path", d: "M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1z" },
    { k: "path", d: "M20 5H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z", fill: true },
  ],
  seed: [
    { k: "path", d: "M12 3c3 3 3 8 0 12-3-4-3-9 0-12z" },
    { k: "path", d: "M12 15v6" },
  ],
  sprout: [
    { k: "path", d: "M12 21v-8" },
    { k: "path", d: "M12 13c-4 0-7-2-7-6 4 0 7 2 7 6z" },
    { k: "path", d: "M12 13c4 0 7-2 7-6-4 0-7 2-7 6z" },
  ],
  coin: [
    { k: "circle", cx: 12, cy: 12, r: 8 },
    { k: "path", d: "M12 8v8M9.5 10h5M9.5 14h5" },
  ],
  shop: [
    { k: "path", d: "M4 9l1-5h14l1 5" },
    { k: "path", d: "M5 9v11h14V9" },
    { k: "path", d: "M9 20v-6h6v6" },
  ],
  bag: [
    { k: "path", d: "M6 8h12l1 12H5z" },
    { k: "path", d: "M9 8a3 3 0 0 1 6 0" },
  ],
  sword: [
    { k: "path", d: "M14 4l6 6-9 9-3-3z" },
    { k: "path", d: "M5 19l3-3M3 21l3-3" },
  ],
  shield: [
    { k: "path", d: "M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" },
  ],
  wand: [
    { k: "path", d: "M5 19L15 9" },
    { k: "path", d: "M15 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1z", fill: true },
  ],
  shirt: [
    { k: "path", d: "M8 4l4 2 4-2 4 3-2 3-2-1v9H8v-9l-2 1-2-3z" },
  ],
  crown: [
    { k: "path", d: "M4 18h16l-1-9-4 3-3-5-3 5-4-3z" },
  ],
  gem: [
    { k: "path", d: "M6 3h12l3 6-9 12L3 9z" },
  ],
  key: [
    { k: "circle", cx: 8, cy: 8, r: 3 },
    { k: "path", d: "M10 10l9 9M15 15l2 2M17 13l2 2" },
  ],
  farm: [
    { k: "path", d: "M3 20h18" },
    { k: "path", d: "M5 20V9l7-5 7 5v11" },
    { k: "rect", x: 10, y: 13, w: 4, h: 7 },
  ],
  watering: [
    { k: "path", d: "M4 11h8v8H4z" },
    { k: "path", d: "M12 13h3l3-2v6l-3-2h-3" },
  ],
  tractor: [
    { k: "circle", cx: 7, cy: 17, r: 3 },
    { k: "circle", cx: 18, cy: 17, r: 2.2 },
    { k: "path", d: "M4 17V9h6l3 5h5" },
  ],
  bee: [
    { k: "circle", cx: 12, cy: 13, r: 4 },
    { k: "path", d: "M8 9l-3-2M16 9l3-2" },
    { k: "path", d: "M8 13h8M8 15h8" },
  ],
  bird: [
    { k: "path", d: "M4 8c4-3 8-3 11 0l5-2-2 4c0 5-4 8-9 8H4l3-3c-2-1-3-3-3-7z" },
  ],
  flame: [
    { k: "path", d: "M12 3c3 4 5 6 5 9a5 5 0 0 1-10 0c0-2 1-4 3-5 0 2 1 3 2 3 0-2 0-4 0-7z" },
  ],
  clock: [
    { k: "circle", cx: 12, cy: 12, r: 9 },
    { k: "path", d: "M12 7v5l3 2" },
  ],
  lock: [
    { k: "rect", x: 5, y: 10, w: 14, h: 10, rx: 2 },
    { k: "path", d: "M8 10V7a4 4 0 0 1 8 0v3" },
  ],
  gift: [
    { k: "rect", x: 4, y: 10, w: 16, h: 10, rx: 1 },
    { k: "path", d: "M4 10h16M12 10v10M12 10C10 6 6 6 7 4c1-2 5 0 5 6zM12 10c2-4 6-4 5-6-1-2-5 0-5 6z" },
  ],
  route: [
    { k: "circle", cx: 6, cy: 6, r: 2.5 },
    { k: "circle", cx: 18, cy: 18, r: 2.5 },
    { k: "path", d: "M8 6h6a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h1" },
  ],
  flag: [
    { k: "path", d: "M5 3v18" },
    { k: "path", d: "M5 4h12l-2 4 2 4H5z" },
  ],
  graduation: [
    { k: "path", d: "M2 9l10-4 10 4-10 4z" },
    { k: "path", d: "M6 11v5c3 2 9 2 12 0v-5" },
  ],
  flask: [
    { k: "path", d: "M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" },
  ],
  scales: [
    { k: "path", d: "M12 4v16M6 20h12M4 8h16" },
    { k: "path", d: "M4 8l-2 5a4 4 0 0 0 8 0zM20 8l2 5a4 4 0 0 1-8 0z" },
  ],
  globe: [
    { k: "circle", cx: 12, cy: 12, r: 9 },
    { k: "path", d: "M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" },
  ],
  handshake: [
    { k: "path", d: "M3 12l3-3 4 4 2-2 2 2 4-4 3 3-5 5-3-3-2 2-2-2-3 3z" },
  ],
  water: [
    { k: "path", d: "M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z" },
  ],
  sun: [
    { k: "circle", cx: 12, cy: 12, r: 4 },
    { k: "path", d: "M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" },
  ],
  moon: [
    { k: "path", d: "M20 14a8 8 0 1 1-9-11 7 7 0 0 0 9 11z" },
  ],
  wind: [
    { k: "path", d: "M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8" },
  ],
  leaf: [
    { k: "path", d: "M20 4C10 4 5 9 5 17l-1 3 3-1c8 0 13-5 13-15z" },
    { k: "path", d: "M7 17C9 13 12 10 16 8" },
  ],
  palette: [
    { k: "path", d: "M12 3a9 9 0 1 0 0 18c1 0 2-1 2-2 0-2-2-2-2-4 0-1 1-2 2-2h3a4 4 0 0 0 4-4c0-4-4-6-9-6z" },
    { k: "circle", cx: 8, cy: 10, r: 1, },
    { k: "circle", cx: 12, cy: 8, r: 1, },
    { k: "circle", cx: 8, cy: 14, r: 1, },
  ],
  rocket: [
    { k: "path", d: "M12 3c3 2 4 6 4 10l-4 3-4-3c0-4 1-8 4-10z" },
    { k: "circle", cx: 12, cy: 9, r: 1.5 },
    { k: "path", d: "M8 16l-2 4 3-1M16 16l2 4-3-1" },
  ],
  signpost: [
    { k: "path", d: "M12 3v18" },
    { k: "path", d: "M5 6h12l2 2-2 2H5zM19 13H7l-2 2 2 2h12z" },
  ],
  search: [
    { k: "circle", cx: 11, cy: 11, r: 7 },
    { k: "path", d: "M20 20l-4-4" },
  ],
  settings: [
    { k: "circle", cx: 12, cy: 12, r: 3 },
    { k: "path", d: "M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" },
  ],
  bell: [
    { k: "path", d: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" },
    { k: "path", d: "M10 20a2 2 0 0 0 4 0" },
  ],
  plus: [
    { k: "path", d: "M12 5v14M5 12h14" },
  ],
  minus: [
    { k: "path", d: "M5 12h14" },
  ],
  trash: [
    { k: "path", d: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" },
  ],
  heart: [
    { k: "path", d: "M12 20C5 15 3 11 5 8a4 4 0 0 1 7-1 4 4 0 0 1 7 1c2 3 0 7-7 12z" },
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
