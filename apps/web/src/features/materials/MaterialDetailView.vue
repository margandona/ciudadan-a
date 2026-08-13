<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  APPROVAL_STATUS,
  MATERIAL_STATUS,
  MATERIAL_STATUS_LABELS,
  type Material,
  type MaterialApproval,
  type MaterialContent,
  type MaterialDetail,
  type MaterialStatus,
} from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import {
  approveMaterial,
  archiveMaterial,
  correctMaterial,
  downloadMaterial,
  getMaterialDetail,
  readyToPrintMaterial,
  resubmitMaterial,
  resolveComment,
} from "@/services/importApi";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const props = defineProps<{ materialId: string }>();

const session = useSessionStore();
const detail = ref<MaterialDetail | null>(null);
const loading = ref(true);
const error = ref("");
const notice = ref("");
const busy = ref("");
const comment = ref("");
const decision = ref<"APROBADO" | "CON_OBSERVACIONES" | "SOLICITA_CAMBIOS">("APROBADO");
const section = ref("");
const changeSummary = ref("");

const role = computed(() => session.role);
// Accesos no nulos: el template solo los usa dentro de `v-else-if="detail"`.
const m = computed<Material>(() => {
  const d = detail.value;
  if (!d) throw new Error("Detalle aún no cargado.");
  return d.material;
});
const comments = computed(() => detail.value?.comments ?? []);
const versions = computed(() => detail.value?.versions ?? []);
const approvals = computed(() => detail.value?.approvals ?? []);
const approvalByRole = computed<Record<string, MaterialApproval>>(() => {
  const map: Record<string, MaterialApproval> = {};
  for (const a of approvals.value) map[a.role] = a;
  return map;
});

function approvalLabel(a: MaterialApproval | undefined): string {
  if (!a) return "Pendiente";
  switch (a.status) {
    case APPROVAL_STATUS.APROBADO:
      return "Aprobado";
    case APPROVAL_STATUS.CON_OBSERVACIONES:
      return "Con observaciones";
    case APPROVAL_STATUS.SOLICITA_CAMBIOS:
      return "Solicita cambios";
    default:
      return "Pendiente";
  }
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    detail.value = await getMaterialDetail(props.materialId);
  } catch (e) {
    error.value = (e as Error).message ?? "No disponible.";
  } finally {
    loading.value = false;
  }
}

async function act(action: string, fn: () => Promise<unknown>): Promise<void> {
  busy.value = action;
  notice.value = "";
  try {
    await fn();
    await load();
  } catch (e) {
    notice.value = (e as Error).message;
  } finally {
    busy.value = "";
  }
}

async function submitReview(): Promise<void> {
  const m = detail.value?.material;
  if (!m) return;
  await act("approve", () =>
    approveMaterial({ materialId: m.id, courseId: m.courseId, decision: decision.value, comment: comment.value, section: section.value || undefined }),
  );
}

async function submitCorrect(): Promise<void> {
  const m = detail.value?.material;
  if (!m) return;
  await act("correct", () =>
    correctMaterial({ materialId: m.id, courseId: m.courseId, content: m.content ?? { sections: [] }, changeSummary: changeSummary.value }),
  );
}

