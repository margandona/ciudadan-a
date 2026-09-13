<script setup lang="ts">
import { usePwaInstall } from "@/composables/usePwaInstall";

const { canInstall, install } = usePwaInstall();
</script>

<template>
  <div v-if="canInstall" class="pwa-banner" role="status">
    <span>¿Quieres tener el Observatorio Ciudadano en tu celular?</span>
    <button type="button" class="pwa-btn" @click="install">Instalar app</button>
    <button type="button" class="pwa-close" aria-label="Cerrar aviso" @click="canInstall = false">×</button>
  </div>
</template>

<style scoped>
.pwa-banner {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: var(--space-4);
  z-index: 1001;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: var(--color-primary);
  color: #fff;
  padding: var(--space-3) var(--space-4);
  border-radius: 14px;
  box-shadow: 0 10px 26px rgba(18, 58, 95, 0.35);
  font-size: 0.9rem;
  max-width: min(92vw, 460px);
  flex-wrap: wrap;
}
.pwa-btn {
  background: #fff;
  color: var(--color-primary);
  border: none;
  border-radius: 999px;
  padding: 8px 16px;
  font-weight: 700;
  cursor: pointer;
}
.pwa-close {
  background: transparent;
  color: #fff;
  border: none;
  font-size: 1.3rem;
  cursor: pointer;
  line-height: 1;
}
</style>
