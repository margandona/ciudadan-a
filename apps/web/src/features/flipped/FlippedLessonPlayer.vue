<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { FlippedBlock, FlippedProgress } from "@pclab/shared";
import { requiredBlockIds } from "@pclab/domain";
import SpeakButton from "@/components/ui/SpeakButton.vue";
import { celebrate } from "@/composables/useConfetti";
import { useSounds } from "@/composables/useSounds";

const props = defineProps<{
  lessonBlocks: FlippedBlock[];
  progress: FlippedProgress;
  classId?: string;
}>();

const emit = defineEmits<{
  track: [payload: {
    blockId?: string;
    question?: { blockId: string; correct: boolean; score: number };
    reflection?: { blockId: string; text: string };
    markReady?: boolean;
    interactionSeconds?: number;
  }];
}>();

const step = ref(0);
const startedAt = ref<number | null>(null);
const answers = ref<Record<string, number | null>>({});
const feedback = ref<Record<string, boolean | null>>({});
const reflectionText = ref("");
const revealedConcepts = ref<Record<string, boolean>>({});
const selectedConcept = ref<{ label: string; def: string } | null>(null);
const READY_LABEL = "Estoy lista para la misión";

const laboratoryChallenges: Record<string, { chapter: string; story: string; task: string; reward: string }> = {
  "game-class-07": {
    chapter: "Capítulo 1 · Consejo de soluciones",
    story: "La plaza de Ovalle está a oscuras. El Observatorio te convoca a una mesa de decisión: debes reunir Estado, mercado y ciudadanía para devolverle la vida.",
    task: "Elige un actor, defiende tu decisión con igualdad, eficiencia o participación y propone una colaboración.",
    reward: "Insignia: Mediadora del bien común",
  },
  "game-class-08": {
    chapter: "Capítulo 2 · Presupuesto bajo presión",
    story: "Llegaron 100 fichas al laboratorio. Cada ficha que entregues a un área cambia la vida de Ovalle y deja otra necesidad esperando.",
    task: "Distribuye mentalmente las prioridades y explica qué costo de oportunidad aceptas.",
    reward: "Insignia: Guardiana del presupuesto",
  },
  "game-class-09": {
    chapter: "Capítulo 3 · Código desigualdad",
    story: "Los datos del territorio están mezclados como pistas. Tu equipo debe separar lo que el gráfico muestra de lo que todavía falta preguntar.",
    task: "Usa la secuencia Observo → Interpreto → Cuestiono → Propongo sin etiquetar a ninguna persona.",
    reward: "Insignia: Detective de datos",
  },
  "game-class-10": {
    chapter: "Capítulo 4 · El acuerdo del Limarí",
    story: "El año viene seco y el agua debe alcanzar para las casas, el riego y el río. Tres voces esperan una propuesta sostenible.",
    task: "Construye un acuerdo que considere a la comunidad, la economía y el medio ambiente.",
    reward: "Insignia: Custodia del agua",
  },
  "game-class-11": {
    chapter: "Capítulo 5 · Diseño Ovalle 2035",
    story: "El mapa del futuro está en blanco. Tu equipo recibe una oportunidad para transformar un problema real en una propuesta posible.",
    task: "Conecta problema, evidencia, actores, recursos e impactos en una solución realizable.",
    reward: "Insignia: Diseñadora de futuros",
  },
  "game-class-12": {
    chapter: "Capítulo final · Feria ciudadana",
    story: "Las puertas de la feria están por abrir. Solo tres minutos separan a tu propuesta de una comunidad que necesita entenderla y apoyarla.",
    task: "Ensaya una presentación clara: problema, evidencia, propuesta, actores, sostenibilidad e impacto.",
    reward: "Insignia: Vocera de Ovalle 2035",
  },
};

const challenge = computed(() => {
  const game = blocks.value.find((block) => block.type === "gameRef");
  return game?.type === "gameRef" ? laboratoryChallenges[game.gameId] : null;
});

