<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { ConceptQuizPublic, ConceptQuizResult } from "@pclab/shared";
import { getConceptQuiz, submitConceptQuiz } from "@/services/importApi";
import { useSessionStore } from "@/stores/session";
import { celebrate } from "@/composables/useConfetti";
import { useSounds } from "@/composables/useSounds";
import { notify, notifyLevelUp } from "@/composables/useNotify";
import { levelFromXp } from "@pclab/domain";
import AppIcon from "@/components/ui/AppIcon.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const route = useRoute();
const router = useRouter();
const session = useSessionStore();

const level = computed(() => Number(route.params.level ?? 1));
const courseId = computed(() => session.courseId ?? "");

const quiz = ref<ConceptQuizPublic | null>(null);
const result = ref<ConceptQuizResult | null>(null);
const answers = ref<Record<string, number>>({});
const loading = ref(true);
const busy = ref(false);
const error = ref("");

onMounted(async () => {
  try {
    quiz.value = await getConceptQuiz(level.value);
  } catch (e) {
    error.value = e instanceof Error ? e.message : "No se pudo cargar el desafío.";
  } finally {
    loading.value = false;
  }
});

const answeredCount = computed(() => Object.keys(answers.value).length);
const canSubmit = computed(() => !!quiz.value && answeredCount.value === quiz.value.questions.length && !busy.value);

function choose(questionId: string, optionIndex: number): void {
  answers.value = { ...answers.value, [questionId]: optionIndex };
  useSounds.click();
}

