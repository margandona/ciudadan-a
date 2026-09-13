<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useSessionStore } from "@/stores/session";
import { getFlippedOverview } from "@/services/importApi";
import BaseCard from "@/components/ui/BaseCard.vue";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const props = defineProps<{ classId: string }>();

const session = useSessionStore();
const courseId = ref(session.courses[0] ?? "");
const overview = ref<{
  total: number;
  completed: number;
  rows: { studentId: string; displayName: string; completed: boolean; progress: { progressPercent: number } | null }[];
} | null>(null);
const loading = ref(true);
const error = ref("");

const pct = computed(() =>
  overview.value && overview.value.total > 0
    ? Math.round((overview.value.completed / overview.value.total) * 100)
    : 0,
);

async function load(): Promise<void> {
  if (!courseId.value) return;
  loading.value = true;
  error.value = "";
  try {
    overview.value = await getFlippedOverview(courseId.value, props.classId);
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
    <RouterLink to="/teacher/classes" class="back">← Clases</RouterLink>
    <h1>Aula invertida — {{ props.classId }}</h1>
    <p class="muted">Quién completó el aula invertida de esta misión.</p>

    <label for="course">Curso</label>
    <select id="course" v-model="courseId" class="select" @change="load" :disabled="loading">
      <option v-for="c in session.courses" :key="c" :value="c">{{ c }}</option>
    </select>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <template v-else-if="overview">
      <div class="stats">
        <BaseCard><strong>{{ overview.completed }}/{{ overview.total }}</strong><span>Completaron el aula invertida</span></BaseCard>
        <BaseCard><strong>{{ pct }}%</strong><span>Avance del curso</span></BaseCard>
      </div>

      <div class="table-wrap">
        <table>
          <caption class="sr-only">Progreso del aula invertida</caption>
          <thead>
            <tr>
              <th scope="col">Estudiante</th>
              <th scope="col">Estado</th>
              <th scope="col">Progreso</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in overview.rows" :key="r.studentId">
              <td>{{ r.displayName }}</td>
              <td>
                <BaseBadge :tone="r.completed ? 'success' : 'neutral'">
                  {{ r.completed ? "Lista" : "Pendiente" }}
                </BaseBadge>
              </td>
              <td>{{ r.progress?.progressPercent ?? 0 }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.back {
  text-decoration: none;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
.select {
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 1rem;
  margin: var(--space-2) 0;
}
.muted {
  color: var(--color-text-muted);
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-3);
  margin: var(--space-4) 0;
}
.stats strong {
  display: block;
  font-size: 1.4rem;
}
.stats span {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}
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
</style>
