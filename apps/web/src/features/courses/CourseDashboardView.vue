<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { Course, CourseDashboard, Student } from "@pclab/shared";
import { courseRepo, listStudents, currentActor } from "@/infrastructure/appDeps";
import { getCourseDashboard } from "@/services/importApi";
import BaseCard from "@/components/ui/BaseCard.vue";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";
import AppEmptyState from "@/components/ui/AppEmptyState.vue";

const props = defineProps<{ courseId: string }>();

const course = ref<Course | null>(null);
const students = ref<Student[]>([]);
const stats = ref<CourseDashboard | null>(null);
const loading = ref(true);
const error = ref("");

const summary = computed(() => {
  const active = students.value.filter((s) => s.active).length;
  return {
    total: students.value.length,
    active,
    retired: students.value.length - active,
    participationTracked: students.value.filter((s) => s.academicProfile.participationTrackingEnabled).length,
  };
});

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    course.value = await courseRepo.findById(props.courseId);
    [students.value, stats.value] = await Promise.all([
      listStudents.run(props.courseId, currentActor()),
      getCourseDashboard(props.courseId),
    ]);
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <RouterLink to="/teacher" class="back">← Cursos</RouterLink>
    <h1>{{ course?.name ?? "Curso" }}</h1>
    <p class="muted">{{ course?.subject }} · {{ course?.year }}</p>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <div v-else class="stats" aria-label="Resumen del curso">
      <BaseCard><strong>{{ summary.total }}</strong><span>Estudiantes</span></BaseCard>
      <BaseCard><strong>{{ summary.active }}</strong><span>Activas</span></BaseCard>
      <BaseCard><strong>{{ summary.retired }}</strong><span>Retiradas</span></BaseCard>
      <BaseCard v-if="stats"><strong>{{ stats.flippedPercent }}%</strong><span>Aula invertida completada</span></BaseCard>
      <BaseCard v-if="stats"><strong>{{ stats.pendingEvidences }}</strong><span>Evidencias pendientes</span></BaseCard>
      <BaseCard v-if="stats"><strong>{{ stats.participation }}</strong><span>Registros de participación</span></BaseCard>
      <BaseCard v-if="stats"><strong>{{ stats.exitTickets }}</strong><span>Tickets de salida</span></BaseCard>
      <BaseCard v-if="stats"><strong>{{ stats.avgDifficulty ?? "—" }}</strong><span>Dificultad percibida (1–5)</span></BaseCard>
    </div>

    <div class="toolbar">
      <RouterLink to="/teacher/classes" class="btn btn-ghost">Programar clases</RouterLink>
      <RouterLink to="/teacher/calendar" class="btn btn-ghost">Calendario administrativo</RouterLink>
      <RouterLink :to="`/teacher/students/import`" class="btn btn-ghost">Importar / actualizar nómina</RouterLink>
    </div>

    <AppEmptyState v-if="!loading && !error && students.length === 0" message="No hay estudiantes en este curso." />

    <div v-else-if="!loading && !error" class="table-wrap">
      <table>
        <caption class="sr-only">Listado de estudiantes de {{ course?.name }}</caption>
        <thead>
          <tr>
            <th scope="col">Nº</th>
            <th scope="col">Nombre</th>
            <th scope="col">Estado</th>
            <th scope="col">Última actividad</th>
            <th scope="col"><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in students" :key="s.id">
            <td>{{ s.listNumber ?? "—" }}</td>
            <td>{{ s.displayName }}</td>
            <td>
              <BaseBadge :tone="s.active ? 'success' : 'neutral'">{{ s.active ? "Activa" : "Retirada" }}</BaseBadge>
            </td>
            <td>{{ s.stats?.lastActivityAt ? new Date(s.stats.lastActivityAt).toLocaleDateString("es-CL") : "—" }}</td>
            <td>
              <RouterLink :to="`/teacher/courses/${courseId}/students/${s.id}`" class="btn btn-ghost btn-sm">Perfil</RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.back {
  text-decoration: none;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
.muted {
  color: var(--color-text-muted);
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-3);
  margin: var(--space-4) 0;
}
.stats strong {
  display: block;
  font-size: 1.5rem;
}
.stats span {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
.toolbar {
  margin: var(--space-3) 0;
}
.table-wrap {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
th,
td {
  text-align: left;
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}
th {
  background: var(--color-primary-soft);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.btn-sm {
  padding: 4px 10px;
  font-size: 0.85rem;
}
</style>
