<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { QuizAnswerGiven, QuizAttempt, StudentQuestion, StudentQuiz } from "@pclab/shared";
import { getQuizForStudent, submitQuizAttempt } from "@/services/importApi";
import { offlineSafe } from "@/services/offlineSafe";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";
import SpeakButton from "@/components/ui/SpeakButton.vue";
import { celebrate } from "@/composables/useConfetti";
import { useSounds } from "@/composables/useSounds";
import { notify } from "@/composables/useNotify";

const props = defineProps<{ quizId: string }>();

const quiz = ref<StudentQuiz | null>(null);
const loading = ref(true);
const error = ref("");
const answers = ref<Record<string, QuizAnswerGiven["given"]>>({});
const locked = ref<Record<string, boolean>>({});
const orderPick = ref<Record<string, string[]>>({});
const matchPick = ref<Record<string, string>>({});
const attempt = ref<QuizAttempt | null>(null);
const offlineQueued = ref(false);
const submitting = ref(false);
const currentIndex = ref(0);
const phase = ref<"playing" | "result">("playing");
const timerLeft = ref(0);
const celebrating = ref(false);
let timerId: ReturnType<typeof setInterval> | null = null;

const current = computed(() => quiz.value?.questions[currentIndex.value] ?? null);
const total = computed(() => quiz.value?.questions.length ?? 0);
const answeredCount = computed(() => Object.keys(answers.value).filter((qid) => quiz.value?.questions.some((q) => q.id === qid)).length);
const progressPct = computed(() => (total.value > 0 ? Math.round((answeredCount.value / total.value) * 100) : 0));
const isLast = computed(() => currentIndex.value >= total.value - 1);
const seconds = computed(() => quiz.value?.quiz.config.timerSeconds ?? null);

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    quiz.value = await getQuizForStudent(props.quizId);
    if (quiz.value.attempt) {
      attempt.value = quiz.value.attempt;
      phase.value = "result";
    }
    startTimer();
  } catch (e) {
    error.value = (e as Error).message ?? "No disponible.";
  } finally {
    loading.value = false;
  }
}

function startTimer(): void {
  stopTimer();
  if (!seconds.value || phase.value !== "playing") return;
  timerLeft.value = seconds.value;
  timerId = setInterval(() => {
    timerLeft.value -= 1;
    if (timerLeft.value <= 0) {
      const q = current.value;
      if (q && !locked.value[q.id]) lockAnswer(q, answers.value[q.id]);
    }
  }, 1000);
}

function stopTimer(): void {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function lockAnswer(q: StudentQuestion, given: QuizAnswerGiven["given"] | undefined): void {
  if (locked.value[q.id]) return;
  locked.value[q.id] = true;
  if (given !== undefined) answers.value[q.id] = given;
  stopTimer();
}

function selectOption(index: number): void {
  const q = current.value;
  if (!q || locked.value[q.id]) return;
  answers.value[q.id] = index;
  lockAnswer(q, index);
}

function confirmFreeText(q: StudentQuestion): void {
  if (!locked.value[q.id]) lockAnswer(q, answers.value[q.id]);
}

function toggleOrder(q: StudentQuestion, optionId: string): void {
  if (locked.value[q.id]) return;
  const next = (orderPick.value[q.id] ?? []).includes(optionId)
    ? (orderPick.value[q.id] ?? []).filter((v) => v !== optionId)
    : [...(orderPick.value[q.id] ?? []), optionId];
  orderPick.value[q.id] = next;
  answers.value[q.id] = next;
}

function syncMatch(q: StudentQuestion, leftId: string, rightId: string): void {
  if (locked.value[q.id]) return;
  matchPick.value[leftId] = rightId;
  answers.value[q.id] = { ...matchPick.value };
}

function goNext(): void {
  if (!current.value || !locked.value[current.value.id]) return;
  if (isLast.value) return;
  currentIndex.value++;
  startTimer();
}

function setAnswer(qid: string, value: QuizAnswerGiven["given"]): void {
  if (locked.value[qid]) return;
  answers.value[qid] = value;
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
    const result = await offlineSafe(
      "submitQuizAttempt",
      { quizId: props.quizId, answers: payload },
      (p) => submitQuizAttempt((p as { quizId: string }).quizId, (p as { answers: QuizAnswerGiven[] }).answers),
    );
    if (result.queued) {
      offlineQueued.value = true;
      return;
    }
    const graded = result.data.attempt;
    const xpAwarded = result.data.xpAwarded;
    attempt.value = graded;
    phase.value = "result";
    celebrating.value = true;
    const max = graded.maxScore;
    const pct = max > 0 ? Math.round((graded.score / max) * 100) : 0;
    if (max > 0 && graded.score / max >= 0.6) {
      notify({
        kind: "xp",
        icon: "✅",
        title: "¡Quiz aprobado!",
        detail: `${graded.score}/${max} · ${pct}%${xpAwarded > 0 ? ` · +${xpAwarded} XP` : " · ya estaba aprobado"}`,
      });
    } else {
      notify({ kind: "info", icon: "📝", title: "Quiz enviado", detail: `${graded.score}/${max} · ${pct}%` });
    }
    celebrate();
    useSounds.win();
    setTimeout(() => {
      celebrating.value = false;
    }, 3000);
  } catch (e) {
    error.value = (e as Error).message ?? "No se pudo enviar.";
  } finally {
    submitting.value = false;
  }
}

