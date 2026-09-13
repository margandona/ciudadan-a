<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import QRCode from "qrcode";
import { doc, onSnapshot, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { advanceLiveQuiz, getQuizForTeacher, startLiveQuiz, type LiveQuestion } from "@/services/importApi";
import { celebrate } from "@/composables/useConfetti";
import { useSounds } from "@/composables/useSounds";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";
import AppIcon from "@/components/ui/AppIcon.vue";

const props = defineProps<{ classId: string; quizId: string }>();

interface LiveSession {
  status: string;
  currentIndex: number;
  questionCount: number;
  code: string;
  title: string;
  quizId: string;
}
interface LivePlayer {
  uid: string;
  displayName: string;
  score: number;
  correctCount: number;
}
interface LiveResponse {
  uid: string;
  given: number;
  correct: boolean;
  points: number;
}

const questions = ref<LiveQuestion[]>([]);
const session = ref<LiveSession | null>(null);
const players = ref<LivePlayer[]>([]);
const responses = ref<LiveResponse[]>([]);
const qrDataUrl = ref("");
const loading = ref(true);
const error = ref("");
const busy = ref("");
const sessionIdRef = ref("");
const joinModalOpen = ref(false);

let sessionUnsub: (() => void) | null = null;
let playersUnsub: (() => void) | null = null;
let answersUnsub: (() => void) | null = null;
let answersIndex = -2;

const currentQuestion = computed(() => {
  const idx = session.value?.currentIndex ?? -1;
  return questions.value.find((q) => q.order === idx) ?? questions.value[idx] ?? null;
});
const isLastQuestion = computed(() => {
  return (session.value?.currentIndex ?? -1) >= (session.value?.questionCount ?? 0) - 1;
});
const countFor = (optionIndex: number): number => responses.value.filter((r) => r.given === optionIndex).length;
const totalResponses = computed(() => responses.value.length);
const percentFor = (optionIndex: number): number =>
  totalResponses.value ? Math.round((countFor(optionIndex) / totalResponses.value) * 100) : 0;

function optionLetter(i: number): string {
  return String.fromCharCode(65 + i);
}

const COLOR_CLASSES = ["hc-0", "hc-1", "hc-2", "hc-3"];

function attachSession(sessionId: string): void {
  sessionUnsub = onSnapshot(doc(db, "liveQuizzes", sessionId), (snap) => {
    if (!snap.exists()) return;
    const data = snap.data() as LiveSession;
    session.value = data;
    const idx = data.currentIndex;
    if (idx === answersIndex) return;
    answersIndex = idx;
    answersUnsub?.();
    answersUnsub = null;
    if (idx >= 0) {
      answersUnsub = onSnapshot(collection(db, "liveQuizzes", sessionId, "responses", String(idx), "answers"), (answersSnap) => {
        responses.value = answersSnap.docs.map((d) => d.data() as LiveResponse);
      });
    }
  });
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const quiz = await getQuizForTeacher(props.quizId);
    questions.value = [...quiz.questions].sort((a, b) => a.order - b.order);
    const { sessionId, code } = await startLiveQuiz(props.quizId);
    sessionIdRef.value = sessionId;
    attachSession(sessionId);
    playersUnsub = onSnapshot(collection(db, "liveQuizzes", sessionId, "players"), (snap) => {
      players.value = snap.docs.map((d) => d.data() as LivePlayer).sort((a, b) => b.score - a.score);
    });
    // QR para entrar desde el celular
    qrDataUrl.value = await QRCode.toDataURL(`https://ciudadania-lab.web.app/join/${code}`, { width: 200, margin: 1 });
  } catch (e) {
    error.value = (e as Error).message ?? "No se pudo iniciar.";
  } finally {
    loading.value = false;
  }
}

