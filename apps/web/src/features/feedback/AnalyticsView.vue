<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { CourseAnalytics } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { getCourseAnalytics } from "@/services/importApi";
import BaseCard from "@/components/ui/BaseCard.vue";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const session = useSessionStore();
const courseId = ref(session.courses[0] ?? "");
const data = ref<CourseAnalytics | null>(null);
const loading = ref(true);
const error = ref("");

async function load(): Promise<void> {
  if (!courseId.value) return;
  loading.value = true;
  error.value = "";
  try {
    data.value = await getCourseAnalytics(courseId.value);
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
    <h1>Analítica pedagógica</h1>
    <p class="muted">Indicadores descriptivos por clase. Sin rankings ni etiquetas.</p>

    <label for="course">Curso</label>
    <select id="course" v-model="courseId" class="select" @change="load">
      <option v-for="c in session.courses" :key="c" :value="c">{{ c }}</option>
    </select>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <div v-else-if="data">
      <h2 class="section">Alertas pedagógicas</h2>
      <div v-if="data.alerts.length" class="alerts">
        <BaseCard v-for="(a, i) in data.alerts" :key="i" class="alert"><p>{{ a }}</p></BaseCard>
      </div>
      <p v-else class="muted">Sin alertas por ahora.</p>

      <h2 class="section">Por clase</h2>
      <div class="grid">
        <BaseCard v-for="cls in data.classes" :key="cls.classId" :title="cls.classId">
          <div class="row"><span>Aula invertida</span><strong>{{ cls.flippedPercent }}%</strong></div>
          <div class="row"><span>Evidencias pendientes</span><strong>{{ cls.pendingEvidences }}</strong></div>
          <div class="row"><span>Tickets de salida</span><strong>{{ cls.exitTickets }}</strong></div>
          <div class="row"><span>Dificultad percibida</span><strong>{{ cls.avgDifficulty ?? "—" }}</strong></div>
          <div class="row"><span>Participación</span><strong>{{ cls.participation }}</strong></div>

          <h3 v-if="cls.lowPerformance.length" class="qp-title">Preguntas con menor rendimiento</h3>
          <div v-for="q in cls.lowPerformance" :key="q.questionId" class="qp">
            <BaseBadge :tone="q.correctRate < 0.6 ? 'warning' : 'success'">
              {{ Math.round(q.correctRate * 100) }}% acierto
            </BaseBadge>
            <span>{{ q.quizTitle }} · {{ q.questionId }} · {{ q.attempts }} intento(s)</span>
          </div>
        </BaseCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
.muted {
  color: var(--color-text-muted);
}
.select {
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 1rem;
  margin: var(--space-2) 0 var(--space-4);
}
.section {
  margin-top: var(--space-5);
}
.alerts {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.alert p {
  margin: 0;
}
.grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}
.row {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
  border-bottom: 1px dashed var(--color-border);
}
.qp-title {
  margin: var(--space-3) 0 var(--space-1);
  font-size: 0.95rem;
}
.qp {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
  padding: 2px 0;
}
</style>
