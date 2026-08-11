<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { Slide, SlideBlock, SlideBlockType, SlideDeck, SlideKind } from "@pclab/shared";
import { SLIDE_BLOCK_TYPES, SLIDE_KINDS } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { getPresentation, savePresentation } from "@/services/importApi";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const props = defineProps<{ classId: string }>();

const session = useSessionStore();
const courseId = ref(session.courses[0] ?? "");
const deck = ref<SlideDeck | null>(null);
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const notice = ref("");

let seq = 100;

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const result = await getPresentation(props.classId);
    deck.value = result.deck;
  } catch (e) {
    error.value = (e as Error).message ?? "No disponible.";
  } finally {
    loading.value = false;
  }
}

function newBlock(type: SlideBlockType): SlideBlock {
  return { id: `b${seq++}`, type } as SlideBlock;
}

function addBlock(slide: Slide): void {
  slide.blocks.push(newBlock("text"));
}

function removeBlock(slide: Slide, index: number): void {
  slide.blocks.splice(index, 1);
}

function addSlide(kind: SlideKind): void {
  deck.value?.slides.push({ id: `s${seq++}`, kind, blocks: [newBlock("title"), newBlock("text")] });
}

function removeSlide(index: number): void {
  deck.value?.slides.splice(index, 1);
}

function addOption(block: SlideBlock): void {
  if (!block.options) block.options = [];
  block.options.push(`Opción ${block.options.length + 1}`);
}

async function save(): Promise<void> {
  if (!deck.value) return;
  saving.value = true;
  notice.value = "";
  try {
    deck.value = await savePresentation(props.classId, courseId.value, deck.value.slides, deck.value.config);
    notice.value = "Presentación guardada (estructura validada).";
  } catch (e) {
    notice.value = (e as Error).message ?? "Error al guardar.";
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <RouterLink to="/teacher/classes" class="back">← Clases</RouterLink>
    <h1>Editor de presentación — {{ props.classId }}</h1>
    <p class="muted">
      Estructura pedagógica obligatoria: portada → aprendizaje → objetivo → ruta → activación → … → ticket de salida.
    </p>

    <p v-if="notice" class="notice" role="status">{{ notice }}</p>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <template v-else-if="deck">
      <div class="toolbar">
        <select v-model="seq" class="hidden"></select>
        <button class="btn btn-ghost" @click="addSlide('contenido')">+ Diapositiva (contenido)</button>
        <button class="btn btn-ghost" @click="addSlide('pregunta')">+ Pregunta</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">{{ saving ? "Guardando…" : "Guardar presentación" }}</button>
      </div>

      <div v-for="(slide, si) in deck.slides" :key="slide.id" class="slide">
        <div class="slide-head">
          <select v-model="slide.kind" class="select">
            <option v-for="k in SLIDE_KINDS" :key="k" :value="k">{{ k }}</option>
          </select>
          <input v-model="slide.title" class="input" placeholder="Título de la diapositiva" :aria-label="`Título diapositiva ${si + 1}`" />
          <button class="btn btn-danger btn-sm" @click="removeSlide(si)">Eliminar</button>
        </div>

        <div v-for="(block, bi) in slide.blocks" :key="block.id" class="block">
          <div class="block-head">
            <select v-model="block.type" class="select select-sm">
              <option v-for="t in SLIDE_BLOCK_TYPES" :key="t" :value="t">{{ t }}</option>
            </select>
            <button class="btn btn-ghost btn-sm" @click="removeBlock(slide, bi)">Quitar</button>
          </div>
          <input v-if="['image', 'video', 'resource'].includes(block.type)" v-model="block.url" class="input" placeholder="URL" />
          <input v-else v-model="block.title" class="input" placeholder="Título (opcional)" />
          <textarea v-model="block.text" class="input textarea" rows="3" placeholder="Texto"></textarea>
          <div v-if="block.type === 'question'" class="q">
            <div v-for="(_, oi) in block.options ?? []" :key="oi" class="q-row">
              <input v-model="block.options![oi]" class="input" :aria-label="`Opción ${oi}`" />
              <label class="correct">
                <input type="radio" :checked="block.correctIndex === oi" @change="block.correctIndex = oi" />
                Correcta
              </label>
            </div>
            <button class="btn btn-ghost btn-sm" @click="addOption(block)">+ Opción</button>
          </div>
        </div>

        <button class="btn btn-ghost btn-sm" @click="addBlock(slide)">+ Bloque</button>
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
.notice {
  background: var(--color-primary-soft);
  padding: var(--space-3);
  border-radius: var(--radius);
}
.toolbar {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
  margin: var(--space-4) 0;
}
.slide {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
}
.slide-head,
.block-head {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}
.block {
  border-top: 1px dashed var(--color-border);
  padding: var(--space-3) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.select,
.input {
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.9rem;
}
.select-sm {
  padding: 4px 8px;
}
.textarea {
  font-family: inherit;
  width: 100%;
}
.q {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.q-row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}
.correct {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
.hidden {
  display: none;
}
.btn-sm {
  padding: 4px 10px;
  font-size: 0.82rem;
}
.btn-danger {
  color: var(--color-danger);
}
</style>