async function act(action: "start" | "next" | "reveal" | "end"): Promise<void> {
  if (!session.value || busy.value) return;
  busy.value = action;
  error.value = "";
  try {
    await advanceLiveQuiz(sessionIdRef.value, action);
    if (action === "reveal") {
      celebrate({ count: 150 });
      useSounds.win();
    } else if (action === "end") {
      celebrate({ count: 260 });
      useSounds.win();
    } else if (action === "next" || action === "start") {
      useSounds.click();
    }
  } catch (e) {
    error.value = (e as Error).message ?? "Error.";
  } finally {
    busy.value = "";
  }
}

async function startQuiz(): Promise<void> {
  await act("start");
  if (!error.value) joinModalOpen.value = true;
}

onMounted(load);
onBeforeUnmount(() => {
  sessionUnsub?.();
  playersUnsub?.();
  answersUnsub?.();
});
</script>

<template>
  <div class="live">
    <RouterLink to="/teacher/classes" class="back">← Clases</RouterLink>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error && !session" :message="error" @retry="load" />

    <template v-else-if="session">
      <div class="top">
        <div>
          <h1>{{ session.title }} — en vivo</h1>
          <p class="muted">{{ players.length }} jugadoras · pregunta {{ Math.max(0, session.currentIndex + 1) }}/{{ session.questionCount }}</p>
        </div>
        <div class="code-box">
          <span class="code-label">Código</span>
          <strong class="code">{{ session.code }}</strong>
        </div>
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="Código QR para entrar desde el celular" class="qr" />
      </div>

      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <div v-if="session.status === 'waiting'" class="waiting">
        <h2>¡Esperando jugadoras!</h2>
        <p class="muted">Comparte el código o el QR para que las estudiantes entren y respondan desde su celular.</p>
        <button class="btn-primary-big" :disabled="busy === 'start'" @click="startQuiz"><AppIcon name="play" /> Comenzar</button>
      </div>

      <div v-else-if="session.status !== 'ended'" class="stage">
        <Transition name="hslide" mode="out-in">
          <div :key="`${session.currentIndex}-${session.status}`" class="question-card">
            <div class="q-top">
              <span class="tag">{{ session.status === 'reveal' ? 'Respuestas' : 'Pregunta' }} {{ session.currentIndex + 1 }}</span>
              <span class="state-pill" :class="{ reveal: session.status === 'reveal' }">
                {{ session.status === 'reveal' ? '✓ Respuestas reveladas' : 'Respondiendo…' }}
              </span>
            </div>
            <h2>{{ currentQuestion?.prompt ?? "Pregunta" }}</h2>
            <p v-if="session.status === 'playing' && totalResponses" class="muted small live-count">
              Respuestas recibidas en vivo: <strong>{{ totalResponses }}</strong>
            </p>
            <div class="options">
              <div
                v-for="(opt, i) in currentQuestion?.options ?? []"
                :key="i"
                class="opt"
                :class="[COLOR_CLASSES[i % COLOR_CLASSES.length], {
                  dim: session.status === 'reveal' && i !== currentQuestion?.correctIndex,
                  isCorrect: session.status === 'reveal' && i === currentQuestion?.correctIndex,
                }]"
              >
                <span class="letter" aria-hidden="true">{{ optionLetter(i) }}</span>
                <span class="opt-text">{{ opt }}</span>
                <template v-if="totalResponses">
                  <span class="opt-bar-wrap">
                    <span class="opt-bar-fill" :style="{ width: `${percentFor(i)}%` }"></span>
                  </span>
                  <span class="opt-count">
                    {{ percentFor(i) }}% ({{ countFor(i) }})<template v-if="session.status === 'reveal' && i === currentQuestion?.correctIndex"> ✓</template>
                  </span>
                </template>
              </div>
            </div>
            <div class="controls">
              <button v-if="session.status === 'playing'" class="btn-primary-big" :disabled="busy === 'reveal'" @click="act('reveal')"><AppIcon name="eye" /> Revelar respuestas</button>
              <template v-else-if="session.status === 'reveal'">
                <button v-if="!isLastQuestion" class="btn-primary-big" :disabled="busy === 'next'" @click="act('next')"><AppIcon name="arrow" /> Siguiente pregunta</button>
                <button v-else class="btn-primary-big" :disabled="busy === 'end'" @click="act('end')"><AppIcon name="check" /> Terminar quiz</button>
              </template>
            </div>
          </div>
        </Transition>

        <aside class="podium">
          <h3>Puntaje</h3>
          <ol v-if="players.length">
            <li v-for="(p, i) in players" :key="p.uid" :class="{ first: i === 0 }">
              <span>{{ i + 1 }}.</span> {{ p.displayName }} <strong>{{ p.score }}</strong>
            </li>
          </ol>
          <p v-else class="muted small">Aún no hay jugadoras.</p>
          <button v-if="session.status !== 'ended'" class="btn-invite" @click="joinModalOpen = true">Mostrar invitación</button>
        </aside>
      </div>

      <div v-else class="waiting">
        <h2>¡Quiz terminado!</h2>
        <p class="muted">Felicitaciones. Puedes cerrar la sesión.</p>
      </div>

      <Teleport to="body">
        <div v-if="joinModalOpen" class="join-modal-overlay" role="presentation" @click.self="joinModalOpen = false">
          <div class="join-modal" role="dialog" aria-modal="true" aria-label="Quiz en vivo iniciado">
            <span class="join-badge">Quiz en vivo</span>
            <h2>¡El quiz ha comenzado!</h2>
            <p class="muted">Pide a tus estudiantes abrir la aplicación desde su celular y entrar con este código:</p>

            <div class="join-code">{{ session?.code }}</div>

            <div class="join-actions">
              <img v-if="qrDataUrl" :src="qrDataUrl" alt="Código QR para entrar al quiz" class="qr big" />
              <div class="join-steps">
                <p><strong>1.</strong> Abre <code>ciudadania-lab.web.app</code> en el celular.</p>
                <p><strong>2.</strong> Pulsa «Quiz en vivo» o escanea el QR.</p>
                <p><strong>3.</strong> Escribe el código <strong>{{ session?.code }}</strong> y espera la primera pregunta.</p>
              </div>
            </div>

            <p class="muted small">Jugadoras dentro: <strong>{{ players.length }}</strong></p>

            <div class="join-buttons">
              <button class="btn-primary-big" @click="joinModalOpen = false"><AppIcon name="play" /> Entendido · Ver el quiz</button>
            </div>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>

