<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { Slide, SlideBlock, SlideDeck, VoteResult } from "@pclab/shared";

const props = defineProps<{
  deck: SlideDeck;
  isProjection: boolean;
  results: Record<string, VoteResult>;
}>();

const emit = defineEmits<{
  vote: [payload: { questionId: string; option: number }];
  manual: [payload: { questionId: string; counts: Record<string, number> }];
  request: [questionId: string];
}>();

const step = ref(0);
const revealed = ref(false);
const manualCounts = ref<Record<string, Record<string, number>>>({});
const showTimer = ref(false);

const slide = computed<Slide | null>(() => props.deck.slides[step.value] ?? null);
const isLast = computed(() => step.value >= props.deck.slides.length - 1);

function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => undefined);
  } else {
    document.exitFullscreen().catch(() => undefined);
  }
}

function next(): void {
  if (!isLast.value) {
    step.value++;
    revealed.value = false;
    showTimer.value = false;
  }
}

function prev(): void {
  if (step.value > 0) {
    step.value--;
    revealed.value = false;
    showTimer.value = false;
  }
}

function onKey(e: KeyboardEvent): void {
  if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
    e.preventDefault();
    next();
  } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
    e.preventDefault();
    prev();
  } else if (e.key === "f" || e.key === "F") {
    toggleFullscreen();
  } else if (e.key === "h" || e.key === "H") {
    revealed.value = !revealed.value;
  }
}

function vote(block: SlideBlock, option: number): void {
  emit("vote", { questionId: block.id, option });
}

function saveManual(block: SlideBlock): void {
  emit("manual", { questionId: block.id, counts: manualCounts.value[block.id] ?? {} });
}

function resultOf(block: SlideBlock): VoteResult | null {
  return props.results[block.id] ?? null;
}

function totalOf(block: SlideBlock): number {
  return resultOf(block)?.total ?? 0;
}

function countOf(block: SlideBlock, optionIndex: number): number {
  return resultOf(block)?.counts[String(optionIndex)] ?? 0;
}

onMounted(() => window.addEventListener("keydown", onKey));
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
</script>