function restart(): void {
  answers.value = {};
  locked.value = {};
  orderPick.value = {};
  matchPick.value = {};
  currentIndex.value = 0;
  phase.value = "playing";
  attempt.value = null;
  startTimer();
}

function correctCount(): number {
  return attempt.value?.answers.filter((a) => a.correct).length ?? 0;
}

watch(
  () => current.value?.id,
  () => {
    startTimer();
  },
);

onMounted(load);
onBeforeUnmount(stopTimer);
</script>

<template>
  <div>
    <RouterLink to="/student" class="back">← Mis misiones</RouterLink>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error && !quiz" :message="error" @retry="load" />

    <template v-else-if="quiz">
      <h1>{{ quiz.quiz.title }}</h1>
      <p class="muted">{{ total }} preguntas · {{ seconds ? seconds + " segundos por pregunta" : "a tu ritmo" }}</p>

      <p v-if="offlineQueued" class="notice" role="status">
        Respuestas guardadas en tu dispositivo. Se sincronizarán cuando tengas conexión.
      </p>

      <!-- ===== Pantalla de resultados ===== -->
      <div v-if="phase === 'result' && attempt" class="result" role="status">
        <div v-if="celebrating" class="confetti" aria-hidden="true"></div>
        <h2>Resultado: {{ attempt.score }}/{{ attempt.maxScore }}</h2>
        <p class="muted">Preguntas correctas: {{ correctCount() }}/{{ attempt.answers.length }}</p>

        <div v-for="(q, idx) in quiz.questions" :key="q.id" class="review">
          <p class="review-prompt">
            <span class="badge-mini" :class="resultFor(q.id)?.correct ? 'ok' : 'no'">
              {{ resultFor(q.id)?.correct ? "Bien" : "Sigue practicando" }}
            </span>
            {{ idx + 1 }}. {{ q.prompt }}
          </p>
          <p v-if="resultFor(q.id)?.correct === false && q.explanation && quiz.quiz.config.showExplanation" class="muted small">
            {{ q.explanation }}
          </p>
        </div>

        <button v-if="quiz.quiz.config.attempts > 1" class="btn btn-ghost" @click="restart">Intentar de nuevo</button>
        <RouterLink to="/student" class="btn btn-primary">Volver a mis misiones</RouterLink>
      </div>

      <!-- ===== Juego: una pregunta a la vez ===== -->
      <template v-else-if="current">
        <div class="hud" aria-hidden="true">
          <div class="bar"><div class="bar-fill" :style="{ width: `${progressPct}%` }"></div></div>
          <div class="hud-meta">
            <span>Pregunta {{ currentIndex + 1 }} de {{ total }}</span>
            <span v-if="seconds">⏱ {{ timerLeft }}s</span>
            <span>{{ answeredCount }}/{{ total }} respondidas</span>
          </div>
        </div>

        <div class="step" v-tilt="{ max: 4, speed: 500, scale: 1 }">
          <div class="step-head">
            <SpeakButton :text="current.prompt" />
          </div>
          <template v-if="['choice', 'truefalse', 'identify', 'image', 'map'].includes(current.type)">
            <p class="prompt">{{ current.prompt }}</p>
            <div class="options">
              <button
                v-for="(opt, i) in visibleOptions(current)"
                :key="i"
                class="option"
                :class="{ selected: answers[current.id] === i, locked: locked[current.id] }"
                :disabled="locked[current.id]"
                @click="selectOption(i)"
                v-tilt="{ max: 8, speed: 500, scale: 1.01 }"
              >
                {{ opt }}
              </button>
            </div>
          </template>

          <template v-else-if="current.type === 'fill'">
            <p class="prompt">{{ current.prompt }}</p>
            <input
              type="text"
              class="text-input"
              :value="(answers[current.id] as string) ?? ''"
              :disabled="locked[current.id]"
              :aria-label="`Respuesta a: ${current.prompt}`"
              @input="setAnswer(current.id, ($event.target as HTMLInputElement).value)"
            />
          </template>

          <template v-else-if="current.type === 'short'">
            <p class="prompt">{{ current.prompt }}</p>
            <textarea
              rows="3"
              class="text-input"
              :value="(answers[current.id] as string) ?? ''"
              :disabled="locked[current.id]"
              :aria-label="`Respuesta breve a: ${current.prompt}`"
              @input="setAnswer(current.id, ($event.target as HTMLTextAreaElement).value)"
            ></textarea>
          </template>

          <template v-else-if="current.type === 'order'">
            <p class="prompt">{{ current.prompt }}</p>
            <div class="options">
              <button
                v-for="(opt, i) in visibleOptions(current)"
                :key="i"
                class="option"
                :class="{ selected: (orderPick[current.id] ?? []).includes(opt), locked: locked[current.id] }"
                :disabled="locked[current.id]"
                @click="toggleOrder(current, opt)"
              >
                {{ (orderPick[current.id] ?? []).indexOf(opt) + 1 || "·" }} {{ opt }}
              </button>
            </div>
          </template>

          <template v-else-if="current.type === 'match'">
            <p class="prompt">{{ current.prompt }}</p>
            <div class="match">
              <div v-for="(opt, i) in visibleOptions(current)" :key="i" class="match-row">
                <span>{{ opt }}</span>
                <select
                  :value="matchPick[opt] ?? ''"
                  :disabled="locked[current.id]"
                  :aria-label="`Emparejar: ${opt}`"
                  @change="syncMatch(current, opt, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="" disabled>Selecciona…</option>
                  <option v-for="(right, j) in visibleOptions(current)" :key="j" :value="right">{{ right }}</option>
                </select>
              </div>
            </div>
          </template>

          <p v-if="locked[current.id]" class="feedback" role="status">
            {{ isLast ? "¡Lista para ver tu resultado!" : "Respuesta registrada." }}
          </p>

          <div class="actions">
            <button
              v-if="!locked[current.id]"
              class="btn btn-primary"
              :disabled="answers[current.id] === undefined"
              @click="confirmFreeText(current)"
            >
              {{ isLast ? "Ver resultado" : "Confirmar respuesta" }}
            </button>
            <button v-else-if="!isLast" class="btn btn-primary" @click="goNext">Siguiente →</button>
            <button v-else class="btn btn-primary" :disabled="submitting" @click="submit">
              {{ submitting ? "Enviando…" : "Ver resultado" }}
            </button>
          </div>
        </div>
      </template>

      <p v-if="error" class="error" role="alert">{{ error }}</p>
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
.small {
  font-size: 0.85rem;
}
.notice {
  background: var(--color-primary-soft);
  padding: var(--space-3);
  border-radius: var(--radius);
}
.hud {
  margin: var(--space-3) 0;
}
.bar {
  background: var(--color-border);
  border-radius: 999px;
  height: 10px;
  overflow: hidden;
}
.bar-fill {
  background: var(--color-accent);
  height: 100%;
  border-radius: 999px;
  transition: width 0.35s ease;
}
.hud-meta {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-2);
  font-size: 0.85rem;
  color: var(--color-text-muted);
  flex-wrap: wrap;
}
.step {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: var(--space-5);
}
.step-head {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-3);
}
.prompt {
  font-weight: 600;
  font-size: 1.05rem;
}
.options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: var(--space-3) 0;
}
.option {
  text-align: left;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-bg);
  cursor: pointer;
  font-size: 1rem;
}
.option:hover:not(:disabled) {
  border-color: var(--color-primary);
}
.option.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}
.option.locked {
  cursor: default;
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
  color: var(--color-accent);
  font-weight: 600;
  margin-top: var(--space-3);
}
.actions {
  margin-top: var(--space-4);
  display: flex;
  gap: var(--space-3);
  align-items: center;
}
.result {
  background: var(--color-surface);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius);
  padding: var(--space-5);
  margin: var(--space-3) 0;
  position: relative;
  overflow: hidden;
}
.result h2 {
  color: var(--color-accent);
}
.review {
  border-top: 1px dashed var(--color-border);
  padding: var(--space-2) 0;
}
.review-prompt {
  margin: 0;
}
.badge-mini {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  margin-right: var(--space-2);
}
.badge-mini.ok {
  background: #e2f4ee;
  color: var(--color-accent);
}
.badge-mini.no {
  background: #fdecea;
  color: var(--color-danger);
}
.confetti {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 20% 30%, #f6c945 8px, transparent 9px),
    radial-gradient(circle at 80% 20%, #4caf7d 10px, transparent 11px),
    radial-gradient(circle at 60% 70%, #5b9bd5 8px, transparent 9px),
    radial-gradient(circle at 30% 80%, #e5679b 9px, transparent 10px);
  background-size: 140px 140px;
  animation: fall 2.4s linear forwards;
}
@keyframes fall {
  0% { transform: translateY(-120px); opacity: 1; }
  100% { transform: translateY(0); opacity: 0; }
}
.error {
  color: var(--color-danger);
}

/* ===== Mobile-first (pantallas muy pequeñas) ===== */
@media (max-width: 480px) {
  .step {
    padding: var(--space-4);
  }
  .options {
    grid-template-columns: 1fr;
  }
  .option {
    padding: var(--space-2);
  }
}
</style>
