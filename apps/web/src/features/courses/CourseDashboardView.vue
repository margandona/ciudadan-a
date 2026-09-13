<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import QRCode from "qrcode";
import type { Course, CourseDashboard, Student } from "@pclab/shared";
import { courseRepo, listStudents, currentActor } from "@/infrastructure/appDeps";
import { getCourseDashboard, getCourseReport } from "@/services/importApi";
import BaseCard from "@/components/ui/BaseCard.vue";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";
import AppEmptyState from "@/components/ui/AppEmptyState.vue";
import AppIcon from "@/components/ui/AppIcon.vue";

const props = defineProps<{ courseId: string }>();

const course = ref<Course | null>(null);
const students = ref<Student[]>([]);
const stats = ref<CourseDashboard | null>(null);
const loading = ref(true);
const error = ref("");
const exporting = ref(false);
const appQr = ref("");

function csvCell(value: string | number | boolean | null | undefined): string {
  const s = String(value ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

async function exportCsv(): Promise<void> {
  exporting.value = true;
  error.value = "";
  try {
    const report = await getCourseReport(props.courseId);
    const rows: string[][] = [
      ["Reporte del curso", course.value?.name ?? props.courseId, report.generatedAt],
      [],
      ["Estudiante", "Activa", "Misiones completadas", "Quizzes", "% promedio quiz", "Participación", "Evidencias", "Tickets"],
    ];
    for (const s of report.students) {
      rows.push([s.displayName, s.active ? "Sí" : "No", String(s.missionsDone), String(s.quizzes), String(s.quizPct), String(s.participation), String(s.evidence), String(s.tickets)]);
    }
    const csv = "\uFEFF" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-${props.courseId}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    error.value = (e as Error).message ?? "No se pudo exportar.";
  } finally {
    exporting.value = false;
  }
}

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

onMounted(() => {
  load();
  QRCode.toDataURL("https://ciudadania-lab.web.app", { width: 140, margin: 1 })
    .then((url) => {
      appQr.value = url;
    })
    .catch(() => undefined);
});
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

     <section v-if="stats?.pendingEvidences" class="pending-banner" role="status">
       <div>
         <p class="next-label">Atención docente</p>
         <h2>{{ stats.pendingEvidences }} entrega(s) esperan revisión</h2>
         <p class="muted">Abre el centro de misiones para comenzar a corregirlas y enviar retroalimentación.</p>
       </div>
       <RouterLink :to="`/teacher/courses/${courseId}/classes`" class="btn btn-primary"><AppIcon name="arrow" /> Revisar entregas</RouterLink>
     </section>

     <div class="toolbar">
       <RouterLink :to="`/teacher/courses/${courseId}/classes`" class="btn btn-primary"><AppIcon name="folder" /> Centro de misiones</RouterLink>
       <RouterLink :to="`/teacher/courses/${courseId}/live`" class="btn btn-primary"><AppIcon name="eye" /> Seguimiento en vivo</RouterLink>
       <RouterLink :to="`/teacher/courses/${courseId}/analytics`" class="btn btn-ghost"><AppIcon name="chart" /> Analítica</RouterLink>
       <RouterLink to="/teacher/classes" class="btn btn-ghost"><AppIcon name="calendar" /> Programar clases</RouterLink>
       <RouterLink to="/teacher/calendar" class="btn btn-ghost"><AppIcon name="gauge" /> Calendario</RouterLink>
       <RouterLink :to="`/teacher/students/import`" class="btn btn-ghost"><AppIcon name="users" /> Importar nómina</RouterLink>
       <button class="btn btn-primary" :disabled="exporting" @click="exportCsv">
         {{ exporting ? "Exportando…" : "Exportar CSV" }}
       </button>
     </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div v-if="appQr" class="access-qr">
      <img :src="appQr" alt="Código QR para que las estudiantes entren a la app desde su celular" />
      <div>
        <strong>Acceso estudiantes</strong>
        <p class="muted small">Escanea para abrir la plataforma en el celular e iniciar sesión.</p>
      </div>
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
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.error {
  color: var(--color-danger);
}
.access-qr {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--space-3);
  background: var(--color-surface);
  margin: var(--space-3) 0;
}
.access-qr img {
  width: 72px;
  height: 72px;
}
.pending-banner { display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); flex-wrap: wrap; margin: var(--space-4) 0; padding: var(--space-4); border: 1px solid #e3b341; border-left: 6px solid #d8a41f; border-radius: 16px; background: #fff9e8; }
.pending-banner .next-label { margin: 0 0 4px; color: #8a6500; font-size: .75rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.pending-banner h2 { margin: 0 0 5px; }
.table-wrap {
  overflow-x: auto;
  position: relative;
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
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
