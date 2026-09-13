<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useSounds } from "@/composables/useSounds";
import { LOADER_STYLES, chooseLoader, loaderStyle } from "@/composables/useLoader";
import LoaderArt from "./LoaderArt.vue";

const SCALE_KEY = "pclab-font-scale";
const HC_KEY = "pclab-high-contrast";
const DARK_KEY = "pclab-dark";

const fontScale = ref(1);
const highContrast = ref(false);
const dark = ref(false);
const soundOn = ref(!useSounds.isMuted());
const loaderOpen = ref(false);
const currentLoader = computed(() => loaderStyle.value);

function apply(): void {
  const root = document.documentElement;
  root.style.setProperty("--font-scale", String(fontScale.value));
  root.classList.toggle("hc", highContrast.value);
  root.classList.toggle("dark", dark.value);
  localStorage.setItem(SCALE_KEY, String(fontScale.value));
  localStorage.setItem(HC_KEY, highContrast.value ? "1" : "0");
  localStorage.setItem(DARK_KEY, dark.value ? "1" : "0");
}

function bigger(): void {
  fontScale.value = Math.min(1.4, Number((fontScale.value + 0.1).toFixed(2)));
  apply();
}

function smaller(): void {
  fontScale.value = Math.max(0.9, Number((fontScale.value - 0.1).toFixed(2)));
  apply();
}

function toggleContrast(): void {
  highContrast.value = !highContrast.value;
  apply();
}

function toggleDark(): void {
  dark.value = !dark.value;
  apply();
}

function toggleSound(): void {
  soundOn.value = !soundOn.value;
  useSounds.setMuted(!soundOn.value);
}

onMounted(() => {
  fontScale.value = Math.min(1.4, Math.max(0.9, Number(localStorage.getItem(SCALE_KEY) ?? "1")));
  highContrast.value = localStorage.getItem(HC_KEY) === "1";
  dark.value = localStorage.getItem(DARK_KEY) === "1";
  apply();
});
</script>

<template>
  <nav class="a11y" aria-label="Accesibilidad">
    <button type="button" class="a11y-btn" :aria-label="`Reducir tamaño de letra (actual ${Math.round(fontScale * 100)}%)`" @click="smaller">A−</button>
    <button type="button" class="a11y-btn" :aria-label="`Aumentar tamaño de letra (actual ${Math.round(fontScale * 100)}%)`" @click="bigger">A+</button>
    <button type="button" class="a11y-btn" :aria-pressed="highContrast" @click="toggleContrast">
      {{ highContrast ? "Contraste on" : "Contraste" }}
    </button>
    <button type="button" class="a11y-btn" :aria-pressed="dark" @click="toggleDark">
      {{ dark ? "☾ Claro" : "☾ Oscuro" }}
    </button>
    <button type="button" class="a11y-btn" @click="loaderOpen = true" title="Cambiar el cargador">
      ✨ Cargador
    </button>
    <button type="button" class="a11y-btn" :aria-pressed="soundOn" :aria-label="soundOn ? 'Silenciar sonidos' : 'Activar sonidos'" @click="toggleSound">
      {{ soundOn ? "Sonido on" : "Sonido off" }}
    </button>
  </nav>

  <Teleport to="body">
    <div v-if="loaderOpen" class="loader-overlay" role="presentation" @click.self="loaderOpen = false">
      <div class="loader-card" role="dialog" aria-modal="true" aria-label="Elegir mi cargador">
        <div class="loader-head">
          <div>
            <h3>Mi cargador</h3>
            <p class="muted small">Elige el estilo de “Cargando…”. El orbe líquido es el inicial.</p>
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
</template>

<style scoped>
.a11y {
  position: fixed;
  right: var(--space-3);
  bottom: var(--space-3);
  display: flex;
  gap: 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  box-shadow: var(--shadow);
  padding: 4px 6px;
  z-index: 1000;
}
.a11y-btn {
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  border-radius: 999px;
  color: var(--color-primary);
  font-size: 0.8rem;
  font-weight: 700;
  padding: 4px 10px;
  cursor: pointer;
}
.a11y-btn[aria-pressed="true"] {
  background: var(--color-primary);
  color: #ffffff;
}
.loader-overlay {
  position: fixed;
  inset: 0;
  z-index: 2600;
  background: rgba(8, 15, 25, 0.6);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: var(--space-4);
}
.loader-card {
  width: min(560px, 96vw);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  padding: var(--space-5);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
}
.loader-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
}
.loader-head h3 { margin: 0 0 3px; color: var(--color-primary); }
.loader-close {
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 1.7rem;
  cursor: pointer;
  line-height: 1;
}
.loader-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px;
  margin: var(--space-4) 0;
}
.loader-opt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 6px;
  border: 2px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-bg);
  color: var(--color-text);
  cursor: pointer;
  font: inherit;
}
.loader-opt.active { border-color: var(--color-accent); background: #eefaf6; }
.picked { color: var(--color-accent); font-weight: 800; }
.reset-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-primary);
  border-radius: 999px;
  padding: 8px 14px;
  cursor: pointer;
  font-weight: 700;
}
</style>
