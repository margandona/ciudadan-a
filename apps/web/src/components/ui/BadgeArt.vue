<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ icon: string; earned?: boolean; size?: number }>();

const BRAND: Record<string, string> = {
  star: "#c98a1a", flame: "#d2540f", flag: "#b5302a", "map-pin": "#d0475a",
  magnifier: "#1f6fd0", mic: "#6d41c9", compass: "#0b7a66", chart: "#1f6fd0",
  scale: "#8250a8", droplet: "#1f8fd8", bulb: "#c98a1a", trophy: "#b8860b",
  spyglass: "#1f6fd0", map: "#0b7a66", people: "#1f6fd0", handshake: "#8250a8",
  shield: "#0b7a66", sparkles: "#c98a1a", medal: "#c98a1a", rocket: "#d44f85",
  crown: "#b8860b", target: "#b5302a", bridge: "#1f6fd0", device: "#0b7a66",
};

const uid = "bg" + Math.random().toString(36).slice(2, 8);
const color = computed(() => (props.earned ? (BRAND[props.icon] ?? "#0b7a66") : "#8b98a8"));
const ringId = `ring-${uid}`;
const discId = `disc-${uid}`;

type S = { d: string; stroke?: boolean };

const SYMBOLS: Record<string, S[]> = {
  star: [{ d: "M24 6l5.3 10.7 11.9 1.7-8.6 8.4 2 11.9L24 33.2 13.4 38.7l2-11.9L6.8 18.4l11.9-1.7z" }],
  flame: [{ d: "M24 4c4 6 11 9 11 18a11 11 0 0 1-22 0C13 14 19 10 24 4z" }],
  flag: [{ d: "M14 6v38", stroke: true }, { d: "M14 8h20l-5 6 5 6H14z" }],
  "map-pin": [{ d: "M24 3C15 3 8 10 8 19c0 12 16 26 16 26s16-14 16-26C40 10 33 3 24 3zm0 19a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" }],
  magnifier: [{ d: "M21 4a17 17 0 1 0 0 34 17 17 0 0 0 0-34zm0 7a10 10 0 1 1 0 20 10 10 0 0 1 0-20z", stroke: true }, { d: "M34 34l9 9", stroke: true }],
  spyglass: [{ d: "M21 4a17 17 0 1 0 0 34 17 17 0 0 0 0-34zm0 7a10 10 0 1 1 0 20 10 10 0 0 1 0-20z", stroke: true }, { d: "M34 34l9 9", stroke: true }],
  mic: [{ d: "M20 4h8v15a4 4 0 0 1-8 0z", stroke: true }, { d: "M14 21a10 10 0 0 0 20 0", stroke: true }, { d: "M22 31v7", stroke: true }, { d: "M17 38h14", stroke: true }],
  compass: [{ d: "M24 3a21 21 0 1 0 0 42 21 21 0 0 0 0-42zm0 7a14 14 0 1 1 0 28 14 14 0 0 1 0-28z", stroke: true }, { d: "M24 12l5 12 7 12-12-5-12-7z" }],
  chart: [{ d: "M8 40V28", stroke: true }, { d: "M18 40V14", stroke: true }, { d: "M28 40V22", stroke: true }, { d: "M38 40V8", stroke: true }, { d: "M6 42h38", stroke: true }],
  scale: [{ d: "M24 5v38", stroke: true }, { d: "M16 12h16", stroke: true }, { d: "M24 12l-9 14 6 3 3-7 3 7 6-3z" }],
  droplet: [{ d: "M24 3c6 8 12 14 12 22a12 12 0 0 1-24 0C12 17 18 11 24 3z" }],
  bulb: [{ d: "M24 3a12 12 0 0 0-6 22c2 2 3 4 3 6h6c0-2 1-4 3-6a12 12 0 0 0-6-22z", stroke: true }, { d: "M19 34h10", stroke: true }, { d: "M20 40h8", stroke: true }],
  trophy: [{ d: "M16 5h16v11a8 8 0 0 1-16 0z", stroke: true }, { d: "M16 7H8c0 8 4 12 8 13", stroke: true }, { d: "M32 7h8c0 8-4 12-8 13", stroke: true }, { d: "M24 24v8", stroke: true }, { d: "M15 36h18", stroke: true }, { d: "M19 36v4h10v-4", stroke: true }],
  map: [{ d: "M6 8l12-4 12 4 12-4v32l-12 4-12-4-12 4z", stroke: true }, { d: "M18 4v32", stroke: true }, { d: "M30 8v32", stroke: true }],
  people: [{ d: "M14 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm0 15c-7 0-11 4-11 11v6h22v-6c0-7-4-11-11-11z" }, { d: "M34 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 14c5 0 10 3 10 9v6H32v-6c0-2-1-4-2-6z" }],
  handshake: [{ d: "M6 22c3-7 8-9 14-5l3 3 3-3c6-4 11-2 14 5v6H6z", stroke: true }, { d: "M6 28h38", stroke: true }],
  shield: [{ d: "M24 3l15 4v12c0 11-6 19-15 23C15 38 9 30 9 19V7z", stroke: true }, { d: "M17 21l5 5 9-11", stroke: true }],
  sparkles: [{ d: "M24 3l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" }, { d: "M41 24l3 6 6 3-6 3-3 6-3-6-6-3 6-3z", stroke: true }],
  medal: [{ d: "M18 26a9 9 0 1 0 12 0l6-10-8 4-2-8-6 8-6-8-2 8-8-4z", stroke: true }, { d: "M20 38a4 4 0 1 0 8 0 4 4 0 0 0-8 0z" }],
  rocket: [{ d: "M24 3c6 4 10 10 10 18l-10 10L14 21c0-8 4-14 10-18z", stroke: true }, { d: "M24 26v8", stroke: true }, { d: "M17 32l-5 9 8-3", stroke: true }, { d: "M31 32l5 9-8-3", stroke: true }, { d: "M20 14h8", stroke: true }],
  crown: [{ d: "M8 32l4-16 8 8 4-12 4 12 8-8 4 16z", stroke: true }, { d: "M8 37h32", stroke: true }],
  target: [{ d: "M24 3a21 21 0 1 0 0 42 21 21 0 0 0 0-42z", stroke: true }, { d: "M24 11a13 13 0 1 0 0 26 13 13 0 0 0 0-26z", stroke: true }, { d: "M24 19a5 5 0 1 0 0 10 5 5 0 0 0 0-10z", stroke: true }],
  bridge: [{ d: "M6 28c5-10 10-6 14 0s9 10 14 0", stroke: true }, { d: "M24 16v14", stroke: true }],
  device: [{ d: "M12 8h40v28H12z", stroke: true }, { d: "M16 16h32v16H16z" }, { d: "M24 40h16", stroke: true }],
};
</script>

