<script setup lang="ts">
import { computed, ref } from "vue";
import type { FlippedBlock, FlippedProgress } from "@pclab/shared";
import { requiredBlockIds } from "@pclab/domain";

const props = defineProps<{
  lessonBlocks: FlippedBlock[];
  progress: FlippedProgress;
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
const READY_LABEL = "Estoy lista para la misión";

const blocks = computed(() => props.lessonBlocks);
const current = computed(() => blocks.value[step.value] ?? null);
const isLast = computed(() => step.value >= blocks.value.length - 1);
const required = computed(() => requiredBlockIds(blocks.value));
const visitedCount = computed(() => required.value.filter((id) => props.progress.blocksVisited.includes(id)).length);
const canReady = computed(() => visitedCount.value >= required.value.length && required.value.length > 0);

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
</script>

<template>
  <div class="player">
    <div class="meta">
      <div class="bar" aria-hidden="true">
        <div class="bar-fill" :style="{ width: `${progressPercent()}%` }"></div>
      </div>
      <p class="small muted">
        Progreso: {{ visitedCount }}/{{ required.length }} pasos · {{ progressPercent() }}%
        <template v-if="progress.quizScore !== null"> · Quiz: {{ progress.quizScore }} acierto(s)</template>
      </p>
    </div>

    <div class="step" v-if="current">
      <template v-if="current.type === 'title'">
        <h1>{{ current.text }}</h1>
        <button class="btn btn-primary" @click="next">Comenzar</button>
      </template>

      <template v-else-if="current.type === 'objective'">
        <h2>Objetivo</h2>
        <p>{{ current.text }}</p>
        <button class="btn btn-ghost" @click="next">Seguir</button>
      </template>

      <template v-else-if="current.type === 'problem'">
        <h2>Pregunta problematizadora</h2>
        <p class="problem">{{ current.text }}</p>
        <button class="btn btn-ghost" @click="next">Seguir</button>
      </template>

      <template v-else-if="current.type === 'concepts'">
        <h2>Conceptos clave</h2>
        <ul class="concepts">
          <li v-for="c in current.items" :key="c">{{ c }}</li>
        </ul>
        <button class="btn btn-ghost" @click="next">Seguir</button>
      </template>

      <template v-else-if="current.type === 'text'">
        <div class="markdown" :data-level="current.readingLevel ?? 'standard'">{{ current.markdown }}</div>
        <button class="btn btn-ghost" @click="next">Seguir</button>
      </template>

      <template v-else-if="current.type === 'reading'">
        <h2>{{ current.title }}</h2>
        <div class="reading">{{ current.text }}</div>
        <p v-if="current.source" class="small muted attribution">Fuente: {{ current.source.author ?? "—" }}</p>
        <button class="btn btn-ghost" @click="next">Seguir</button>
      </template>

      <template v-else-if="current.type === 'image'">
        <img v-if="current.url" :src="current.url" :alt="current.alt" class="media" />
        <p v-else class="muted">Material visual pendiente de verificación de derechos.</p>
        <p v-if="current.caption" class="caption">{{ current.caption }}</p>
        <button class="btn btn-ghost" @click="next">Seguir</button>
      </template>

      <template v-else-if="current.type === 'video' || current.type === 'map' || current.type === 'infographic'">
        <h2>{{ current.type === 'video' ? 'Video' : current.type === 'map' ? 'Mapa' : 'Infografía' }}</h2>
        <p class="muted">Este recurso se habilitará cuando su uso esté verificado.</p>
        <button class="btn btn-ghost" @click="next">Seguir</button>
      </template>

      <template v-else-if="current.type === 'question'">
        <h2>Pregunta</h2>
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
          >
            {{ opt }}
          </button>
        </div>
        <p v-if="feedback[current.id] !== undefined" class="feedback" role="status">
          {{ feedback[current.id] ? "¡Correcto!" : "Revisa la explicación." }}
          <span v-if="current.explanation" class="explanation">{{ current.explanation }}</span>
        </p>
        <button v-if="feedback[current.id] !== undefined" class="btn btn-primary" @click="next">Seguir</button>
      </template>

      <template v-else-if="current.type === 'reflection'">
        <h2>Reflexión</h2>
        <p>{{ current.prompt }}</p>
        <textarea
          v-model="reflectionText"
          rows="4"
          :aria-label="`Reflexión: ${current.prompt}`"
          class="reflection-input"
        ></textarea>
        <button class="btn btn-primary" :disabled="!reflectionText.trim()" @click="saveReflection">
          Guardar y continuar
        </button>
      </template>

      <template v-else-if="current.type === 'resource'">
        <h2>Recurso complementario</h2>
        <p>{{ current.title }}</p>
        <p v-if="current.note" class="muted">{{ current.note }}</p>
        <button class="btn btn-ghost" @click="next">Seguir</button>
      </template>

      <template v-else>
        <p class="muted">Contenido en preparación.</p>
        <button class="btn btn-ghost" @click="next">Seguir</button>
      </template>
    </div>

    <div class="ready" v-if="isLast && canReady">
      <button class="btn btn-primary btn-lg" :disabled="progress.ready" @click="markReady">
        {{ progress.ready ? "¡Lista! Ya puedes ir a clase" : READY_LABEL }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.meta {
  margin-bottom: var(--space-4);
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
  transition: width 0.3s ease;
}
.step {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: var(--space-5);
}
.problem {
  font-size: 1.1rem;
  font-weight: 600;
}
.markdown {
  white-space: pre-line;
  line-height: 1.6;
}
.markdown[data-level="simple"] {
  font-size: 1.05rem;
}
.reading {
  white-space: pre-line;
  line-height: 1.65;
}
.concepts li {
  margin-bottom: var(--space-2);
}
.prompt {
  font-weight: 600;
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
  font-weight: 600;
}
.explanation {
  display: block;
  font-weight: 400;
  color: var(--color-text-muted);
  margin-top: var(--space-2);
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
.attribution {
  font-size: 0.8rem;
}
.muted {
  color: var(--color-text-muted);
}
.small {
  font-size: 0.85rem;
}
.ready {
  text-align: center;
  margin-top: var(--space-5);
}
.btn-lg {
  padding: var(--space-3) var(--space-5);
  font-size: 1.1rem;
}
</style>