function conceptParts(item: string): { label: string; def: string } {
  const i = item.indexOf(":");
  if (i < 0) return { label: item, def: "" };
  return { label: item.slice(0, i).trim(), def: item.slice(i + 1).trim() };
}

function visualNote(): string {
  const block = current.value as unknown as { note?: string } | null;
  return block?.note ?? "";
}

function visualUrl(): string {
  const block = current.value as unknown as { url?: string } | null;
  return block?.url ?? "";
}

function toggleConcept(idx: number): void {
  const b = current.value;
  if (!b || b.type !== "concepts") return;
  const parts = conceptParts(b.items[idx] ?? "");
  selectedConcept.value = parts;
  revealedConcepts.value[`${b.id}-${idx}`] = true;
}

function conceptRevealed(b: FlippedBlock, idx: number): boolean {
  return revealedConcepts.value[`${b.id}-${idx}`] === true;
}

const blocks = computed(() => props.lessonBlocks);
const current = computed(() => blocks.value[step.value] ?? null);
const isLast = computed(() => step.value >= blocks.value.length - 1);
const required = computed(() => requiredBlockIds(blocks.value));
const visitedCount = computed(() => required.value.filter((id) => props.progress.blocksVisited.includes(id)).length);
const canReady = computed(() => visitedCount.value >= required.value.length && required.value.length > 0);

const stepPct = computed(() => {
  if (blocks.value.length === 0) return 0;
  return Math.round(((step.value + 1) / blocks.value.length) * 100);
});

const speakText = computed(() => {
  const b = current.value;
  if (!b) return "";
  const anyB = b as unknown as { title?: string; text?: string; markdown?: string; prompt?: string; caption?: string; items?: string[] };
  const parts = [anyB.title, anyB.text, anyB.markdown, anyB.prompt, anyB.caption].filter(Boolean).join(". ");
  const items = (anyB.items ?? []).join(". ");
  return [parts, items].filter(Boolean).join(". ");
});

function seconds(): number {
  if (startedAt.value === null) return 0;
  return Math.max(0, Math.floor((Date.now() - startedAt.value) / 1000));
}

function next(): void {
  const block = current.value;
  if (!block) return;
  if (block.type === "question" && feedback.value[block.id] === undefined) return;
  emit("track", { blockId: block.id, interactionSeconds: seconds() });
  if (step.value < blocks.value.length - 1) step.value++;
}

function answer(index: number): void {
  const block = current.value;
  if (!block || block.type !== "question") return;
  const correct = index === block.correctIndex;
  answers.value[block.id] = index;
  feedback.value[block.id] = correct;
  if (correct) useSounds.correct();
  else useSounds.wrong();
  emit("track", {
    question: { blockId: block.id, correct, score: correct ? 1 : 0 },
    interactionSeconds: seconds(),
  });
}

function saveReflection(): void {
  const block = current.value;
  if (!block || block.type !== "reflection") return;
  emit("track", { reflection: { blockId: block.id, text: reflectionText.value }, interactionSeconds: seconds() });
  if (step.value < blocks.value.length - 1) step.value++;
}

function markReady(): void {
  emit("track", { markReady: true, interactionSeconds: seconds() });
}

function optionLetter(i: number): string {
  return String.fromCharCode(65 + i);
}

function progressPercent(): number {
  const block = current.value;
  if (!block) return 0;
  const base = Math.round((visitedCount.value / Math.max(1, required.value.length)) * 100);
  if (block.type === "question" && feedback.value[block.id] !== undefined) {
    const extra = 1 / Math.max(1, required.value.length);
    return Math.min(100, Math.round((visitedCount.value + extra) * 100 / Math.max(1, required.value.length)));
  }
  return base;
}

watch(
  () => props.progress.ready,
  (ready, wasReady) => {
    if (ready && !wasReady) celebrate();
  },
);
</script>