<template>
  <svg :width="size ?? 64" :height="size ?? 64" viewBox="0 0 64 64" role="img" class="badge-art" :class="{ earned: !!earned, locked: !earned }">
    <defs>
      <linearGradient :id="ringId" x1="0" y1="0" x2="1" y2="1">
        <template v-if="earned">
          <stop offset="0" stop-color="#fff4c2" />
          <stop offset="0.45" stop-color="#f6c945" />
          <stop offset="1" stop-color="#b8860b" />
        </template>
        <template v-else>
          <stop offset="0" stop-color="#f1f5f9" />
          <stop offset="0.45" stop-color="#cbd5e1" />
          <stop offset="1" stop-color="#94a3b8" />
        </template>
      </linearGradient>
      <radialGradient :id="discId" cx="0.35" cy="0.3" r="0.9">
        <template v-if="earned">
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="0.7" stop-color="#fff7de" />
          <stop offset="1" stop-color="#f3d98b" />
        </template>
        <template v-else>
          <stop offset="0" stop-color="#ffffff" />
          <stop offset="1" stop-color="#eef2f7" />
        </template>
      </radialGradient>
    </defs>

    <!-- Anillo exterior metálico -->
    <circle cx="32" cy="32" r="30" :fill="`url(#${ringId})`" />
    <!-- Canto del anillo -->
    <circle cx="32" cy="32" r="30" fill="none" :stroke="earned ? '#8a6500' : '#64748b'" stroke-opacity="0.6" stroke-width="1" />
    <!-- Disco interior -->
    <circle cx="32" cy="32" r="24" :fill="`url(#${discId})`" />
    <circle cx="32" cy="32" r="24" fill="none" :stroke="earned ? '#c98a1a' : '#94a3b8'" stroke-opacity="0.5" stroke-width="0.8" />

    <!-- Brillo superior cuando está ganada -->
    <ellipse v-if="earned" cx="21" cy="17" rx="14" ry="8" fill="#ffffff" opacity="0.5" transform="rotate(-24 21 17)" />

    <!-- Destellos cuando está ganada -->
    <template v-if="earned">
      <path d="M12 10l1.4 3 3 1.4-3 1.4-1.4 3-1.4-3-3-1.4 3-1.4z" fill="#ffffff" opacity="0.9" />
      <path d="M52 44l1.3 2.7 2.7 1.3-2.7 1.3-1.3 2.7-1.3-2.7-2.7-1.3 2.7-1.3z" fill="#ffffff" opacity="0.8" />
    </template>

    <!-- Icono central -->
    <g :color="color" transform="translate(8 8)">
      <template v-for="s in (SYMBOLS[icon] ?? SYMBOLS.star)" :key="s.d">
        <path
          :d="s.d"
          :fill="s.stroke ? 'none' : 'currentColor'"
          :stroke="s.stroke ? 'currentColor' : 'none'"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </template>
    </g>
  </svg>
</template>

<style scoped>
.badge-art {
  display: inline-block;
  vertical-align: middle;
}
.badge-art.earned {
  filter: drop-shadow(0 3px 5px rgba(184, 134, 11, 0.45));
}
.badge-art.locked {
  filter: grayscale(1);
  opacity: 0.55;
}
</style>
