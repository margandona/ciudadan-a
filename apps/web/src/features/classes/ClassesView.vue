<script setup lang="ts">
import { onMounted, ref } from "vue";
import { CLASS_STATUS, CLASS_STATUS_LABELS } from "@pclab/shared";
import type { TeacherClassRow } from "@pclab/application";
import { useSessionStore } from "@/stores/session";
import { listTeacherClasses } from "@/infrastructure/appDeps";
import { setClassSchedule } from "@/services/importApi";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";
import AppEmptyState from "@/components/ui/AppEmptyState.vue";

const session = useSessionStore();
const courseId = ref(session.courses[0] ?? "");
const rows = ref<TeacherClassRow[]>([]);
const loading = ref(true);
const error = ref("");
const savingId = ref("");
const notice = ref("");

function actor() {
  return { uid: session.user?.uid ?? "", role: session.role, courses: session.courses };
}

async function load(): Promise<void> {
  if (!courseId.value) return;
  loading.value = true;
  error.value = "";
  notice.value = "";
  try {
    rows.value = await listTeacherClasses.run(courseId.value, actor());
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function save(row: TeacherClassRow): Promise<void> {
  savingId.value = row.class.id;
  notice.value = "";
  try {
    const s = row.schedule;
    const updated = await setClassSchedule(courseId.value, row.class.id, {
      status: s.status,
      availability: {
        enabled: s.availability.enabled,
        flippedAvailable: s.availability.flippedAvailable,
        startAt: s.availability.startAt ?? null,
        endAt: s.availability.endAt ?? null,
      },
    });
    row.schedule = updated;
    notice.value = `Guardado: ${row.class.title}`;
  } catch (e) {
    notice.value = (e as Error).message ?? "Error al guardar.";
  } finally {
    savingId.value = "";
  }
}

onMounted(load);
</script>

<template>
  <div>
    <h1>Clases</h1>
    <p class="muted">Programa la disponibilidad de cada misión para tu curso.</p>

    <label for="course">Curso</label>
    <select id="course" v-model="courseId" class="select" @change="load" :disabled="loading">
      <option v-for="c in session.courses" :key="c" :value="c">{{ c }}</option>
    </select>

    <p v-if="notice" class="notice" role="status">{{ notice }}</p>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />
    <AppEmptyState v-else-if="!courseId" message="No tienes cursos asignados." />
    <AppEmptyState v-else-if="rows.length === 0" message="Aún no hay contenido de clases." />

    <div v-else class="table-wrap">
      <table>
        <caption class="sr-only">Programación de las 12 misiones</caption>
        <thead>
          <tr>
            <th scope="col">Nº</th>
            <th scope="col">Misión</th>
            <th scope="col">Estado</th>
            <th scope="col">Aula invertida</th>
            <th scope="col">Disponible desde</th>
            <th scope="col">Hasta</th>
            <th scope="col"><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.class.id">
            <td>{{ row.class.number }}</td>
            <td>
              {{ row.class.title }}
              <BaseBadge v-if="row.class.hasFeedback" tone="warning">feedback</BaseBadge>
            </td>
            <td>
              <select
                class="select select-sm"
                v-model="row.schedule.status"
                :aria-label="`Estado de ${row.class.title}`"
              >
                <option v-for="s in CLASS_STATUS" :key="s" :value="s">{{ CLASS_STATUS_LABELS[s] }}</option>
              </select>
            </td>
            <td>
              <input
                type="checkbox"
                v-model="row.schedule.availability.flippedAvailable"
                :aria-label="`Habilitar aula invertida de ${row.class.title}`"
              />
            </td>
            <td>
              <input
                type="datetime-local"
                class="input-sm"
                :value="toLocalInput(row.schedule.availability.startAt)"
                @change="row.schedule.availability.startAt = fromLocalInput(($event.target as HTMLInputElement).value)"
                :aria-label="`Disponible desde ${row.class.title}`"
              />
            </td>
            <td>
              <input
                type="datetime-local"
                class="input-sm"
                :value="toLocalInput(row.schedule.availability.endAt)"
                @change="row.schedule.availability.endAt = fromLocalInput(($event.target as HTMLInputElement).value)"
                :aria-label="`Disponible hasta ${row.class.title}`"
              />
            </td>
            <td class="actions">
              <button class="btn btn-primary btn-sm" :disabled="savingId === row.class.id" @click="save(row)">
                {{ savingId === row.class.id ? "Guardando…" : "Guardar" }}
              </button>
              <RouterLink
                :to="`/teacher/classes/${row.class.id}/dashboard`"
                class="btn btn-ghost btn-sm"
              >Dashboard</RouterLink>
              <RouterLink
                :to="`/teacher/classes/${row.class.id}/presentation`"
                class="btn btn-ghost btn-sm"
              >Presentación</RouterLink>
              <RouterLink
                :to="`/projection/${row.class.id}`"
                class="btn btn-ghost btn-sm"
              >Proyección</RouterLink>
              <RouterLink
                :to="`/teacher/classes/${row.class.id}/flipped`"
                class="btn btn-ghost btn-sm"
              >Aula invertida</RouterLink>
              <RouterLink
                :to="`/teacher/classes/${row.class.id}/submissions`"
                class="btn btn-ghost btn-sm"
              >Evidencias</RouterLink>
              <RouterLink
                :to="`/teacher/classes/${row.class.id}/quizzes`"
                class="btn btn-ghost btn-sm"
              >Quizzes</RouterLink>
            </td>
          </tr>
        </tbody>
      </table>
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
.select-sm,
.input-sm {
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.85rem;
}
.notice {
  background: var(--color-primary-soft);
  padding: var(--space-3);
  border-radius: var(--radius);
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
  font-size: 0.9rem;
}
th,
td {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}
th {
  background: var(--color-primary-soft);
}
.actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}
.btn-sm {
  padding: 4px 10px;
  font-size: 0.82rem;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