<template>
  <div class="player">
    <div class="hud">
      <div class="bar" aria-hidden="true">
        <div class="bar-fill" :style="{ width: `${stepPct}%` }"></div>
      </div>
      <div class="hud-meta">
        <span>Paso {{ step + 1 }} de {{ blocks.length }}</span>
        <span v-if="progress.quizScore !== null">Quiz: {{ progress.quizScore }} acierto(s)</span>
        <span>{{ progressPercent() }}%</span>
      </div>
    </div>

    <Transition name="slide" mode="out-in">
      <div class="step" :key="step" v-tilt="{ max: 4, speed: 500, scale: 1 }">
        <div class="step-glow" aria-hidden="true"></div>
        <div class="step-top">
          <span class="step-tag">{{ current?.type === 'question' ? '¡Pregunta!' : 'Aprende' }}</span>
          <SpeakButton :text="speakText" />
        </div>

        <template v-if="current?.type === 'title'">
          <h1 class="big-title">{{ current.text }}</h1>
          <button class="btn-primary-big" @click="next">Comenzar →</button>
        </template>

        <template v-else-if="current?.type === 'objective'">
          <h2 class="step-h">Objetivo</h2>
          <p class="step-text">{{ current.text }}</p>
          <button class="btn-ghost-big" @click="next">Seguir →</button>
        </template>

        <template v-else-if="current?.type === 'problem'">
          <h2 class="step-h">Pregunta problematizadora</h2>
          <p class="step-text big">{{ current.text }}</p>
          <button class="btn-ghost-big" @click="next">Seguir →</button>
        </template>

        <template v-else-if="current?.type === 'concepts'">
          <h2 class="step-h">Conceptos clave</h2>
          <p class="muted small">Toca cada tarjeta para descubrir el concepto.</p>
          <div class="concept-grid">
            <button
              v-for="(item, idx) in current.items"
              :key="idx"
              class="concept-card"
              :class="{ revealed: conceptRevealed(current, idx) }"
              :aria-pressed="conceptRevealed(current, idx)"
              @click="toggleConcept(idx)"
              v-tilt="{ max: 12, speed: 500, scale: 1.02 }"
            >
              <template v-if="!conceptRevealed(current, idx)">
                <span class="concept-q" aria-hidden="true">?</span>
                <span>Descubre el concepto</span>
              </template>
              <template v-else>
                <strong>{{ conceptParts(item).label }}</strong>
                <span class="concept-def">{{ conceptParts(item).def }}</span>
              </template>
            </button>
          </div>
          <div v-if="selectedConcept" class="concept-modal" role="dialog" aria-modal="true" aria-label="Definición del concepto">
            <div class="concept-modal-inner">
              <div class="concept-modal-head">
                <strong>{{ selectedConcept.label }}</strong>
                <button type="button" class="modal-close" aria-label="Cerrar definición" @click="selectedConcept = null">×</button>
              </div>
              <p>{{ selectedConcept.def }}</p>
              <SpeakButton :text="`${selectedConcept.label}. ${selectedConcept.def}`" label="Escuchar definición" />
            </div>
          </div>
          <button class="btn-ghost-big" @click="next">Seguir →</button>
        </template>

        <template v-else-if="current?.type === 'text'">
          <div class="markdown" :data-level="current.readingLevel ?? 'standard'">{{ current.markdown }}</div>
          <button class="btn-ghost-big" @click="next">Seguir →</button>
        </template>

        <template v-else-if="current?.type === 'reading'">
          <h2 class="step-h">{{ current.title }}</h2>
          <div class="reading">{{ current.text }}</div>
          <p v-if="current.source" class="small muted attribution">Fuente: {{ current.source.author ?? "—" }}<template v-if="current.source.originalUrl"> · <a :href="current.source.originalUrl" target="_blank" rel="noreferrer">Ver fuente</a></template></p>
          <button class="btn-ghost-big" @click="next">Seguir →</button>
        </template>

        <template v-else-if="current?.type === 'image'">
          <img v-if="current.url" :src="current.url" :alt="current.alt" class="media" />
          <p v-else class="muted">Prepara una lámina o mapa del tema para acompañar la explicación.</p>
          <p v-if="current.caption" class="caption">{{ current.caption }}</p>
          <div v-if="current.note" class="visual-note">{{ current.note }}</div>
          <button class="btn-ghost-big" @click="next">Seguir →</button>
        </template>

        <template v-else-if="['video', 'map', 'infographic'].includes(current?.type ?? '')">
          <h2 class="step-h">{{ current?.type === 'video' ? 'Video' : current?.type === 'map' ? 'Mapa' : 'Infografía' }}</h2>
          <p v-if="visualNote()" class="visual-note">{{ visualNote() }}</p>
          <p v-else-if="current?.type === 'map'" class="muted">Observa el mapa e identifica el territorio, sus lugares y su escala antes de continuar.</p>
          <a v-if="current?.type !== 'map' && visualUrl()" :href="visualUrl()" target="_blank" rel="noreferrer" class="resource-link">Abrir video / recurso ↗</a>
          <button class="btn-ghost-big" @click="next">Seguir →</button>
        </template>

        <template v-else-if="current?.type === 'question'">
          <h2 class="step-h">¡Pregunta!</h2>
          <p class="prompt">{{ current.prompt }}</p>
          <div class="options">
            <button
              v-for="(opt, i) in current.options"
              :key="i"
              class="option"
              :class="{
                selected: answers[current.id] === i,
                correct: feedback[current.id] === true && answers[current.id] === i,
                wrong: feedback[current.id] === false && answers[current.id] === i,
              }"
              :disabled="feedback[current.id] !== undefined"
              @click="answer(i)"
              v-tilt="{ max: 10, speed: 500, scale: 1.01 }"
            >              <span class="opt-letter" aria-hidden="true">{{ optionLetter(i) }}</span>
              <span>{{ opt }}</span>
            </button>
          </div>
          <p v-if="feedback[current.id] !== undefined" class="feedback" role="status">
            {{ feedback[current.id] ? "¡Correcto!" : "¡Sigue intentando!" }}
            <span v-if="current.explanation" class="explanation">{{ current.explanation }}</span>
          </p>
          <button v-if="feedback[current.id] !== undefined" class="btn-primary-big" @click="next">Seguir →</button>
        </template>

        <template v-else-if="current?.type === 'reflection'">
          <h2 class="step-h">Reflexión</h2>
          <p>{{ current.prompt }}</p>
          <textarea
            v-model="reflectionText"
            rows="4"
            :aria-label="`Reflexión: ${current.prompt}`"
            class="reflection-input"
          ></textarea>
          <button class="btn-primary-big" :disabled="!reflectionText.trim()" @click="saveReflection">
            Guardar y continuar →
          </button>
        </template>

        <template v-else-if="current?.type === 'resource'">
          <h2 class="step-h">Recurso complementario</h2>
          <p>{{ current.title }}</p>
          <p v-if="current.note" class="muted">{{ current.note }}</p>
          <a v-if="current.url" :href="current.url" target="_blank" rel="noreferrer" class="resource-link">Abrir recurso ↗</a>
          <button class="btn-ghost-big" @click="next">Seguir →</button>
        </template>

        <template v-else-if="current?.type === 'gameRef'">
          <div v-if="challenge" class="campaign-card">
            <span class="campaign-kicker">Laboratorio de computación · misión gamificada</span>
            <h2 class="step-h">{{ challenge.chapter }}</h2>
            <p class="campaign-story">{{ challenge.story }}</p>
            <div class="campaign-task">
              <strong>Reto cooperativo</strong>
              <p>{{ challenge.task }}</p>
            </div>
            <p class="campaign-reward">★ {{ challenge.reward }} · se gana practicando, no compitiendo por notas.</p>
          </div>
          <p v-else class="muted">Reto de laboratorio en preparación.</p>
          <SpeakButton v-if="challenge" :text="`${challenge.chapter}. ${challenge.story}. Reto cooperativo: ${challenge.task}. ${challenge.reward}`" label="Escuchar historia y reto" />
          <button class="btn-primary-big" @click="next">Aceptar el reto →</button>
        </template>

        <template v-else>
          <p class="muted">Contenido en preparación.</p>
          <button class="btn-ghost-big" @click="next">Seguir →</button>
        </template>
      </div>
    </Transition>

    <div v-if="isLast && canReady" class="finish" :class="{ done: progress.ready }">
      <div class="finish-stars" aria-hidden="true">★ ★ ★</div>
      <h2 class="finish-title">{{ progress.ready ? "¡Misión completada!" : "¡Casi lista!" }}</h2>
      <p class="muted">
        {{ progress.ready ? "Ganaste la medalla de esta misión. Revisa tu medallero." : "Recorriste todos los pasos. ¡Confirma para ganar tu medalla!" }}
      </p>
      <button class="btn-primary-big" :disabled="progress.ready" @click="markReady">
        {{ progress.ready ? "¡Lista! Ya puedes ir a clase" : READY_LABEL }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.player {
  max-width: 760px;
  margin: 0 auto;
}

/* ===== HUD ===== */
.hud {
  margin-bottom: var(--space-4);
}
.bar {
  background: var(--color-border);
  border-radius: 999px;
  height: 12px;
  overflow: hidden;
}
.bar-fill {
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent), #37c3a2);
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}
.hud-meta {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-2);
  font-size: 0.85rem;
  color: var(--color-text-muted);
  font-weight: 600;
  flex-wrap: wrap;
}

