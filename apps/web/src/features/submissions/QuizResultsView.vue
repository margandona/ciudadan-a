<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { Quiz, QuizAttempt } from "@pclab/shared";
import { QUIZ_ATTEMPT_STATUS_LABELS } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { listQuizResults, quizRepo } from "@/infrastructure/appDeps";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const props = defineProps<{ classId: string }>();

const session = useSessionStore();
const quizzes = ref<Quiz[]>([]);
const selectedQuiz = ref("");
const attempts = ref<QuizAttempt[]>([]);
const loading = ref(true);
const error = ref("");

function actor() {
  return { uid: session.user?.uid ?? "", role: session.role, courses: session.courses };
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    quizzes.value = (await quizRepo.listByClass(props.classId)).sort((a, b) => a.order - b.order);
    if (quizzes.value[0]) selectedQuiz.value = quizzes.value[0].id;
    await loadResults();
  } catch (e) {
    error.value = (e as Error).message ?? "No disponible.";
  } finally {
    loading.value = false;
  }
}

async function loadResults(): Promise<void> {
  if (!selectedQuiz.value) return;
  try {
    attempts.value = await listQuizResults.run(selectedQuiz.value, actor());
  } catch (e) {
    error.value = (e as Error).message;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <RouterLink to="/teacher/classes" class="back">← Clases</RouterLink>
    <h1>Resultados de quizzes — {{ props.classId }}</h1>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error && quizzes.length === 0" :message="error" @retry="load" />

    <template v-else-if="quizzes.length">
      <label for="quiz">Quiz</label>
      <select id="quiz" v-model="selectedQuiz" class="select" @change="loadResults">
        <option v-for="q in quizzes" :key="q.id" :value="q.id">{{ q.title }}</option>
      </select>

      <p v-if="attempts.length === 0" class="muted">Aún no hay intentos.</p>

      <div v-else class="table-wrap">
        <table class="table">
          <caption class="sr-only">Intentos del quiz</caption>
          <thead>
            <tr>
              <th scope="col">Estudiante</th>
              <th scope="col">Puntaje</th>
              <th scope="col">Máximo</th>
              <th scope="col">Intentos</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in attempts" :key="a.studentId">
              <td>{{ a.studentId }}</td>
              <td>{{ a.score }}</td>
              <td>{{ a.maxScore }}</td>
              <td>{{ a.status === "SUBMITTED" ? 1 : 0 }}</td>
              <td>{{ QUIZ_ATTEMPT_STATUS_LABELS[a.status] }}</td>
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
</style>
