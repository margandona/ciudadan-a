<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { CourseAnalytics, Student } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { getCourseAnalytics, getCourseReport } from "@/services/importApi";
import { currentActor, listStudents } from "@/infrastructure/appDeps";
import BaseCard from "@/components/ui/BaseCard.vue";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const session = useSessionStore();
const props = defineProps<{ courseId?: string }>();
const courseId = ref(props.courseId ?? session.courses[0] ?? "");
const data = ref<CourseAnalytics | null>(null);
const loading = ref(true);
const error = ref("");
const students = ref<Student[]>([]);
const report = ref<{ displayName: string; active: boolean; missionsDone: number; quizzes: number; evidence: number; tickets: number }[]>([]);

const learningSummary = computed(() => {
  const active = report.value.filter((row) => row.active);
  const engaged = active.filter((row) => row.missionsDone + row.quizzes + row.evidence + row.tickets > 0).length;
  const total = Math.max(1, active.length);
  const buckets = [0, 0, 0, 0];
  for (const row of active) {
    const bucket = row.missionsDone >= 10 ? 3 : row.missionsDone >= 7 ? 2 : row.missionsDone >= 4 ? 1 : 0;
    buckets[bucket] = (buckets[bucket] ?? 0) + 1;
  }
  const medals = students.value.reduce((sum, student) => sum + (student.stats?.badgesCount ?? 0), 0);
  return {
    active: active.length,
    engaged,
    continuity: Math.round((engaged / total) * 100),
    buckets,
    medals,
  };
});

async function load(): Promise<void> {
  if (!courseId.value) return;
  loading.value = true;
  error.value = "";
  try {
    [data.value, report.value, students.value] = await Promise.all([
      getCourseAnalytics(courseId.value),
      getCourseReport(courseId.value).then((result) => result.students),
      listStudents.run(courseId.value, currentActor()),
    ]);
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
      <h2 class="section">Panorama del aprendizaje</h2>
      <div class="summary-grid">
        <BaseCard><strong>{{ learningSummary.continuity }}%</strong><span>Continuidad de participación</span><small>estudiantes activas con al menos una evidencia, quiz, ticket o misión</small></BaseCard>
        <BaseCard><strong>{{ learningSummary.engaged }}/{{ learningSummary.active }}</strong><span>Estudiantes activas</span><small>con alguna interacción registrada</small></BaseCard>
        <BaseCard><strong>{{ learningSummary.medals }}</strong><span>Medallas obtenidas</span><small>acumuladas por el curso</small></BaseCard>
      </div>

      <h2 class="section">Curva de avance por misiones</h2>
      <div class="curve" aria-label="Distribución de estudiantes por avance">
        <div v-for="(count, index) in learningSummary.buckets" :key="index" class="curve-column">
          <span class="curve-count">{{ count }}</span>
          <div class="curve-bar" :style="{ height: `${Math.max(8, count * 22)}px` }"></div>
          <small>{{ index === 0 ? "0–3" : index === 1 ? "4–6" : index === 2 ? "7–9" : "10–12" }} misiones</small>
        </div>
      </div>

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
          <div class="row"><span>Tiempo promedio de quiz</span><strong>{{ cls.avgQuizMinutes ?? "—" }} min</strong></div>

          <h3 v-if="cls.lowPerformance.length" class="qp-title">Preguntas con menor rendimiento</h3>
          <div v-for="q in cls.lowPerformance" :key="q.questionId" class="qp">
            <BaseBadge :tone="q.correctRate < 0.6 ? 'warning' : 'success'">
              {{ Math.round(q.correctRate * 100) }}% acierto
            </BaseBadge>
            <span>{{ q.quizTitle }} · {{ q.questionId }} · {{ q.attempts }} intento(s)</span>
            <p v-if="q.suggestion" class="suggestion">{{ q.suggestion }}</p>
          </div>
        </BaseCard>
      </div>

      <h2 class="section">Errores y contenidos para reforzar</h2>
      <div class="error-list">
        <template v-for="cls in data.classes" :key="`${cls.classId}-errors`">
          <div v-for="q in cls.lowPerformance" :key="`${cls.classId}-${q.questionId}`" class="error-row">
            <strong>{{ Math.round(q.correctRate * 100) }}% de acierto</strong>
            <span>{{ cls.classId }} · {{ q.quizTitle }} · {{ q.questionId }}</span>
            <small>{{ q.suggestion || "Revisar explicación y practicar nuevamente." }}</small>
          </div>
        </template>
        <p v-if="!data.classes.some((cls) => cls.lowPerformance.length)" class="muted">No hay errores frecuentes detectados todavía.</p>
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
.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: var(--space-3); }
.summary-grid strong { display: block; font-size: 1.5rem; color: var(--color-primary); }
.summary-grid span, .summary-grid small { display: block; }
.summary-grid span { font-weight: 700; }
.summary-grid small { margin-top: 5px; color: var(--color-text-muted); line-height: 1.35; }
.curve { display: flex; align-items: end; gap: var(--space-4); min-height: 150px; padding: var(--space-4); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); }
.curve-column { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: end; gap: 6px; min-width: 60px; }
.curve-count { font-weight: 800; color: var(--color-primary); }
.curve-bar { width: min(54px, 80%); min-height: 8px; border-radius: 8px 8px 2px 2px; background: linear-gradient(180deg, var(--color-accent), #37c3a2); }
.curve-column small { color: var(--color-text-muted); text-align: center; }
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
  flex-direction: column;
  gap: 2px;
  padding: 2px 0;
}
.suggestion {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: var(--color-accent);
}
.error-list { display: flex; flex-direction: column; gap: 8px; }
.error-row { display: grid; grid-template-columns: 120px 1fr 1.4fr; gap: 10px; align-items: center; padding: 12px; border-left: 4px solid var(--color-danger); background: #fff5f3; border-radius: 8px; }
.error-row strong { color: var(--color-danger); }
.error-row small { color: var(--color-text-muted); }
@media (max-width: 700px) { .error-row { grid-template-columns: 1fr; gap: 4px; } .curve { gap: 8px; padding: var(--space-2); } }
</style>
