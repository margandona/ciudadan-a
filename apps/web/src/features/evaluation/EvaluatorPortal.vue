<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { Material, MaterialDetail } from "@pclab/shared";
import { MATERIAL_STATUS, MATERIAL_STATUS_LABELS } from "@pclab/shared";
import { getMaterialDetail, listMaterialsForEvaluator, reviewMaterial } from "@/services/importApi";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const materials = ref<Material[]>([]);
const detail = ref<MaterialDetail | null>(null);
const loading = ref(true);
const error = ref("");
const notice = ref("");
const comment = ref("");
const decision = ref<string>(MATERIAL_STATUS.APROBADO);
const busy = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    materials.value = await listMaterialsForEvaluator();
  } catch (e) {
    error.value = (e as Error).message ?? "No disponible.";
  } finally {
    loading.value = false;
  }
}

async function open(material: Material): Promise<void> {
  notice.value = "";
  detail.value = null;
  comment.value = "";
  decision.value = MATERIAL_STATUS.APROBADO;
  try {
    detail.value = await getMaterialDetail(material.id);
  } catch (e) {
    notice.value = (e as Error).message;
  }
}

async function review(): Promise<void> {
  if (!detail.value || !comment.value.trim()) {
    notice.value = "Agrega un comentario a la revisión.";
    return;
  }
  busy.value = true;
  notice.value = "";
  try {
    detail.value = await reviewMaterial({
      materialId: detail.value.material.id,
      courseId: detail.value.material.courseId,
      status: decision.value,
      comment: comment.value,
    });
    notice.value = "Revisión registrada.";
    await load();
  } catch (e) {
    notice.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

function tone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === MATERIAL_STATUS.APROBADO) return "success";
  if (status === MATERIAL_STATUS.RECHAZADO) return "danger";
  if (status === MATERIAL_STATUS.CON_OBSERVACIONES || status === MATERIAL_STATUS.CORREGIR_Y_REENVIAR) return "warning";
  return "neutral";
}

onMounted(load);
</script>

<template>
  <div>
    <h1>Portal del evaluador</h1>
    <p class="muted">Revisa solo el material asignado; no verás datos de estudiantes.</p>

    <p v-if="notice" class="notice" role="status">{{ notice }}</p>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <div v-else class="layout">
      <aside class="list">
        <h2>Material asignado</h2>
        <p v-if="materials.length === 0" class="muted">No tienes material por revisar.</p>
        <button
          v-for="m in materials"
          :key="m.id"
          class="item"
          :class="{ active: detail?.material.id === m.id }"
          @click="open(m)"
        >
          <strong>{{ m.title }}</strong>
          <BaseBadge :tone="tone(m.status)">{{ MATERIAL_STATUS_LABELS[m.status] }}</BaseBadge>
          <span class="muted small">{{ m.type }} · enviado {{ m.sentAt?.slice(0, 10) ?? "—" }}</span>
        </button>
      </aside>

      <section v-if="detail" class="panel">
        <h2>{{ detail.material.title }}</h2>
        <p class="muted small">Estado: {{ MATERIAL_STATUS_LABELS[detail.material.status] }} · OA: {{ detail.material.oaIds?.join(", ") ?? "—" }}</p>

        <h3>Versiones</h3>
        <div v-for="v in detail.versions" :key="v.id" class="version">
          <BaseBadge :tone="v.kind === 'DUA' ? 'warning' : 'neutral'">{{ v.kind }}</BaseBadge>
          <span>v{{ v.version }} — {{ v.fileName }}</span>
          <a v-if="v.url" :href="v.url" target="_blank" rel="noopener">Descargar</a>
        </div>
        <p v-if="detail.versions.length === 0" class="muted small">Sin versiones cargadas.</p>

        <h3>Historial de observaciones</h3>
        <div v-for="c in detail.comments" :key="c.id" class="comment">
          <p>{{ c.text }}</p>
          <span class="muted small">{{ c.role }} · {{ c.at.slice(0, 10) }}</span>
        </div>
        <p v-if="detail.comments.length === 0" class="muted small">Sin comentarios.</p>

        <template v-if="detail.material.status !== MATERIAL_STATUS.APROBADO && detail.material.status !== MATERIAL_STATUS.RECHAZADO">
          <h3>Revisión</h3>
          <textarea v-model="comment" rows="4" class="input" placeholder="Comentario de la revisión…"></textarea>
          <select v-model="decision" class="select">
            <option :value="MATERIAL_STATUS.APROBADO">Aprobar</option>
            <option :value="MATERIAL_STATUS.CON_OBSERVACIONES">Con observaciones</option>
            <option :value="MATERIAL_STATUS.CORREGIR_Y_REENVIAR">Corregir y reenviar</option>
            <option :value="MATERIAL_STATUS.RECHAZADO">Rechazar</option>
          </select>
          <button class="btn btn-primary" :disabled="busy" @click="review">Registrar revisión</button>
        </template>
        <p v-else class="muted">Este material ya fue {{ MATERIAL_STATUS_LABELS[detail.material.status].toLowerCase() }}.</p>
      </section>
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
.notice {
  background: var(--color-primary-soft);
  padding: var(--space-3);
  border-radius: var(--radius);
}
.layout {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: 1fr;
}
@media (min-width: 860px) {
  .layout {
    grid-template-columns: 320px 1fr;
  }
}
.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.item {
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
.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--space-4);
}
.version,
.comment {
  border-top: 1px dashed var(--color-border);
  padding: var(--space-2) 0;
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}
.comment {
  flex-direction: column;
  align-items: flex-start;
}
.input,
.select {
  width: 100%;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-family: inherit;
  font-size: 0.95rem;
  margin: var(--space-2) 0;
}
</style>