async function submit(): Promise<void> {
  if (!quiz.value || !canSubmit.value) return;
  busy.value = true;
  error.value = "";
  try {
    const payload = quiz.value.questions.map((q) => ({ id: q.id, given: answers.value[q.id] ?? -1 }));
    const response = await submitConceptQuiz(courseId.value, level.value, payload);
    result.value = response.result;
    if (response.result.passed) {
      if (response.result.xpAwarded > 0) {
        useSounds.win();
        notify({
          kind: "xp",
          icon: "🎓",
          title: `¡Desafío aprobado: ${quiz.value?.title ?? "conceptos"}!`,
          detail: `+${response.result.xpAwarded} XP · ${response.result.percent}% correcto`,
        });
        const prevLevel = levelFromXp(Math.max(0, response.farm.xp - response.result.xpAwarded));
        notifyLevelUp(prevLevel, response.farm.level);
      } else {
        useSounds.correct();
        notify({ kind: "info", icon: "🎓", title: "Ya habías aprobado este desafío", detail: `${response.result.percent}% correcto` });
      }
      celebrate();
    } else {
      useSounds.wrong();
      notify({ kind: "info", icon: "📚", title: "Desafío no superado", detail: `${response.result.percent}% · puedes intentarlo de nuevo` });
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : "No se pudo enviar el desafío.";
  } finally {
    busy.value = false;
  }
}

function retry(): void {
  result.value = null;
  answers.value = {};
}

function goFarm(): void {
  void router.push({ name: "student-farm" });
}

function optionClass(questionId: string, index: number): Record<string, boolean> {
  const chosen = answers.value[questionId];
  const graded = result.value?.results.find((r) => r.id === questionId);
  return {
    chosen: chosen === index,
    correct: !!graded && graded.correct && graded.correctIndex === index,
    wrong: !!graded && !graded.correct && chosen === index,
  };
}
</script>

<template>
  <section class="concept">
    <button class="btn-ghost back" @click="goFarm"><AppIcon name="arrow" /> Volver a la granja</button>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error && !quiz" :message="error" />

    <template v-else-if="quiz">
      <header class="head">
        <p class="eyebrow">Desafío de conceptos · Nivel {{ quiz.level }}</p>
        <h1>{{ quiz.title }}</h1>
        <p class="muted">
          Responde para ganar <strong>+{{ quiz.xpReward }} XP</strong> de granja. Necesitas
          <strong>{{ quiz.passPercent }}%</strong> para aprobar. Solo cuenta la primera vez.
        </p>
      </header>

      <div v-if="result" class="result" :class="{ ok: result.passed }">
        <p class="result-score">{{ result.score }} / {{ result.total }} ({{ result.percent }}%)</p>
        <p v-if="result.passed">
          <strong>¡Aprobado!</strong>
          <template v-if="result.alreadyPassed">Ya habías aprobado este nivel.</template>
          <template v-else>Ganaste +{{ result.xpAwarded }} XP de granja.</template>
        </p>
        <p v-else><strong>Casi.</strong> Repasa y vuelve a intentarlo.</p>
      </div>

      <ol class="questions">
        <li v-for="(question, qi) in quiz.questions" :key="question.id" class="question">
          <p class="prompt"><span class="num">{{ qi + 1 }}</span> {{ question.prompt }}</p>
          <p class="concept-tag">{{ question.concept }}</p>
          <div class="options">
            <button
              v-for="(option, oi) in question.options"
              :key="oi"
              class="option"
              :class="optionClass(question.id, oi)"
              :disabled="!!result"
              @click="choose(question.id, oi)"
            >
              {{ option }}
            </button>
          </div>
          <p v-if="result" class="explain">
            <template v-if="result.results.find((r) => r.id === question.id)?.explanation">
              {{ result.results.find((r) => r.id === question.id)?.explanation }}
            </template>
          </p>
        </li>
      </ol>

      <div class="actions">
        <button v-if="!result" class="btn-primary-big" :disabled="!canSubmit" @click="submit">
          {{ busy ? "Enviando…" : `Enviar respuestas (${answeredCount}/${quiz.questions.length})` }}
        </button>
        <template v-else>
          <button class="btn-primary-big" @click="goFarm">Ir a mi granja</button>
          <button v-if="!result.passed" class="btn-ghost" @click="retry">Intentar de nuevo</button>
        </template>
      </div>
      <p v-if="error && quiz" class="error">{{ error }}</p>
    </template>
  </section>
</template>

<style scoped>
.concept { max-width: 760px; margin: 0 auto; padding: var(--space-5) var(--space-4) 64px; }
.back { margin-bottom: var(--space-4); }
.eyebrow { color: var(--color-accent); font-weight: 800; text-transform: uppercase; letter-spacing: .06em; font-size: .75rem; margin: 0; }
.head h1 { margin: 4px 0 6px; color: var(--color-primary); }
.questions { list-style: none; padding: 0; display: grid; gap: var(--space-4); }
.question { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius); padding: var(--space-4); box-shadow: var(--shadow); }
.prompt { display: flex; gap: 10px; font-weight: 700; color: var(--color-text); margin: 0 0 4px; }
.num { flex: 0 0 26px; height: 26px; border-radius: 50%; background: var(--color-primary); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: .85rem; }
.concept-tag { margin: 0 0 10px 36px; font-size: .75rem; color: var(--color-accent); font-weight: 700; }
.options { display: grid; gap: 8px; }
.option { text-align: left; border: 2px solid var(--color-border); background: var(--color-bg); border-radius: 12px; padding: 10px 12px; cursor: pointer; font: inherit; color: var(--color-text); }
.option.chosen { border-color: var(--color-primary); }
.option.correct { border-color: #2f9e83; background: #eefaf6; }
.option.wrong { border-color: var(--color-danger); background: #fdecea; }
.option:disabled { cursor: default; }
.explain { margin: 10px 0 0; color: var(--color-text-muted); font-size: .9rem; }
.result { border-radius: var(--radius); padding: 14px; margin-bottom: var(--space-4); background: #fdecea; border: 1px solid var(--color-danger); }
.result.ok { background: #eefaf6; border-color: #2f9e83; }
.result-score { font-size: 1.6rem; font-weight: 800; margin: 0 0 4px; color: var(--color-primary); }
.actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: var(--space-4); }
.error { color: var(--color-danger); font-weight: 700; }
</style>