async function download(kind: "PDF" | "DOCX"): Promise<void> {
  const m = detail.value?.material;
  if (!m) return;
  busy.value = `dl-${kind}`;
  notice.value = "";
  try {
    const file = await downloadMaterial(m.id, kind);
    const bytes = Uint8Array.from(atob(file.buffer), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: file.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    notice.value = (e as Error).message;
  } finally {
    busy.value = "";
  }
}

function isReviewer(): boolean {
  return role.value === "EVALUADOR" || role.value === "PIE" || role.value === "UTP";
}

function canReview(): boolean {
  const material = m.value;
  if (!material || !isReviewer()) return false;
  const mine = material.evaluatorId === session.user?.uid || material.pieReviewerId === session.user?.uid || material.utpReviewerId === session.user?.uid;
  return mine && (material.status === MATERIAL_STATUS.EN_REVISION || material.status === MATERIAL_STATUS.REENVIADO);
}

function content(): MaterialContent | undefined {
  return m.value?.content;
}

onMounted(load);
</script>

<template>
  <div>
    <RouterLink :to="isReviewer() ? (role === 'PIE' ? '/pie' : role === 'UTP' ? '/utp' : '/evaluator') : '/teacher/materials'" class="back">← Volver</RouterLink>
    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <template v-else-if="detail">
      <h1>{{ m.title }}</h1>
      <div class="meta">
        <BaseBadge :tone="m.status === MATERIAL_STATUS.APROBADO_FINAL || m.status === MATERIAL_STATUS.READY_TO_PRINT ? 'success' : 'warning'">
          {{ MATERIAL_STATUS_LABELS[m.status as MaterialStatus] }}
        </BaseBadge>
        <span class="muted small">v{{ m.version }} · {{ m.type }} · {{ m.classId ?? "sin clase" }}</span>
      </div>

      <p v-if="notice" class="notice" role="status">{{ notice }}</p>

      <div class="toolbar">
        <button class="btn btn-ghost btn-sm" :disabled="busy === 'dl-PDF'" @click="download('PDF')">Descargar PDF</button>
        <button class="btn btn-ghost btn-sm" :disabled="busy === 'dl-DOCX'" @click="download('DOCX')">Descargar DOCX</button>
        <RouterLink v-if="session.role === 'PROFESOR' || session.role === 'ADMIN' || session.role === 'MASTER'" :to="`/teacher/materials/${m.id}/edit`" class="btn btn-ghost btn-sm">Editar</RouterLink>
        <button
          v-if="m.status === MATERIAL_STATUS.APROBADO_FINAL"
          class="btn btn-primary btn-sm"
          :disabled="busy === 'print'"
          @click="act('print', () => readyToPrintMaterial({ materialId: m.id, courseId: m.courseId }))"
        >
          Marcar listo para imprimir
        </button>
        <button
          v-if="m.status === MATERIAL_STATUS.CORREGIDO"
          class="btn btn-primary btn-sm"
          :disabled="busy === 'resubmit'"
          @click="act('resubmit', () => resubmitMaterial({ materialId: m.id, courseId: m.courseId }))"
        >
          Reenviar a revisión
        </button>
        <button
          v-if="m.status === MATERIAL_STATUS.OBSERVACIONES || m.status === MATERIAL_STATUS.REQUIERE_CAMBIOS"
          class="btn btn-primary btn-sm"
          :disabled="busy === 'correct'"
          @click="submitCorrect"
        >
          Guardar corrección (v{{ m.version + 1 }})
        </button>
        <button class="btn btn-ghost btn-sm" :disabled="busy === 'archive'" @click="act('archive', () => archiveMaterial({ materialId: m.id, courseId: m.courseId }))">
          Archivar
        </button>
      </div>

      <div class="grid">
        <section class="panel" aria-label="Datos curriculares">
          <h2>Datos curriculares</h2>
          <p class="muted small">OA: {{ content()?.curricular?.oa?.join(", ") ?? m.oaIds?.join(", ") ?? "—" }}</p>
          <p class="muted small">Objetivo: {{ content()?.curricular?.objective ?? m.classObjective ?? "—" }}</p>
          <p class="muted small">Indicadores: {{ content()?.curricular?.indicators?.join("; ") ?? m.indicators?.join("; ") ?? "—" }}</p>
          <p class="muted small">Fecha de clase: {{ m.classDate?.slice(0, 10) ?? "—" }} · Revisión límite: {{ m.reviewDeadline?.slice(0, 10) ?? "—" }} · Impresión límite: {{ m.printDeadline?.slice(0, 10) ?? "—" }}</p>
        </section>

        <section class="panel" aria-label="Aprobaciones">
          <h2>Revisiones</h2>
          <div v-for="r in ['EVALUADOR', 'PIE', 'UTP']" :key="r" class="row">
            <strong class="muted small">{{ r }}</strong>
            <BaseBadge :tone="approvalByRole[r]?.status === APPROVAL_STATUS.APROBADO ? 'success' : approvalByRole[r] ? 'warning' : 'neutral'">
              {{ approvalLabel(approvalByRole[r]) }}
            </BaseBadge>
          </div>
        </section>
      </div>

      <section class="panel" aria-label="Documento">
        <h2>Documento</h2>
        <div class="doc">
          <div v-if="content()?.contenido?.length" class="contenido">
            <h3>Contenido / Lectura</h3>
            <p v-for="(para, i) in content()!.contenido" :key="i">{{ para }}</p>
          </div>
          <template v-if="content()?.sections.length">
            <div v-for="s in content()!.sections" :key="s.id">
              <h3 v-if="s.kind === 'heading'">{{ s.text }}</h3>
              <ol v-else-if="s.kind === 'list'"><li v-for="(it, i) in s.items" :key="i">{{ it }}</li></ol>
              <table v-else-if="s.kind === 'table' && s.table" class="table-wrap">
                <thead><tr><th v-for="(h, i) in s.table.headers" :key="i" scope="col">{{ h }}</th></tr></thead>
                <tbody><tr v-for="(row, i) in s.table.rows" :key="i"><td v-for="(cell, j) in row.cells" :key="j">{{ cell }}</td></tr></tbody>
              </table>
              <p v-else>{{ s.text }}</p>
            </div>
          </template>
          <p v-else class="muted">Sin contenido cargado.</p>
        </div>
        <div v-if="content()?.items?.length" class="doc">
          <h3>Ítems</h3>
          <div v-for="item in content()!.items" :key="item.id" class="item">
            <p><strong>{{ item.points }} pts</strong> — {{ item.prompt }}</p>
            <ul v-if="item.options"><li v-for="(o, i) in item.options" :key="i">{{ String.fromCharCode(97 + i) }}) {{ o }}</li></ul>
          </div>        </div>
        <div v-if="content()?.rubric" class="doc">
          <h3>Rúbrica</h3>
          <p class="muted small">Escala: {{ content()!.rubric!.scale.map((l) => `${l.score} = ${l.label}`).join(" · ") }}</p>
          <ul v-for="c in content()!.rubric!.criteria" :key="c.id"><li><strong>{{ c.name }}</strong>: {{ c.descriptor }}</li></ul>
        </div>
        <div v-if="content()?.specTable?.length" class="doc">
          <h3>Tabla de especificaciones</h3>
          <table class="table-wrap">
            <thead><tr><th scope="col">OA</th><th scope="col">Indicador</th><th scope="col">Habilidad</th><th scope="col">Ítem</th><th scope="col">Pts</th><th scope="col">Nivel</th></tr></thead>
            <tbody><tr v-for="row in content()!.specTable" :key="row.itemId"><td>{{ row.oa }}</td><td>{{ row.indicator }}</td><td>{{ row.skill }}</td><td>{{ row.itemId }}</td><td>{{ row.points }}</td><td>{{ row.level }}</td></tr></tbody>
          </table>
        </div>
        <div v-if="content()?.answerKey?.length" class="doc">
          <h3>Solucionario</h3>
          <ul v-for="a in content()!.answerKey" :key="a.itemId"><li><strong>{{ a.itemId }}</strong>: {{ a.correct }} ({{ a.points }} pts) — {{ a.justification }}</li></ul>
        </div>
        <div v-if="content()?.pauta" class="doc"><h3>Pauta</h3><p>{{ content()!.pauta }}</p></div>
        <div v-if="content()?.referencias?.length" class="doc">
          <h3>Referencias</h3>
          <ul><li v-for="(r, i) in content()!.referencias" :key="i">{{ r }}</li></ul>
        </div>
      </section>

      <section class="panel" aria-label="Comentarios">
        <h2>Comentarios</h2>
        <div v-for="c in comments" :key="c.id" class="comment">
          <p>{{ c.text }}</p>
          <span class="muted small">{{ c.role }} · {{ c.at.slice(0, 10) }}<template v-if="c.section"> · sección: {{ c.section }}</template></span>
          <button v-if="!c.resolved && (session.role === 'PROFESOR' || session.role === 'ADMIN' || session.role === 'MASTER')" class="btn btn-ghost btn-sm" @click="act('resolve', () => resolveComment({ materialId: m.id, commentId: c.id }))">
            Resolver
          </button>
          <BaseBadge v-if="c.resolved" tone="success">Resuelto</BaseBadge>
        </div>
        <p v-if="comments.length === 0" class="muted small">Sin comentarios.</p>
      </section>

      <section class="panel" aria-label="Revisión" v-if="canReview()">
        <h2>Revisión ({{ role }})</h2>
        <label for="review-comment">Comentario</label>
        <textarea id="review-comment" v-model="comment" rows="4" class="input"></textarea>
        <label for="review-section">Sección (opcional)</label>
        <input id="review-section" v-model="section" class="input" placeholder="p. ej. Ítem 3, Instrucciones, Rúbrica…" />
        <label for="review-decision">Decisión</label>
        <select id="review-decision" v-model="decision" class="select">
          <option value="APROBADO">Aprobar</option>
          <option value="CON_OBSERVACIONES">Con observaciones</option>
          <option value="SOLICITA_CAMBIOS">Solicitar cambios</option>
        </select>
        <button class="btn btn-primary" :disabled="busy === 'approve'" @click="submitReview">Registrar revisión</button>
      </section>

      <section class="panel" aria-label="Versiones">
        <h2>Historial de versiones</h2>
        <ul>
          <li v-for="v in versions" :key="v.id">v{{ v.version }} — {{ v.kind }} · {{ v.note ?? v.changeSummary ?? "" }} · {{ v.uploadedAt?.slice(0, 10) }}</li>
        </ul>
        <p v-if="versions.length === 0" class="muted small">Sin versiones registradas.</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.back {
  text-decoration: none;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
.meta {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin: var(--space-2) 0;
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
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-3) 0;
}
.grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  margin: var(--space-3) 0;
}
.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--space-4);
  margin: var(--space-3) 0;
}
.row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin: var(--space-1) 0;
}
.doc p {
  line-height: 1.5;
}
.item {
  border-top: 1px dashed var(--color-border);
  padding: var(--space-2) 0;
}
.item p {
  white-space: pre-line;
}
.table-wrap {
  display: block;
  width: 100%;
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
th,
td {
  border: 1px solid var(--color-border);
  padding: 4px 8px;
  text-align: left;
}
.comment {
  border-top: 1px dashed var(--color-border);
  padding: var(--space-2) 0;
}
.input,
.select {
  width: 100%;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-family: inherit;
  font-size: 0.95rem;
  margin: var(--space-2) 0;
}
</style>
