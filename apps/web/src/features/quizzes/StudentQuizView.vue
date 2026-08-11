<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { QuizAnswerGiven, QuizAttempt, StudentQuestion, StudentQuiz } from "@pclab/shared";
import { getQuizForStudent, submitQuizAttempt } from "@/services/importApi";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const props = defineProps<{ quizId: string }>();

const quiz = ref<StudentQuiz | null>(null);
const loading = ref(true);
const error = ref("");
const answers = ref<Record<string, QuizAnswerGiven["given"]>>({});
const orderPick = ref<Record<string, string[]>>({});
const matchPick = ref<Record<string, string>>({});
const attempt = ref<QuizAttempt | null>(null);
const submitting = ref(false);

const answeredCount = computed(() => Object.keys(answers.value).length);
const canSubmit = computed(() => quiz.value !== null && answeredCount.value > 0 && !submitting.value);

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    quiz.value = await getQuizForStudent(props.quizId);
  } catch (e) {
    error.value = (e as Error).message ?? "No disponible.";
  } finally {
    loading.value = false;
  }
}

function setAnswer(qid: string, value: QuizAnswerGiven["given"]): void {
  answers.value[qid] = value;
}

function toggleOrder(q: StudentQuestion, optionId: string): void {
  const current = orderPick.value[q.id] ?? [];
  const next = current.includes(optionId) ? current.filter((v) => v !== optionId) : [...current, optionId];
  orderPick.value[q.id] = next;
  setAnswer(q.id, next);
}

function syncMatch(q: StudentQuestion, leftId: string, rightId: string): void {
  matchPick.value[leftId] = rightId;
  setAnswer(q.id, { ...matchPick.value });
}

function resultFor(qid: string): { correct: boolean; points: number } | null {
  const r = attempt.value?.answers.find((a) => a.qid === qid);
  return r ? { correct: r.correct, points: r.points } : null;
}

function visibleOptions(q: StudentQuestion): string[] {
  return q.options ?? [];
}

