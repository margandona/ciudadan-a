<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { CalendarAlert } from "@pclab/shared";
import { CALENDAR_STATUS } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { getCalendarAlerts } from "@/services/importApi";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const session = useSessionStore();
const courseId = ref(session.courses[0] ?? "");
const alerts = ref<CalendarAlert[]>([]);
const loading = ref(true);
const error = ref("");

async function load(): Promise<void> {
  if (!courseId.value) return;
  loading.value = true;
  error.value = "";
  try {
    alerts.value = await getCalendarAlerts(courseId.value);
  } catch (e) {
    error.value = (e as Error).message ?? "No disponible.";
  } finally {
    loading.value = false;
  }
}

function tone(status: string): "success" | "warning" | "danger" {
  return status === CALENDAR_STATUS.GREEN ? "success" : status === CALENDAR_STATUS.YELLOW ? "warning" : "danger";
}

onMounted(load);
</script>

<template>
  <div>
    <h1>Calendario administrativo</h1>
    <p class="muted">
      Guías: solicitar impresión <strong>3 días antes</strong> · Evaluaciones: enviar al evaluador <strong>7 días antes</strong>.
    </p>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <p v-else-if="alerts.length === 0" class="muted">
      No hay materiales con plazos en este curso. Se poblará cuando existan guías/evaluaciones con fechas.
    </p>

    <div v-else class="list">
      <div v-for="a in alerts" :key="`${a.materialId}-${a.kind}`" class="item" :data-status="a.status">
        <BaseBadge :tone="tone(a.status)">
          {{ a.status === CALENDAR_STATUS.GREEN ? "Listo" : a.status === CALENDAR_STATUS.YELLOW ? "Plazo próximo" : "Crítico / vencido" }}
        </BaseBadge>
        <div>
          <strong>{{ a.title }}</strong>
          <p class="muted small">{{ a.kind === "print" ? "Impresión" : "Revisión evaluador" }} · {{ a.deadline.slice(0, 10) }} · {{ a.daysLeft }} día(s)</p>
          <p class="small">{{ a.message }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.muted {
  color: var(--color-text-muted);
}
.small {
  font-size: 0.85rem;
}
.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.item {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-left: 5px solid var(--color-accent);
  border-radius: var(--radius);
  padding: var(--space-3);
}
.item[data-status="yellow"] {
  border-left-color: var(--color-warning);
}
.item[data-status="red"] {
  border-left-color: var(--color-danger);
}
</style>