<style scoped>
.back { text-decoration: none; color: var(--color-text-muted); font-size: 0.9rem; }
.muted { color: var(--color-text-muted); }
.small { font-size: 0.85rem; }
.error { color: var(--color-danger); }
.top {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin: var(--space-3) 0;
}
.code-box {
  text-align: center;
  background: var(--color-primary);
  color: #fff;
  border-radius: 16px;
  padding: var(--space-3) var(--space-5);
}
.code-label { display: block; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; }
.code { font-size: 2.4rem; letter-spacing: 0.12em; }
.qr { width: 120px; height: 120px; border-radius: 12px; background: #fff; padding: 6px; }
.waiting {
  text-align: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: var(--space-6);
  margin-top: var(--space-4);
}
.stage {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: var(--space-4);
  margin-top: var(--space-4);
}
.question-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: var(--space-5);
  box-shadow: var(--shadow);
}
.tag {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: 999px;
}
.q-top { display: flex; justify-content: space-between; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
.state-pill { font-size: 0.75rem; font-weight: 800; color: var(--color-text-muted); border: 1px solid var(--color-border); padding: 3px 10px; border-radius: 999px; }
.state-pill.reveal { background: var(--color-primary-soft); color: var(--color-primary); }
.options { display: flex; flex-direction: column; gap: 12px; margin: var(--space-4) 0; }
.opt {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 3px solid transparent;
  border-radius: 14px;
  padding: 14px;
  color: #fff;
  font-weight: 700;
  font-size: 1.05rem;
  transition: filter 0.2s ease, border-color 0.15s ease, transform 0.15s ease;
}
.opt.hc-0 { background: #e21b3c; }
.opt.hc-1 { background: #1368ce; }
.opt.hc-2 { background: #d89e00; }
.opt.hc-3 { background: #26890c; }
.opt.dim { filter: brightness(0.5); }
.opt.isCorrect { border-color: #ffffff; box-shadow: 0 0 0 4px rgba(108, 235, 74, 0.85); animation: hpop 0.4s ease; }
@keyframes hpop { 0% { transform: scale(1); } 50% { transform: scale(1.04); } 100% { transform: scale(1); } }
.letter {
  flex: 0 0 auto;
  width: 32px; height: 32px; border-radius: 50%;
  display: grid; place-items: center;
  background: rgba(0, 0, 0, 0.28); color: #fff; font-weight: 900;
}
.opt-text { line-height: 1.3; }
.opt-bar-wrap { margin-left: auto; flex: 0 0 130px; height: 12px; border-radius: 999px; background: rgba(0, 0, 0, 0.28); overflow: hidden; }
.opt-bar-fill { height: 100%; display: block; background: #ffffff; border-radius: 999px; transition: width 0.5s ease; }
.opt-count { min-width: 3ch; text-align: right; font-weight: 800; }
.controls { margin-top: var(--space-3); display: flex; gap: var(--space-3); flex-wrap: wrap; }

/* Transición de pregunta */
.hslide-enter-active, .hslide-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.hslide-enter-from { opacity: 0; transform: translateX(24px); }
.hslide-leave-to { opacity: 0; transform: translateX(-24px); }
.btn-primary-big {
  background: linear-gradient(135deg, var(--color-primary), #0e7c66);
  color: #fff; border: none; border-radius: 999px;
  padding: 12px 24px; font-size: 1rem; font-weight: 700; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
}
.btn-primary-big:disabled { opacity: 0.5; cursor: not-allowed; }
.podium {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: var(--space-4);
}
.podium ol { list-style: none; padding: 0; margin: var(--space-2) 0; }
.podium li { display: flex; gap: 8px; padding: 6px 0; border-bottom: 1px dashed var(--color-border); }
.podium li.first { font-weight: 700; color: var(--color-accent); }
.podium li strong { margin-left: auto; }
.btn-invite {
  margin-top: var(--space-3);
  width: 100%;
  border: 1px solid var(--color-primary);
  background: var(--color-primary-soft);
  color: var(--color-primary);
  border-radius: 999px;
  padding: 8px 12px;
  font-weight: 700;
  cursor: pointer;
}

/* ===== Modal de inicio del quiz ===== */
.join-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(13, 35, 60, 0.7);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: var(--space-4);
}
.join-modal {
  width: min(560px, 96vw);
  max-height: 92vh;
  overflow-y: auto;
  background: var(--color-surface);
  border-radius: 22px;
  padding: var(--space-6);
  text-align: center;
  box-shadow: 0 24px 60px rgba(13, 35, 60, 0.5);
  color: var(--color-text);
}
.join-badge {
  display: inline-block;
  background: linear-gradient(135deg, var(--color-accent), #37c3a2);
  color: #fff;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  padding: 5px 14px;
  border-radius: 999px;
}
.join-modal h2 { color: var(--color-primary); }
.join-code {
  font-size: 3.4rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  color: var(--color-primary);
  margin: var(--space-2) 0;
}
.join-actions {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-4);
  align-items: center;
  text-align: left;
  margin: var(--space-3) 0;
}
.join-steps p { margin: 8px 0; line-height: 1.5; }
.join-steps code { background: var(--color-primary-soft); padding: 2px 6px; border-radius: 6px; }
.qr.big { width: 150px; height: 150px; }
.join-buttons { margin-top: var(--space-4); }

@media (max-width: 640px) {
  .stage { grid-template-columns: 1fr; }
  .join-actions { grid-template-columns: 1fr; justify-items: center; text-align: center; }
}
</style>
