<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { Submission } from "@pclab/shared";
import { SUBMISSION_STATUS } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { listSubmissions, studentRepo } from "@/infrastructure/appDeps";
import { reviewSubmission } from "@/services/importApi";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const props = defineProps<{ classId: string }>();

const session = useSessionStore();
const courseId = ref(session.courses[0] ?? "");
const submissions = ref<Submission[]>([]);
const loading = ref(true);
const error = ref("");
const selectedId = ref("");
const feedback = ref("");
const score = ref<number | null>(null);
const status = ref<Submission["status"]>(SUBMISSION_STATUS.REVISADO);
const notice = ref("");

const names = ref<Map<string, string>>(new Map());

function actor() {
  return { uid: session.user?.uid ?? "", role: session.role, courses: session.courses };
}

async function load(): Promise<void> {
  if (!courseId.value) return;
  loading.value = true;
  error.value = "";
  notice.value = "";
  try {
    const [subs, students] = await Promise.all([
      listSubmissions.run(courseId.value, props.classId, actor()),
      studentRepo.findByCourse(courseId.value),
    ]);
    submissions.value = subs;
    const nameByStudent = new Map(students.map((s) => [s.id, s.displayName]));
    names.value = new Map(subs.map((s) => [s.studentId, nameByStudent.get(s.studentId) ?? s.studentId]));
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

function select(s: Submission): void {
  selectedId.value = s.id;
  feedback.value = s.teacherFeedback ?? "";
  score.value = s.score ?? null;
  status.value = s.status;
}

async function save(): Promise<void> {
  notice.value = "";
  try {
    const updated = await reviewSubmission({
      submissionId: selectedId.value,
      courseId: courseId.value,
      status: status.value,
      score: score.value,
      teacherFeedback: feedback.value,
    });
    const idx = submissions.value.findIndex((s) => s.id === updated.id);
    if (idx >= 0) submissions.value[idx] = updated;
    notice.value = "Revisión guardada.";
  } catch (e) {
    notice.value = (e as Error).message ?? "Error al guardar.";
  }
}

const selected = computed(() => submissions.value.find((s) => s.id === selectedId.value));

onMounted(load);
</script>

<template>
  <div>
    <RouterLink to="/teacher/classes" class="back">← Clases</RouterLink>
    <h1>Evidencias — {{ props.classId }}</h1>
    <p class="muted">Revisa, retroalimenta y evalúa las entregas.</p>

    <p v-if="notice" class="notice" role="status">{{ notice }}</p>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <div v-else-if="submissions.length === 0" class="muted">Aún no hay evidencias entregadas.</div>

    <div v-else class="layout">
      <div class="table-wrap">
        <table class="table">
          <caption class="sr-only">Evidencias entregadas</caption>
          <thead>
            <tr>
              <th scope="col">Estudiante</th>
              <th scope="col">Estado</th>
              <th scope="col">Nota</th>
              <th scope="col"><span class="sr-only">Abrir</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in submissions" :key="s.id" :class="{ active: selectedId === s.id }">
              <td>{{ names.get(s.studentId) ?? s.studentId }}</td>
              <td><BaseBadge :tone="s.status === SUBMISSION_STATUS.ENTREGADO ? 'warning' : 'neutral'">{{ s.status }}</BaseBadge></td>
              <td>{{ s.score ?? "—" }}</td>
              <td><button class="btn btn-ghost btn-sm" @click="select(s)">Revisar</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <section v-if="selected" class="panel" aria-label="Revisión de evidencia">
        <h2>Revisión</h2>
        <p class="muted small">Contenido: {{ selected.content?.text?.slice(0, 200) || "—" }}</p>
        <label for="feedback">Retroalimentación</label>
        <textarea id="feedback" v-model="feedback" rows="4" class="text-input"></textarea>
        <label for="score">Nota (opcional)</label>
        <input id="score" v-model.number="score" type="number" min="0" class="text-input" />
        <label for="status">Estado</label>
        <select id="status" v-model="status" class="select">
          <option v-for="s in SUBMISSION_STATUS" :key="s" :value="s">{{ s }}</option>
        </select>
        <button class="btn btn-primary" @click="save">Guardar revisión</button>
      </section>
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
    grid-template-columns: 1fr 1fr;
  }
}
.table-wrap {
  overflow-x: auto;
  position: relative;
}
.table {
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
tr.active {
  background: var(--color-primary-soft);
}
.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.text-input,
.select {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-family: inherit;
  font-size: 0.95rem;
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