async function submit(): Promise<void> {
  if (!quiz.value || submitting.value) return;
  submitting.value = true;
  error.value = "";
  try {
    const payload: QuizAnswerGiven[] = quiz.value.questions
      .filter((q) => answers.value[q.id] !== undefined)
      .map((q) => ({ qid: q.id, given: answers.value[q.id]! }));
    attempt.value = await submitQuizAttempt(props.quizId, payload);
  } catch (e) {
    error.value = (e as Error).message ?? "No se pudo enviar.";
  } finally {
    submitting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <RouterLink to="/student" class="back">← Mis misiones</RouterLink>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error && !quiz" :message="error" @retry="load" />

    <template v-else-if="quiz">
      <h1>{{ quiz.quiz.title }}</h1>
      <p class="muted">
        {{ quiz.questions.length }} preguntas
        <template v-if="quiz.quiz.config.attempts > 0"> · {{ quiz.quiz.config.attempts }} intento(s)</template>
      </p>

      <div v-if="attempt" class="result" role="status">
        <h2>Resultado: {{ attempt.score }}/{{ attempt.maxScore }}</h2>
        <p class="muted">Preguntas correctas: {{ attempt.answers.filter((a) => a.correct).length }}/{{ attempt.answers.length }}</p>
      </div>

      <div v-for="(q, idx) in quiz.questions" :key="q.id" class="question">
        <h3>{{ idx + 1 }}. {{ q.prompt }}</h3>
        <p v-if="q.imageUrl || q.mapId" class="muted">Recurso visual pendiente de verificación.</p>

        <!-- choice/truefalse/identify/image/map -->
        <div v-if="['choice', 'truefalse', 'identify', 'image', 'map'].includes(q.type)" class="options">
          <button
            v-for="(opt, i) in visibleOptions(q)"
            :key="i"
            class="option"
            :class="{
              selected: answers[q.id] === i,
              correct: resultFor(q.id)?.correct === true && answers[q.id] === i,
              wrong: resultFor(q.id)?.correct === false && answers[q.id] === i,
            }"
            :disabled="attempt !== null"
            @click="setAnswer(q.id, i)"
          >
            {{ opt }}
          </button>
        </div>

        <!-- fill -->
        <input
          v-else-if="q.type === 'fill'"
          type="text"
          class="text-input"
          :value="(answers[q.id] as string) ?? ''"
          :disabled="attempt !== null"
          :aria-label="`Respuesta a: ${q.prompt}`"
          @input="setAnswer(q.id, ($event.target as HTMLInputElement).value)"
        />

        <!-- short -->
        <textarea
          v-else-if="q.type === 'short'"
          rows="3"
          class="text-input"
          :value="(answers[q.id] as string) ?? ''"
          :disabled="attempt !== null"
          :aria-label="`Respuesta breve a: ${q.prompt}`"
          @input="setAnswer(q.id, ($event.target as HTMLTextAreaElement).value)"
        ></textarea>

        <!-- order -->
        <div v-else-if="q.type === 'order'" class="options">
          <button
            v-for="(opt, i) in visibleOptions(q)"
            :key="i"
            class="option"
            :class="{ selected: (orderPick[q.id] ?? []).includes(opt) }"
            :disabled="attempt !== null"
            @click="toggleOrder(q, opt)"
          >
            {{ (orderPick[q.id] ?? []).indexOf(opt) + 1 || "" }} · {{ opt }}
          </button>
        </div>

        <!-- match -->
        <div v-else-if="q.type === 'match'" class="match">
          <div v-for="(opt, i) in visibleOptions(q)" :key="i" class="match-row">
            <span>{{ opt }}</span>
            <select
              :value="matchPick[opt] ?? ''"
              :disabled="attempt !== null"
              :aria-label="`Emparejar: ${opt}`"
              @change="syncMatch(q, opt, ($event.target as HTMLSelectElement).value)"
            >
              <option value="" disabled>Selecciona…</option>
              <option v-for="(right, j) in quiz.questions.find((x) => x.id === q.id)?.options ?? []" :key="j" :value="right">{{ right }}</option>
            </select>
          </div>
        </div>

        <p v-if="resultFor(q.id)?.correct === false" class="feedback wrong">
          Incorrecta<template v-if="q.explanation && quiz.quiz.config.showExplanation"> — {{ q.explanation }}</template>
        </p>
        <p v-else-if="resultFor(q.id)?.correct === true" class="feedback ok">¡Correcta!</p>
      </div>

      <div class="toolbar">
        <button class="btn btn-primary" :disabled="!canSubmit" @click="submit">
          {{ submitting ? "Enviando…" : `Enviar respuestas (${answeredCount}/${quiz.questions.length})` }}
        </button>
        <BaseBadge v-if="attempt" tone="success">Intentos usados: {{ attempt.status === 'SUBMITTED' ? 1 : 0 }}/{{ quiz.quiz.config.attempts }}</BaseBadge>
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
.question {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--space-4);
  margin: var(--space-3) 0;
}
.options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
.option {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-bg);
  cursor: pointer;
}
.option.selected {
  border-color: var(--color-primary);
}
.option.correct {
  border-color: var(--color-accent);
  background: #e2f4ee;
}
.option.wrong {
  border-color: var(--color-danger);
  background: #fdecea;
}
.text-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-family: inherit;
  font-size: 1rem;
  margin-top: var(--space-3);
}
.match {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
.match-row {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}
.match-row select {
  flex: 1;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.feedback {
  font-weight: 600;
  margin-top: var(--space-3);
}
.feedback.ok {
  color: var(--color-accent);
}
.feedback.wrong {
  color: var(--color-danger);
}
.result {
  background: var(--color-primary-soft);
  border-radius: var(--radius);
  padding: var(--space-4);
  margin: var(--space-3) 0;
}
.toolbar {
  margin-top: var(--space-4);
  display: flex;
  gap: var(--space-3);
  align-items: center;
}
</style>