<template>
  <div class="deck">
    <header class="bar">
      <span class="title">{{ deck.slides[step]?.title ?? `Diapositiva ${step + 1}` }}</span>
      <span class="muted">{{ step + 1 }} / {{ deck.slides.length }}</span>
      <div class="actions">
        <button class="btn btn-ghost btn-sm" @click="revealed = !revealed">Revelar (H)</button>
        <button class="btn btn-ghost btn-sm" @click="toggleFullscreen">Pantalla completa (F)</button>
        <button class="btn btn-ghost btn-sm" :disabled="step === 0" @click="prev">←</button>
        <button class="btn btn-primary btn-sm" :disabled="isLast" @click="next">→</button>
      </div>
    </header>

    <div class="stage" :class="{ revealed }">
      <template v-if="slide">
        <h1 v-if="slide.blocks.find((b) => b.type === 'title')?.text">{{ slide.blocks.find((b) => b.type === 'title')?.text }}</h1>

        <div v-for="block in slide.blocks" :key="block.id" class="block">
          <template v-if="block.type === 'text' || block.type === 'callout'">
            <p class="text">{{ block.text }}</p>
          </template>

          <template v-else-if="block.type === 'quote'">
            <blockquote>{{ block.text }}</blockquote>
          </template>

          <template v-else-if="block.type === 'instruction'">
            <ol class="list">
              <li v-for="(part, i) in (block.text ?? '').split('\n').filter(Boolean)" :key="i">{{ part }}</li>
            </ol>
          </template>

          <template v-else-if="block.type === 'compare'">
            <div class="compare">
              <div><strong>A</strong><p>{{ block.a }}</p></div>
              <div><strong>B</strong><p>{{ block.b }}</p></div>
            </div>
          </template>

          <template v-else-if="block.type === 'timer'">
            <button v-if="!showTimer" class="btn btn-primary" @click="showTimer = true">Iniciar temporizador ({{ block.timerSeconds ?? '…' }} s)</button>
            <div v-else class="timer" role="timer">{{ block.timerSeconds ?? 60 }} s</div>
          </template>

          <template v-else-if="block.type === 'image'">
            <img v-if="block.url" :src="block.url" class="media" alt="" />
            <p v-else class="muted">Material visual pendiente de verificación.</p>
          </template>

          <template v-else-if="block.type === 'video'">
            <p class="muted">{{ block.title ?? "Video" }} (se habilitará cuando su uso esté verificado)</p>
          </template>

          <template v-else-if="block.type === 'question'">
            <h2>{{ block.title ?? "Pregunta" }}</h2>
            <p class="prompt">{{ block.text }}</p>
            <div class="options">
              <div v-for="(opt, i) in block.options ?? []" :key="i" class="option">
                <span>{{ opt }}</span>
                <template v-if="isProjection">
                  <span class="bar-wrap">
                    <span class="bar-fill" :style="{ width: `${totalOf(block) ? (countOf(block, i) / totalOf(block)) * 100 : 0}%` }"></span>
                  </span>
                  <span class="count">{{ countOf(block, i) }}</span>
                </template>
                <button v-else class="btn btn-ghost btn-sm" @click="vote(block, i)">Votar</button>
              </div>
            </div>

            <template v-if="isProjection">
              <div class="manual">
                <label>Conteo manual (sin dispositivos)</label>
                <input
                  v-for="(_, i) in block.options ?? []"
                  :key="i"
                  type="number"
                  min="0"
                  :value="manualCounts[block.id]?.[String(i)] ?? 0"
                  :aria-label="`Conteo opción ${i}`"
                  @change="manualCounts[block.id] = { ...(manualCounts[block.id] ?? {}), [String(i)]: Number(($event.target as HTMLInputElement).value || 0) }"
                />
                <button class="btn btn-primary btn-sm" @click="saveManual(block)">Guardar conteo</button>
              </div>
              <p v-if="revealed && block.correctIndex !== undefined" class="answer">
                Respuesta correcta: {{ block.options?.[block.correctIndex] }}
              </p>
            </template>
          </template>

          <template v-else-if="block.type === 'resource'">
            <p class="muted">{{ block.note }}</p>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.deck {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0f2233;
  color: #f4f6f8;
}
.bar {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: #0b1826;
  flex-wrap: wrap;
}
.title {
  font-weight: 600;
}
.actions {
  display: flex;
  gap: var(--space-2);
  margin-left: auto;
}
.stage {
  flex: 1;
  padding: var(--space-6);
  font-size: 1.3rem;
  overflow: auto;
}
.stage.revealed .block[data-hidden] {
  display: block;
}
.text,
.prompt {
  line-height: 1.6;
}
.list li {
  margin-bottom: var(--space-2);
}
.compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}
.media {
  max-width: 100%;
  border-radius: var(--radius);
}
.options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: var(--space-3) 0;
}
.option {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  background: #1a3248;
  padding: var(--space-3);
  border-radius: var(--radius);
}
.bar-wrap {
  flex: 1;
  background: #0b1826;
  border-radius: 999px;
  height: 14px;
  overflow: hidden;
}
.bar-fill {
  background: #2f9e83;
  height: 100%;
  display: block;
}
.count {
  min-width: 2ch;
  font-weight: 700;
}
.manual {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
  margin-top: var(--space-3);
}
.manual input {
  width: 70px;
  padding: var(--space-2);
  border-radius: var(--radius);
  border: 1px solid #33475b;
  background: #12283c;
  color: #fff;
}
.answer {
  color: #7fd6bf;
  font-weight: 600;
  margin-top: var(--space-3);
}
.timer {
  font-size: 3rem;
  font-weight: 800;
  color: #ffd166;
}
.muted {
  opacity: 0.7;
}
.btn-sm {
  padding: 6px 12px;
  font-size: 0.9rem;
}
</style>