/* ===== Diapositiva ===== */
.step {
  position: relative;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 22px;
  box-shadow: 0 12px 30px rgba(18, 58, 95, 0.12);
  padding: var(--space-6);
  min-height: 320px;
}
.step-glow {
  position: absolute;
  top: -70px;
  right: -70px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(14, 124, 102, 0.16), transparent 70%);
  pointer-events: none;
}
.step-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.step-tag {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: 999px;
}
.step-h {
  color: var(--color-primary);
  margin: 0 0 var(--space-2);
}
.big-title {
  color: var(--color-primary);
  font-size: 2rem;
  margin: 0 0 var(--space-4);
}
.step-text {
  font-size: 1.08rem;
  line-height: 1.65;
}
.step-text.big {
  font-size: 1.2rem;
  font-weight: 600;
}
.markdown {
  white-space: pre-line;
  line-height: 1.65;
}
.reading {
  white-space: pre-line;
  line-height: 1.7;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-3) 0;
}
.chip-concept {
  background: var(--color-primary-soft);
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 999px;
}
.concept-grid {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  margin: var(--space-3) 0;
}
.concept-card {
  min-height: 110px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  text-align: center;
  border: 2px dashed var(--color-primary);
  border-radius: 16px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  padding: var(--space-3);
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}
.concept-card:hover {
  transform: translateY(-3px);
}
.concept-card.revealed {
  border: 2px solid var(--color-accent);
  background: #eefaf6;
  color: var(--color-text);
  align-items: flex-start;
  text-align: left;
  cursor: default;
}
.concept-modal { margin: var(--space-3) 0; padding: 4px; border-radius: 16px; background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); }
.concept-modal-inner { background: var(--color-surface); border-radius: 13px; padding: var(--space-4); }
.concept-modal-head { display: flex; align-items: center; justify-content: space-between; color: var(--color-primary); font-size: 1.15rem; }
.concept-modal-inner p { line-height: 1.6; }
.modal-close { border: 0; background: transparent; color: var(--color-text-muted); font-size: 1.6rem; cursor: pointer; }
.concept-q {
  font-size: 2rem;
  font-weight: 800;
}
.concept-def {
  font-weight: 400;
  font-size: 0.9rem;
  line-height: 1.4;
  color: var(--color-text-muted);
}
.prompt {
  font-weight: 700;
  font-size: 1.1rem;
  margin: 0 0 var(--space-3);
}
.options {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  margin: var(--space-3) 0;
}
.option {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  padding: var(--space-3);
  border: 2px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-bg);
  cursor: pointer;
  font-size: 1rem;
  transition: transform 0.12s ease, border-color 0.12s ease, background 0.12s ease;
}
.option:hover:not(:disabled) {
  border-color: var(--color-primary);
  transform: translateY(-2px);
}
.opt-letter {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--color-primary);
  color: #fff;
  font-weight: 800;
  font-size: 0.9rem;
}
.option.selected {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}
.option.correct {
  border-color: var(--color-accent);
  background: #e2f4ee;
}
.option.wrong {
  border-color: var(--color-danger);
  background: #fdecea;
}
.feedback {
  color: var(--color-accent);
  font-weight: 700;
  font-size: 1.05rem;
}
.explanation {
  display: block;
  font-weight: 400;
  color: var(--color-text-muted);
  margin-top: var(--space-2);
  font-size: 0.95rem;
}
.reflection-input {
  width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-family: inherit;
  font-size: 1rem;
  margin: var(--space-3) 0;
}
.media {
  max-width: 100%;
  border-radius: var(--radius);
}
.caption {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
.visual-note {
  margin: var(--space-3) 0;
  padding: var(--space-3);
  border-left: 4px solid var(--color-accent);
  border-radius: 0 10px 10px 0;
  background: #eefaf6;
  white-space: pre-line;
  line-height: 1.6;
}
.attribution {
  font-size: 0.8rem;
}
.attribution a, .resource-link { color: var(--color-primary); font-weight: 700; }
.resource-link { display: inline-block; margin: var(--space-2) 0; text-decoration: none; }
.campaign-card {
  background: linear-gradient(135deg, #102d4b, #0e7c66);
  color: #fff;
  border-radius: 18px;
  padding: var(--space-5);
  box-shadow: 0 12px 26px rgba(18, 58, 95, 0.2);
}
.campaign-card .step-h { color: #fff; }
.campaign-kicker { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 800; opacity: 0.85; }
.campaign-story { font-size: 1.08rem; line-height: 1.7; }
.campaign-task { background: rgba(255, 255, 255, 0.13); border-radius: 14px; padding: var(--space-3); }
.campaign-task p { margin: 6px 0 0; line-height: 1.5; }
.campaign-reward { color: #ffe28a; font-weight: 700; margin-bottom: 0; }
.muted { color: var(--color-text-muted); }
.small { font-size: 0.85rem; }

/* ===== Botones ===== */
.btn-primary-big,
.btn-ghost-big {
  display: inline-block;
  border: none;
  border-radius: 999px;
  padding: 12px 24px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  margin-top: var(--space-3);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.btn-primary-big {
  background: linear-gradient(135deg, var(--color-primary), #0e7c66);
  color: #fff;
  box-shadow: 0 6px 16px rgba(18, 58, 95, 0.28);
}
.btn-primary-big:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(18, 58, 95, 0.34);
}
.btn-primary-big:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-ghost-big {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}
.btn-ghost-big:hover {
  transform: translateY(-2px);
}

/* ===== Transición de diapositiva ===== */
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.slide-enter-from {
  opacity: 0;
  transform: translateX(28px);
}
.slide-leave-to {
  opacity: 0;
  transform: translateX(-28px);
}

/* ===== Final ===== */
.finish {
  margin-top: var(--space-4);
  text-align: center;
  background: linear-gradient(180deg, #ffffff, #eefaf6);
  border: 2px solid var(--color-accent);
  border-radius: 20px;
  padding: var(--space-5);
}
.finish-stars {
  font-size: 1.6rem;
  color: #f6c945;
  letter-spacing: 8px;
}
.finish-title {
  color: var(--color-accent);
  margin: var(--space-2) 0;
}

/* ===== Mobile-first (pantallas muy pequeñas) ===== */
@media (max-width: 480px) {
  .step {
    padding: var(--space-4);
    min-height: 0;
  }
  .big-title {
    font-size: 1.5rem;
  }
  .step-text {
    font-size: 1rem;
  }
  .step-text.big {
    font-size: 1.08rem;
  }
  .options {
    grid-template-columns: 1fr;
  }
  .concept-grid {
    grid-template-columns: 1fr;
  }
  .option {
    padding: var(--space-2);
  }
}
</style>
