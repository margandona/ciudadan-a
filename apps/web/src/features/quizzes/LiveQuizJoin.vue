<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSessionStore } from "@/stores/session";
import { getLiveQuestion, getLiveSessionByCode, joinLiveQuiz, submitLiveAnswer } from "@/services/importApi";
import { celebrate } from "@/composables/useConfetti";
import { useSounds } from "@/composables/useSounds";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const props = defineProps<{ code: string }>();

const session = useSessionStore();
const status = ref("connecting");
const title = ref("");
const question = ref<{ prompt: string; options: string[]; type: string } | null>(null);
const sessionStatus = ref("waiting");
const currentIndex = ref(-1);
const myPick = ref<number | null>(null);
const sent = ref(false);
const outcome = ref<{ correct: boolean; points: number; score: number } | null>(null);
const myScore = ref(0);
const error = ref("");
let unsub: (() => void) | null = null;

const playerName = computed(() => session.user?.displayName ?? "Estudiante");
const revealed = computed(() => sessionStatus.value === "reveal");
const isCorrect = computed(() => outcome.value?.correct === true);
const canAnswer = computed(() => sessionStatus.value === "playing" && !!question.value && !sent.value);

async function load(): Promise<void> {
  try {
    const sessionInfo = await getLiveSessionByCode(props.code);
    title.value = sessionInfo.title;
    await joinLiveQuiz(props.code);
    status.value = "joined";

    unsub = onSnapshot(doc(db, "liveQuizzes", sessionInfo.sessionId), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as { status: string; currentIndex: number };
      sessionStatus.value = data.status;
      currentIndex.value = data.currentIndex ?? -1;
    });
  } catch (e) {
    error.value = (e as Error).message ?? "No se pudo unir.";
    status.value = "error";
  }
}

async function loadQuestion(index: number): Promise<void> {
  question.value = null;
  myPick.value = null;
  sent.value = false;
  outcome.value = null;
  try {
    const q = await getLiveQuestion(props.code, index);
    question.value = q;
  } catch (e) {
    error.value = (e as Error).message ?? "No se pudo cargar la pregunta.";
  }
}

async function answer(optionIndex: number): Promise<void> {
  if (!canAnswer.value) return;
  myPick.value = optionIndex;
  sent.value = true;
  try {
    const res = await submitLiveAnswer(props.code, currentIndex.value, optionIndex);
    outcome.value = res;
    myScore.value = res.score;
  } catch (e) {
    error.value = (e as Error).message ?? "No se pudo enviar.";
    sent.value = false;
    myPick.value = null;
  }
}

function optionLetter(i: number): string {
  return String.fromCharCode(65 + i);
}

const COLOR_CLASSES = ["c-a", "c-b", "c-c", "c-d"];

watch(currentIndex, (idx) => {
  if (idx >= 0) loadQuestion(idx);
});

watch(revealed, (isRevealed) => {
  if (isRevealed && outcome.value) {
    if (outcome.value.correct) {
      celebrate({ count: 80 });
      useSounds.correct();
    } else {
      useSounds.wrong();
    }
  }
});

onMounted(load);
onBeforeUnmount(() => unsub?.());
</script>

<template>
  <div class="join">
    <AppErrorState v-if="error && status === 'error'" :message="error" @retry="load" />

    <template v-else-if="status !== 'error'">
      <div class="head">
        <h1>{{ title || "Quiz en vivo" }}</h1>
        <p class="muted">Código: <strong>{{ props.code }}</strong> · {{ playerName }}</p>
        <p class="muted">Mi puntaje: <strong class="points">{{ myScore }}</strong></p>
      </div>

      <!-- Esperando el inicio -->
      <div v-if="sessionStatus === 'waiting'" class="center waiting">
        <div class="pulse" aria-hidden="true"></div>
        <h2>Esperando a que comience</h2>
        <p class="muted">¡Prepárate! Tu profesora iniciará la primera pregunta.</p>
      </div>

      <!-- Pregunta en curso -->
      <Transition name="qslide" mode="out-in">
        <div v-if="sessionStatus === 'playing' && question" :key="`q${currentIndex}-playing`" class="question-card">
          <div class="q-top">
            <span class="tag">Pregunta {{ currentIndex + 1 }}</span>
            <span class="state-chip" :class="{ sent }">{{ sent ? "Respuesta enviada" : "Responde" }}</span>
          </div>
          <h2>{{ question.prompt }}</h2>
          <div class="options">
            <button
              v-for="(opt, i) in question.options"
              :key="i"
              class="option"
              :class="[COLOR_CLASSES[i % COLOR_CLASSES.length], { chosen: myPick === i, disabled: sent }]"
              :disabled="sent"
              @click="answer(i)"
            >
              <span class="shape" aria-hidden="true">{{ optionLetter(i) }}</span>
              <span class="opt-text">{{ opt }}</span>
            </button>
          </div>
          <p v-if="sent" class="sent-note" role="status">
            ✓ Respuesta guardada. La profesora revelará quién acertó.
          </p>
        </div>
      </Transition>

      <!-- Revelación de resultados -->
      <Transition name="qslide" mode="out-in">
        <div v-if="sessionStatus === 'reveal' && question" :key="`q${currentIndex}-reveal`" class="question-card">
          <div class="q-top">
            <span class="tag">Pregunta {{ currentIndex + 1 }}</span>
            <span class="state-chip reveal">Resultados</span>
          </div>
          <h2>{{ question.prompt }}</h2>
          <div class="options">
            <button
              v-for="(opt, i) in question.options"
              :key="i"
              class="option"
              :class="[
                COLOR_CLASSES[i % COLOR_CLASSES.length],
                { 'my-correct': isCorrect && myPick === i },
                { 'my-wrong': !isCorrect && myPick === i },
                { 'dim': myPick !== i },
              ]"
              disabled
            >
              <span class="shape" aria-hidden="true">{{ optionLetter(i) }}</span>
              <span class="opt-text">{{ opt }}</span>
            </button>
          </div>
          <p class="result" :class="{ good: isCorrect, bad: !isCorrect }" role="status">
            <template v-if="outcome">{{ isCorrect ? `¡Correcto! +${outcome.points} pts` : "Respuesta incorrecta · +0 pts" }}</template>
          </p>
          <p class="muted">Espera la próxima pregunta…</p>
        </div>
      </Transition>

      <!-- Quiz terminado -->
      <div v-if="sessionStatus === 'ended'" class="center waiting">
        <h2>¡Quiz terminado!</h2>
        <p class="muted">Tu puntaje final: <strong>{{ myScore }}</strong> pts.</p>
        <RouterLink to="/student" class="btn-primary-big">Volver a mis misiones</RouterLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
