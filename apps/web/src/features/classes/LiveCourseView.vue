<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { getLiveCourseSnapshot, type LiveCourseSnapshot } from "@/services/importApi";
import AppErrorState from "@/components/ui/AppErrorState.vue";
import BaseBadge from "@/components/ui/BaseBadge.vue";

const props = defineProps<{ courseId: string }>();

const snapshot = ref<LiveCourseSnapshot | null>(null);
const loading = ref(true);
const error = ref("");
const filter = ref<"todos" | "activos" | "hoy">("todos");
const lastUpdate = ref<Date | null>(null);
let timer: ReturnType<typeof setInterval> | null = null;

const workingToday = computed(() => (snapshot.value?.students ?? []).filter((s) => s.submissionsToday + s.quizzesToday + s.ticketsToday + s.flippedReady > 0).length);
const filteredRows = computed(() => {
  const rows = snapshot.value?.students ?? [];
  if (filter.value === "activos") return rows.filter((r) => r.active);
  if (filter.value === "hoy") {
    return rows.filter((r) => (r.lastSeenAt && r.lastSeenAt.slice(0, 10) === new Date().toISOString().slice(0, 10)) || r.submissionsToday + r.quizzesToday + r.ticketsToday > 0);
  }
  return rows;
});
const activeRatio = computed(() => {
  const s = snapshot.value;
  if (!s || s.totalStudents === 0) return 0;
  return Math.round((s.activeNow / s.totalStudents) * 100);
});

async function load(): Promise<void> {
  try {
    snapshot.value = await getLiveCourseSnapshot(props.courseId, 120);
    lastUpdate.value = new Date();
    error.value = "";
  } catch (e) {
    error.value = (e as Error).message ?? "No se pudo cargar.";
  } finally {
    loading.value = false;
  }
}

function minutesAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  return `hace ${Math.floor(diff / 3600)} h`;
}

onMounted(() => {
  load();
  timer = setInterval(load, 12_000);
});
onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div>
    <RouterLink :to="`/teacher/courses/${courseId}`" class="back">← Dashboard del curso</RouterLink>
    <div class="head">
      <div>
        <h1>Seguimiento en tiempo real</h1>
        <p class="muted">Quiénes están conectados y trabajando ahora, con promedios de los activos y del curso completo.</p>
      </div>
      <button class="btn btn-primary" @click="load">Actualizar ahora</button>
    </div>

    <p v-if="lastUpdate" class="muted small">Última actualización: {{ lastUpdate.toLocaleTimeString("es-CL") }} · se refresca cada 12 s</p>

    <SkeletonRows v-if="loading && !snapshot" />
    <AppErrorState v-else-if="error && !snapshot" :message="error" @retry="load" />

    <template v-else-if="snapshot">
      <div class="cards">
        <div class="card live"><strong>{{ snapshot.activeNow }}<small class="dot" aria-hidden="true"></small></strong><span>En línea ahora</span></div>
        <div class="card"><strong>{{ activeRatio }}%</strong><span>Conectados del curso</span></div>
        <div class="card"><strong>{{ workingToday }}</strong><span>Avanzaron hoy</span></div>
        <div class="card"><strong>{{ snapshot.totalStudents }}</strong><span>Total del curso</span></div>
        <div class="card warn"><strong>{{ snapshot.pendingReviews }}</strong><span>Entregas por revisar</span></div>
      </div>

      <h2 class="section">Promedios</h2>
      <div class="cards">
        <div class="card"><strong>{{ snapshot.averages.flippedReady.active }}</strong><span>Misiones listas · activos</span></div>
        <div class="card"><strong>{{ snapshot.averages.flippedReady.total }}</strong><span>Misiones listas · curso</span></div>
        <div class="card"><strong>{{ snapshot.averages.submissionsToday.active }}</strong><span>Evidencias hoy · activos</span></div>
        <div class="card"><strong>{{ snapshot.averages.submissionsToday.total }}</strong><span>Evidencias hoy · curso</span></div>
        <div class="card"><strong>{{ snapshot.averages.quizzesToday.active }}</strong><span>Quizzes hoy · activos</span></div>
        <div class="card"><strong>{{ snapshot.averages.quizzesToday.total }}</strong><span>Quizzes hoy · curso</span></div>
      </div>

      <div class="table-head">
        <h2>Estudiantes</h2>
        <div class="chips" role="tablist" aria-label="Filtrar estudiantes">
          <button type="button" class="chip" :class="{ active: filter === 'todos' }" @click="filter = 'todos'">Todas ({{ snapshot.students.length }})</button>
          <button type="button" class="chip" :class="{ active: filter === 'activos' }" @click="filter = 'activos'">En línea ({{ snapshot.activeNow }})</button>
          <button type="button" class="chip" :class="{ active: filter === 'hoy' }" @click="filter = 'hoy'">Con actividad hoy</button>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <caption class="sr-only">Estado y avance de estudiantes</caption>
          <thead>
            <tr>
              <th scope="col">Estudiante</th>
              <th scope="col">Estado</th>
              <th scope="col">Última actividad</th>
              <th scope="col">Misiones listas</th>
              <th scope="col">Hoy · Evidencias</th>
              <th scope="col">Hoy · Quizzes</th>
              <th scope="col">Hoy · Tickets</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in filteredRows" :key="s.studentId">
              <td>{{ s.name }}</td>
              <td>
                <span v-if="s.active" class="state on"><span class="pulse" aria-hidden="true"></span>En línea</span>
                <BaseBadge v-else tone="neutral">Inactiva</BaseBadge>
              </td>
              <td>{{ minutesAgo(s.lastSeenAt) }}</td>
              <td>{{ s.flippedReady }}</td>
              <td>{{ s.submissionsToday }}<span class="muted small"> ({{ s.submissionsTotal }})</span></td>
              <td>{{ s.quizzesToday }}<span class="muted small"> ({{ s.quizzesTotal }})</span></td>
              <td>{{ s.ticketsToday }}<span class="muted small"> ({{ s.ticketsTotal }})</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.back { text-decoration: none; color: var(--color-text-muted); font-size: 0.9rem; }
.muted { color: var(--color-text-muted); }
.small { font-size: 0.85rem; }
.head { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
.head h1 { margin: var(--space-2) 0 4px; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-3); margin: var(--space-3) 0; }
.card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 16px; padding: var(--space-3); text-align: center; }
.card strong { display: block; font-size: 1.6rem; color: var(--color-primary); }
.card span { color: var(--color-text-muted); font-size: 0.8rem; }
.card.live { border-color: var(--color-accent); background: linear-gradient(180deg, #ffffff, #eefaf6); }
.card.live strong { color: var(--color-accent); display: inline-flex; align-items: center; gap: 8px; }
.card.warn { border-color: #e3b341; }
.dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--color-accent); animation: blink 1.2s ease-in-out infinite; }
@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }
.section { margin: var(--space-4) 0 var(--space-2); color: var(--color-primary); }
.table-head { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); flex-wrap: wrap; margin: var(--space-4) 0 var(--space-2); }
.table-head h2 { margin: 0; }
.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { border: 1px solid var(--color-border); background: var(--color-surface); border-radius: 999px; padding: 7px 14px; cursor: pointer; font-size: 0.85rem; color: var(--color-text-muted); }
.chip.active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); }
th, td { text-align: left; padding: 10px; border-bottom: 1px solid var(--color-border); white-space: nowrap; }
th { background: var(--color-primary-soft); }
.state.on { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; color: var(--color-accent); }
.pulse { width: 8px; height: 8px; border-radius: 50%; background: var(--color-accent); animation: blink 1.2s ease-in-out infinite; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
