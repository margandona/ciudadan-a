<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { MATERIAL_STATUS, type AssessmentItem, type MaterialContent, type MaterialDetail } from "@pclab/shared";
import { correctMaterial, getMaterialDetail, resubmitMaterial, updateMaterial } from "@/services/importApi";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const props = defineProps<{ materialId: string }>();

const detail = ref<MaterialDetail | null>(null);
const loading = ref(true);
const error = ref("");
const notice = ref("");
const busy = ref("");
const changeSummary = ref("");

const form = reactive<{
  title: string;
  description: string;
  classDate: string;
  requiresPrinting: boolean;
  duration: number;
  oa: string;
  objective: string;
  indicators: string;
  sections: { id: string; kind: string; text: string; items: string }[];
  items: { id: string; type: string; prompt: string; points: number; options: string; correctIndex: number; justification: string }[];
  scale: string;
  criteria: { id: string; name: string; descriptor: string; levels: string }[];
  answerKey: { itemId: string; correct: string; points: number; justification: string }[];
  specTable: { oa: string; indicator: string; skill: string; itemId: string; points: number; level: string }[];
  pauta: string;
}>({
  title: "",
  description: "",
  classDate: "",
  requiresPrinting: false,
  duration: 0,
  oa: "",
  objective: "",
  indicators: "",
  sections: [],
  items: [],
  scale: "",
  criteria: [],
  answerKey: [],
  specTable: [],
  pauta: "",
});

