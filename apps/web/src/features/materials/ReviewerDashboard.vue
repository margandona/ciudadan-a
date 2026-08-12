<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { Material } from "@pclab/shared";
import { MATERIAL_STATUS_LABELS } from "@pclab/shared";
import { listPendingMaterials } from "@/services/importApi";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";
import MaterialDetailView from "./MaterialDetailView.vue";

const props = defineProps<{ role: "PIE" | "UTP" }>();

const materials = ref<Material[]>([]);
const selected = ref("");
const loading = ref(true);
const error = ref("");

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    materials.value = await listPendingMaterials();
  } catch (e) {
    error.value = (e as Error).message ?? "No disponible.";
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <h1>Material pendiente de revisión — {{ props.role }}</h1>
    <p class="muted">Revisa, comenta, aprueba o solicita cambios del material asignado.</p>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <template v-else>
      <p v-if="materials.length === 0" class="muted">No tienes material pendiente de revisión.</p>
      <ul v-else class="list">
        <li v-for="m in materials" :key="m.id">
          <button class="item" :class="{ active: selected === m.id }" @click="selected = m.id">
            <strong>{{ m.title }}</strong>
            <span class="muted small">{{ m.classId ?? "sin clase" }} · {{ m.type }}</span>
            <BaseBadge :tone="m.status === 'APROBADO_FINAL' ? 'success' : 'warning'">{{ MATERIAL_STATUS_LABELS[m.status] }}</BaseBadge>
            <span class="muted small">Enviado: {{ m.sentAt?.slice(0, 10) ?? "—" }} · Límite: {{ m.reviewDeadline?.slice(0, 10) ?? "—" }}</span>
          </button>
        </li>
      </ul>

      <MaterialDetailView v-if="selected" :material-id="selected" />
    </template>
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
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.item {
  width: 100%;
  text-align: left;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--space-3);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.item.active {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}
</style>