.join { max-width: 620px; margin: 0 auto; }
.muted { color: var(--color-text-muted); }
.points { color: var(--color-accent); font-size: 1.2rem; }
.head { text-align: center; margin-bottom: var(--space-4); }
.center {
  text-align: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: var(--space-6);
  box-shadow: var(--shadow);
}

/* Esperando */
.waiting { display: flex; flex-direction: column; align-items: center; gap: var(--space-2); }
.pulse {
  width: 46px; height: 46px; border-radius: 50%;
  background: radial-gradient(circle, var(--color-accent) 35%, transparent 70%);
  animation: pulse 1.3s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.35); opacity: 1; }
}

/* Tarjeta de pregunta */
.question-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 20px; padding: var(--space-5); box-shadow: var(--shadow); }
.q-top { display: flex; justify-content: space-between; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
.tag {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff; font-size: 0.72rem; font-weight: 800; text-transform: uppercase;
  padding: 4px 12px; border-radius: 999px;
}
.state-chip { font-size: 0.75rem; font-weight: 800; color: var(--color-text-muted); border: 1px solid var(--color-border); padding: 3px 10px; border-radius: 999px; }
.state-chip.sent { background: #e2f4ee; color: var(--color-accent); border-color: var(--color-accent); }
.state-chip.reveal { background: var(--color-primary-soft); color: var(--color-primary); }
.question-card h2 { margin: var(--space-3) 0; line-height: 1.35; }

/* Opciones estilo Kahoot */
.options { display: grid; grid-template-columns: 1fr; gap: 12px; }
.option {
  display: flex; align-items: center; gap: 12px;
  border: 2px solid transparent; border-radius: 14px;
  padding: 14px; cursor: pointer; text-align: left;
  color: #fff; font-weight: 700; font-size: 1rem;
  transition: transform 0.15s ease, filter 0.15s ease, opacity 0.2s ease;
}
.option.c-a { background: #e21b3c; }
.option.c-b { background: #1368ce; }
.option.c-c { background: #d89e00; }
.option.c-d { background: #26890c; }
.option.c-a .shape { background: #b70f2c; }
.option.c-b .shape { background: #0c4ea0; }
.option.c-c .shape { background: #b07c00; }
.option.c-d .shape { background: #1c6508; }
.option:hover:not(.disabled) { transform: translateY(-3px) scale(1.01); }
.option.chosen { outline: 3px solid #fff; outline-offset: 2px; transform: scale(1.02); }
.option.disabled { cursor: default; }
.option.dim { filter: brightness(0.55); }
.option.my-correct { outline: 4px solid #6ceb4a; outline-offset: 3px; filter: none; animation: pop 0.4s ease; }
.option.my-wrong { outline: 4px solid #ffffff; outline-offset: 3px; filter: none; animation: shake 0.35s ease; }
@keyframes pop { 0% { transform: scale(1); } 50% { transform: scale(1.12); } 100% { transform: scale(1); } }
@keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
.shape {
  flex: 0 0 auto; width: 32px; height: 32px; border-radius: 50%;
  display: grid; place-items: center; color: #fff; font-weight: 900;
}
.opt-text { line-height: 1.35; }

.sent-note { text-align: center; font-weight: 700; color: var(--color-accent); }
.result { text-align: center; font-size: 1.15rem; font-weight: 800; }
.result.good { color: #1c6508; }
.result.bad { color: #b70f2c; }

.btn-primary-big {
  display: inline-block; margin-top: var(--space-3);
  background: linear-gradient(135deg, var(--color-primary), #0e7c66);
  color: #fff; text-decoration: none; border-radius: 999px;
  padding: 12px 24px; font-weight: 700;
}

/* Animación de transición */
.qslide-enter-active, .qslide-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.qslide-enter-from { opacity: 0; transform: translateX(24px); }
.qslide-leave-to { opacity: 0; transform: translateX(-24px); }

@media (max-width: 480px) {
  .options { gap: 8px; }
  .option { padding: 11px; }
}
</style>