function blockId(): string {
  return `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildContent(): MaterialContent {
  const content: MaterialContent = {
    curricular: {
      oa: form.oa.split(",").map((s) => s.trim()).filter(Boolean),
      objective: form.objective,
      indicators: form.indicators.split("\n").map((s) => s.trim()).filter(Boolean),
    },
    sections: form.sections.map((s) =>
      s.kind === "list"
        ? { id: s.id, kind: "list", items: s.items.split("\n").map((l) => l.trim()).filter(Boolean) }
        : s.kind === "table"
          ? { id: s.id, kind: "table", table: { headers: ["Decisión", "Costo", "Justificación", "Impacto"], rows: s.items.split("\n").filter(Boolean).map((l) => ({ cells: l.split("|").map((c) => c.trim()) })) } }
          : { id: s.id, kind: s.kind as "heading" | "text" | "response", text: s.text },
    ),
    items: form.items.map((i) => ({
      id: i.id,
      type: i.type as AssessmentItem["type"],
      prompt: i.prompt,
      options: i.options.split("\n").map((s) => s.trim()).filter(Boolean),
      correctIndex: i.correctIndex >= 0 ? i.correctIndex : undefined,
      points: i.points,
      justification: i.justification,
    })),
    rubric: form.scale || form.criteria.length
      ? {
          title: form.title || "Rúbrica",
          scale: form.scale.split("\n").map((l) => {
            const [score, label] = l.split("=");
            return { score: Number(score?.trim() ?? 1), label: (label ?? "Nivel").trim() };
          }).filter((l) => Number.isFinite(l.score)),
          criteria: form.criteria.map((c) => ({
            id: c.id,
            name: c.name,
            descriptor: c.descriptor,
            levels: c.levels.split("\n").map((l) => {
              const [score, descriptor] = l.split("=");
              return { score: Number(score?.trim() ?? 1), descriptor: (descriptor ?? "").trim() };
            }).filter((l) => Number.isFinite(l.score)),
          })),
        }
      : undefined,
    answerKey: form.answerKey.filter((a) => a.itemId && a.correct).map((a) => ({ itemId: a.itemId, correct: a.correct, points: a.points, justification: a.justification })),
    specTable: form.specTable.map((r) => ({ oa: r.oa, indicator: r.indicator, content: form.title, skill: r.skill, itemId: r.itemId, points: r.points, level: r.level })),
    pauta: form.pauta || undefined,
  };
  return content;
}

function fill(d: MaterialDetail): void {
  const m = d.material;
  const c = m.content;
  form.title = m.title;
  form.description = m.description ?? "";
  form.classDate = m.classDate?.slice(0, 10) ?? "";
  form.requiresPrinting = m.requiresPrinting ?? false;
  form.duration = m.duration ?? 0;
  form.oa = c?.curricular?.oa?.join(", ") ?? m.oaIds?.join(", ") ?? "";
  form.objective = c?.curricular?.objective ?? m.classObjective ?? "";
  form.indicators = c?.curricular?.indicators?.join("\n") ?? m.indicators?.join("\n") ?? "";
  form.sections = (c?.sections ?? []).map((s) => ({
    id: s.id,
    kind: s.kind,
    text: s.text ?? "",
    items: s.kind === "list" ? (s.items ?? []).join("\n") : s.kind === "table" ? (s.table?.rows ?? []).map((r) => r.cells.join(" | ")).join("\n") : "",
  }));
  form.items = (c?.items ?? []).map((i) => ({
    id: i.id,
    type: i.type,
    prompt: i.prompt,
    points: i.points,
    options: (i.options ?? []).join("\n"),
    correctIndex: i.correctIndex ?? -1,
    justification: i.justification ?? "",
  }));
  form.scale = (c?.rubric?.scale ?? []).map((l) => `${l.score}=${l.label}`).join("\n");
  form.criteria = (c?.rubric?.criteria ?? []).map((cr) => ({
    id: cr.id,
    name: cr.name,
    descriptor: cr.descriptor,
    levels: (cr.levels ?? []).map((l) => `${l.score}=${l.descriptor}`).join("\n"),
  }));
  form.answerKey = (c?.answerKey ?? []).map((a) => ({ itemId: a.itemId, correct: a.correct, points: a.points, justification: a.justification }));
  form.specTable = (c?.specTable ?? []).map((r) => ({ oa: r.oa, indicator: r.indicator, skill: r.skill, itemId: r.itemId, points: r.points, level: r.level }));
  form.pauta = c?.pauta ?? "";
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    detail.value = await getMaterialDetail(props.materialId);
    fill(detail.value);
  } catch (e) {
    error.value = (e as Error).message ?? "No disponible.";
  } finally {
    loading.value = false;
  }
}

async function save(): Promise<void> {
  const m = detail.value?.material;
  if (!m) return;
  busy.value = "save";
  notice.value = "";
  try {
    await updateMaterial({
      materialId: m.id,
      courseId: m.courseId,
      title: form.title,
      description: form.description || undefined,
      classDate: form.classDate ? new Date(form.classDate + "T18:00:00").toISOString() : null,
      requiresPrinting: form.requiresPrinting,
      duration: form.duration || undefined,
      content: buildContent(),
      changeSummary: `Edición v${m.version + 1}`,
    });
    notice.value = "Guardado (nueva versión creada).";
    await load();
  } catch (e) {
    notice.value = (e as Error).message;
  } finally {
    busy.value = "";
  }
}

async function saveCorrect(): Promise<void> {
  const m = detail.value?.material;
  if (!m) return;
  busy.value = "correct";
  notice.value = "";
  try {
    await correctMaterial({ materialId: m.id, courseId: m.courseId, content: buildContent(), changeSummary: changeSummary.value || `Corrección v${m.version + 1}` });
    notice.value = "Corrección guardada (nueva versión). Ahora puedes reenviar.";
    await load();
  } catch (e) {
    notice.value = (e as Error).message;
  } finally {
    busy.value = "";
  }
}

async function resubmit(): Promise<void> {
  const m = detail.value?.material;
  if (!m) return;
  busy.value = "resubmit";
  notice.value = "";
  try {
    await resubmitMaterial({ materialId: m.id, courseId: m.courseId });
    notice.value = "Reenviado a revisión.";
    await load();
  } catch (e) {
    notice.value = (e as Error).message;
  } finally {
    busy.value = "";
  }
}

onMounted(load);
</script>

<template>
  <div>
    <RouterLink to="/teacher/materials" class="back">← Materiales</RouterLink>
    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <template v-else-if="detail">
      <h1>Editar material — v{{ detail.material.version }}</h1>
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>

      <section class="panel">
        <h2>Datos generales</h2>
        <label for="title">Título</label>
        <input id="title" v-model="form.title" class="input" />
        <label for="desc">Descripción</label>
        <textarea id="desc" v-model="form.description" rows="2" class="input"></textarea>
        <label class="row"><input type="checkbox" v-model="form.requiresPrinting" /> Requiere impresión (−3 días)</label>
        <label for="classDate">Fecha de clase</label>
        <input id="classDate" v-model="form.classDate" type="date" class="input" />
        <label for="duration">Duración (min)</label>
        <input id="duration" v-model.number="form.duration" type="number" class="input" />
      </section>

      <section class="panel">
        <h2>Datos curriculares</h2>
        <label for="oa">OA (separados por coma)</label>
        <input id="oa" v-model="form.oa" class="input" />
        <label for="obj">Objetivo de la clase</label>
        <textarea id="obj" v-model="form.objective" rows="2" class="input"></textarea>
        <label for="ind">Indicadores (uno por línea)</label>
        <textarea id="ind" v-model="form.indicators" rows="3" class="input"></textarea>
      </section>

      <section class="panel">
        <h2>Contenido (secciones)</h2>
        <div v-for="(s, i) in form.sections" :key="s.id" class="block">
          <div class="row">
            <select v-model="s.kind" class="select" :aria-label="`Tipo de bloque ${i + 1}`">
              <option value="heading">Título</option>
              <option value="text">Texto</option>
              <option value="list">Lista</option>
              <option value="table">Tabla (filas «a | b | c»)</option>
              <option value="response">Espacio de respuesta</option>
            </select>
            <button class="btn btn-ghost btn-sm" @click="form.sections.splice(i, 1)">Quitar</button>
          </div>
          <textarea v-if="s.kind === 'heading' || s.kind === 'text' || s.kind === 'table'" v-model="s.text" rows="2" class="input" :placeholder="s.kind === 'table' ? 'Costo | Justificación | Impacto (una fila por línea)' : 'Texto'"></textarea>
          <textarea v-else-if="s.kind === 'list'" v-model="s.items" rows="3" class="input" placeholder="Un ítem por línea"></textarea>
        </div>
        <button class="btn btn-ghost" @click="form.sections.push({ id: blockId(), kind: 'heading', text: '', items: '' })">+ Sección</button>
      </section>

      <section class="panel">
        <h2>Ítems de evaluación</h2>
        <div v-for="(it, i) in form.items" :key="it.id" class="block">
          <div class="row">
            <select v-model="it.type" class="select" :aria-label="`Tipo de ítem ${i + 1}`">
              <option value="choice">Selección múltiple</option>
              <option value="truefalse">Verdadero/Falso</option>
              <option value="short">Respuesta breve</option>
              <option value="case">Análisis de caso</option>
              <option value="source">Análisis de fuente</option>
              <option value="graph">Interpretación de gráfico</option>
              <option value="match">Emparejamiento</option>
              <option value="fill">Completar</option>
            </select>
            <input v-model.number="it.points" type="number" min="0" class="input small-num" aria-label="Puntos" />
            <button class="btn btn-ghost btn-sm" @click="form.items.splice(i, 1)">Quitar</button>
          </div>
          <textarea v-model="it.prompt" rows="2" class="input" placeholder="Enunciado del ítem"></textarea>
          <textarea v-model="it.options" rows="3" class="input" placeholder="Alternativas (una por línea)"></textarea>
          <div class="row">
            <label>Correcta (índice 0…):</label>
            <input v-model.number="it.correctIndex" type="number" min="-1" class="input small-num" />
            <label>Justificación:</label>
            <input v-model="it.justification" class="input" />
          </div>
        </div>
        <button class="btn btn-ghost" @click="form.items.push({ id: blockId(), type: 'choice', prompt: '', points: 2, options: '', correctIndex: -1, justification: '' })">+ Ítem</button>
      </section>

      <section class="panel">
        <h2>Rúbrica</h2>
        <label for="scale">Escala (una por línea, «puntaje=etiqueta»)</label>
        <textarea id="scale" v-model="form.scale" rows="4" class="input" placeholder="4=Logrado destacado&#10;3=Logrado&#10;2=En desarrollo&#10;1=Inicial"></textarea>
        <div v-for="(c, i) in form.criteria" :key="c.id" class="block">
          <div class="row">
            <input v-model="c.name" class="input" placeholder="Criterio" />
            <button class="btn btn-ghost btn-sm" @click="form.criteria.splice(i, 1)">Quitar</button>
          </div>
          <textarea v-model="c.descriptor" rows="1" class="input" placeholder="Descriptor general"></textarea>
          <textarea v-model="c.levels" rows="4" class="input" placeholder="Niveles: «puntaje=descriptor» (una por línea)"></textarea>
        </div>
        <button class="btn btn-ghost" @click="form.criteria.push({ id: blockId(), name: '', descriptor: '', levels: '' })">+ Criterio</button>
      </section>

      <section class="panel">
        <h2>Solucionario / pauta</h2>
        <div v-for="(a, i) in form.answerKey" :key="a.itemId" class="row">
          <input v-model="a.itemId" class="input small-num" placeholder="Ítem" />
          <input v-model="a.correct" class="input" placeholder="Respuesta correcta" />
          <input v-model.number="a.points" type="number" class="input small-num" placeholder="Pts" />
          <input v-model="a.justification" class="input" placeholder="Justificación" />
          <button class="btn btn-ghost btn-sm" @click="form.answerKey.splice(i, 1)">×</button>
        </div>
        <button class="btn btn-ghost" @click="form.answerKey.push({ itemId: '', correct: '', points: 0, justification: '' })">+ Respuesta</button>
        <label for="pauta">Pauta docente</label>
        <textarea id="pauta" v-model="form.pauta" rows="3" class="input"></textarea>
      </section>

      <section class="panel">
        <h2>Tabla de especificaciones</h2>
        <div v-for="(r, i) in form.specTable" :key="r.itemId + i" class="row">
          <input v-model="r.oa" class="input small-num" placeholder="OA" />
          <input v-model="r.indicator" class="input" placeholder="Indicador" />
          <input v-model="r.skill" class="input" placeholder="Habilidad" />
          <input v-model="r.itemId" class="input small-num" placeholder="Ítem" />
          <input v-model.number="r.points" type="number" class="input small-num" placeholder="Pts" />
          <input v-model="r.level" class="input small-num" placeholder="Nivel" />
          <button class="btn btn-ghost btn-sm" @click="form.specTable.splice(i, 1)">×</button>
        </div>
        <button class="btn btn-ghost" @click="form.specTable.push({ oa: '', indicator: '', skill: '', itemId: '', points: 0, level: '' })">+ Fila</button>
      </section>

      <div class="toolbar">
        <button class="btn btn-primary" :disabled="busy === 'save'" @click="save">Guardar (v{{ detail.material.version + 1 }})</button>
        <template v-if="detail.material.status === MATERIAL_STATUS.OBSERVACIONES || detail.material.status === MATERIAL_STATUS.REQUIERE_CAMBIOS">
          <input v-model="changeSummary" class="input" placeholder="Resumen de la corrección" />
          <button class="btn btn-primary" :disabled="busy === 'correct'" @click="saveCorrect">Guardar corrección</button>
        </template>
        <button v-if="detail.material.status === MATERIAL_STATUS.CORREGIDO" class="btn btn-primary" :disabled="busy === 'resubmit'" @click="resubmit">Reenviar a revisión</button>
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
.notice {
  background: var(--color-primary-soft);
  padding: var(--space-3);
  border-radius: var(--radius);
}
.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--space-4);
  margin: var(--space-3) 0;
}
.block {
  border-top: 1px dashed var(--color-border);
  padding: var(--space-2) 0;
}
.row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
  margin: var(--space-1) 0;
}
.input,
.select {
  width: 100%;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-family: inherit;
  font-size: 0.95rem;
  margin: var(--space-1) 0;
}
.small-num {
  width: 90px;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-3) 0;
}
</style>
