<script setup lang="ts">
import { computed } from "vue";
import { useSyncStore } from "@/stores/sync";
import { SYNC_STATUS } from "@/services/offlineQueue";

const sync = useSyncStore();

const label = computed(() => {
  if (!sync.online) return "SIN CONEXIÓN — respuestas se guardarán para sincronizar";
  if (sync.status === SYNC_STATUS.ERROR) return `ERROR DE SINCRONIZACIÓN (${sync.pending} pendiente(s))`;
  if (sync.status === SYNC_STATUS.PENDING) return `PENDIENTE DE SINCRONIZAR (${sync.pending})`;
  return "SINCRONIZADO";
});

const tone = computed(() => {
  if (!sync.online || sync.status === SYNC_STATUS.ERROR) return "danger";
  if (sync.status === SYNC_STATUS.PENDING) return "warning";
  return "success";
});
</script>

<template>
  <div v-if="!sync.online || sync.hasPending || sync.hasError" class="banner" :data-tone="tone" role="status">
    <span class="dot" aria-hidden="true"></span>
    {{ label }}
    <button v-if="sync.hasPending && sync.online" class="btn btn-ghost btn-sm" @click="sync.flush()">Reintentar</button>
  </div>
</template>

<style scoped>
.banner {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-2) var(--space-4);
  font-size: 0.85rem;
  background: var(--color-primary-soft);
  color: var(--color-primary);
}
.banner[data-tone="success"] {
  background: #e2f4ee;
  color: var(--color-accent);
}
.banner[data-tone="warning"] {
  background: #fdf3e0;
  color: var(--color-warning);
}
.banner[data-tone="danger"] {
  background: #fdecea;
  color: var(--color-danger);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}
.btn-sm {
  padding: 2px 8px;
}
</style>
