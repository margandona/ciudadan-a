<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { FeedbackTendencies } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { getFeedbackTendencies } from "@/services/importApi";
import BaseCard from "@/components/ui/BaseCard.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const session = useSessionStore();
const courseId = ref(session.courses[0] ?? "");
const data = ref<FeedbackTendencies | null>(null);
const loading = ref(true);
const error = ref("");

async function load(): Promise<void> {
  if (!courseId.value) return;
  loading.value = true;
  error.value = "";
  try {
    data.value = await getFeedbackTendencies(courseId.value);
  } catch (e) {
    error.value = (e as Error).message ?? "No disponible.";
  } finally {
    loading.value = false;
  }
}

const rows = (t: NonNullable<FeedbackTendencies>["tendencies"][number]) => [
  ["Fácil de encontrar", t.avg.appEasy],
  ["Aplicación clara", t.avg.appClear],
  ["Actividades funcionaron", t.avg.appWorking],
  ["Entendí el objetivo", t.avg.objective],
  ["Explicaciones claras", t.avg.clarity],
  ["Actividades ayudaron", t.avg.helpful],
  ["Pude participar", t.avg.participated],
  ["Me sentí cómoda", t.avg.comfortable],
];

onMounted(load);
</script>

<template>
  <div>
    <h1>Feedback de tus clases</h1>
    <p class="muted">Tendencias agregadas de las clases 1, 4, 7 y 10 · información descriptiva, no un juicio.</p>

    <label for="course">Curso</label>
    <select id="course" v-model="courseId" class="select" @change="load">
      <option v-for="c in session.courses" :key="c" :value="c">{{ c }}</option>
    </select>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <p v-else-if="data && data.totalResponses === 0" class="muted">
      Aún no hay respuestas de feedback en este curso.
    </p>

    <div v-else-if="data" class="grid">
      <BaseCard v-for="t in data.tendencies" :key="t.classId" :title="`${t.classId} · ${t.responses} respuesta(s)`">
        <div v-for="[label, value] in rows(t)" :key="label" class="row">
          <span>{{ label }}</span>
          <strong>{{ value }}</strong>
        </div>

        <h3 class="comments-title">Comentarios abiertos</h3>
        <div v-for="(c, i) in t.openComments" :key="i" class="comment">
          <p class="muted small">{{ c.anon ? "Anónimo" : "No anónimo" }}</p>
          <p v-if="c.keep">Mantener: {{ c.keep }}</p>
          <p v-if="c.change">Cambiar: {{ c.change }}</p>
          <p v-if="c.bestActivity">Actividad más útil: {{ c.bestActivity }}</p>
          <p v-if="c.appOpen">App: {{ c.appOpen }}</p>
        </div>
      </BaseCard>
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
.select {
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 1rem;
  margin: var(--space-2) 0 var(--space-4);
}
.grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}
.row {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
  border-bottom: 1px dashed var(--color-border);
}
.comments-title {
  margin: var(--space-3) 0 var(--space-1);
  font-size: 0.95rem;
}
.comment {
  border-top: 1px dashed var(--color-border);
  padding: var(--space-2) 0;
}
</style>
