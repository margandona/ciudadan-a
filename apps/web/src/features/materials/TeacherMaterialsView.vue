<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import type { Material } from "@pclab/shared";
import { MATERIAL_STATUS, MATERIAL_STATUS_LABELS, MATERIAL_TYPE } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import {
  addMaterialVersion,
  archiveMaterial,
  downloadAllMaterials,
  downloadMaterial,
  duplicateMaterial,
  generateMaterial,
  listMaterialsForTeacher,
  readyToPrintMaterial,
  sendMaterialForReview,
} from "@/services/importApi";
import BaseCard from "@/components/ui/BaseCard.vue";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

interface VersionForm {
  kind: string;
  fileName: string;
  url: string;
  note: string;
  evaluatorEmail: string;
  pieEmail: string;
  utpEmail: string;
}

const session = useSessionStore();
const router = useRouter();
const courseId = ref(session.courses[0] ?? "");
const materials = ref<Material[]>([]);
const loading = ref(true);
const error = ref("");
const notice = ref("");

const genForm = ref({ type: MATERIAL_TYPE.GUIDE, title: "", classId: "", classDate: "", requiresPrinting: true });
const versionForm = ref<Record<string, VersionForm>>({});
const busy = ref("");

function vf(materialId: string): VersionForm {
  const existing = versionForm.value[materialId];
  if (existing) return existing;
  const created: VersionForm = { kind: "GENERAL", fileName: "", url: "", note: "", evaluatorEmail: "", pieEmail: "", utpEmail: "" };
  versionForm.value[materialId] = created;
  return created;
}

async function load(): Promise<void> {
  if (!courseId.value) return;
  loading.value = true;
  error.value = "";
  notice.value = "";
  try {
    materials.value = await listMaterialsForTeacher(courseId.value);
    versionForm.value = {};
    for (const m of materials.value) vf(m.id);
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

function tone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === MATERIAL_STATUS.APROBADO_FINAL || status === MATERIAL_STATUS.READY_TO_PRINT || status === MATERIAL_STATUS.APROBADO) return "success";
  if (status === MATERIAL_STATUS.RECHAZADO) return "danger";
  if (status === MATERIAL_STATUS.ARCHIVED) return "neutral";
  return "warning";
}

async function generate(): Promise<void> {
  busy.value = "generate";
  notice.value = "";
  try {
    const m = await generateMaterial({
      courseId: courseId.value,
      type: genForm.value.type,
      title: genForm.value.title,
      classId: genForm.value.classId || undefined,
      classDate: genForm.value.classDate ? new Date(genForm.value.classDate + "T18:00:00").toISOString() : null,
      requiresPrinting: genForm.value.requiresPrinting,
    });
    genForm.value = { type: MATERIAL_TYPE.GUIDE, title: "", classId: "", classDate: "", requiresPrinting: true };
    notice.value = "Material generado como borrador (v1). Edítalo antes de enviar.";
    await load();
    await router.push(`/teacher/materials/${m.id}/edit`);
  } catch (e) {
    notice.value = (e as Error).message;
  } finally {
    busy.value = "";
  }
}

async function addVersion(material: Material): Promise<void> {
  const f = vf(material.id);
  if (!f.fileName) {
    notice.value = "Ingresa el nombre del archivo.";
    return;
  }
  busy.value = `v-${material.id}`;
  notice.value = "";
  try {
    await addMaterialVersion({
      materialId: material.id,
      courseId: material.courseId,
      kind: f.kind,
      fileName: f.fileName,
      url: f.url || undefined,
      note: f.note || undefined,
    });
    f.fileName = "";
    f.url = "";
    f.note = "";
    notice.value = "Versión agregada.";
    await load();
  } catch (e) {
    notice.value = (e as Error).message;
  } finally {
    busy.value = "";
  }
}

async function send(material: Material): Promise<void> {
  const f = vf(material.id);
  if (!f.evaluatorEmail) {
    notice.value = "Ingresa el correo de la evaluadora.";
    return;
  }
  busy.value = `s-${material.id}`;
  notice.value = "";
  try {
    await sendMaterialForReview({
      materialId: material.id,
      courseId: material.courseId,
      evaluatorEmail: f.evaluatorEmail,
      pieEmail: f.pieEmail || undefined,
      utpEmail: f.utpEmail || undefined,
    });
    notice.value = "Enviado a revisión institucional.";
    await load();
  } catch (e) {
    notice.value = (e as Error).message;
  } finally {
    busy.value = "";
  }
}

async function duplicate(material: Material): Promise<void> {
  busy.value = `d-${material.id}`;
  notice.value = "";
  try {
    await duplicateMaterial({ materialId: material.id, courseId: material.courseId });
    notice.value = "Material duplicado (nuevo borrador).";
    await load();
  } catch (e) {
    notice.value = (e as Error).message;
  } finally {
    busy.value = "";
  }
}

async function archive(material: Material): Promise<void> {
  busy.value = `a-${material.id}`;
  notice.value = "";
  try {
    await archiveMaterial({ materialId: material.id, courseId: material.courseId });
    notice.value = "Material archivado.";
    await load();
  } catch (e) {
    notice.value = (e as Error).message;
  } finally {
    busy.value = "";
  }
}

async function print(material: Material): Promise<void> {
  busy.value = `p-${material.id}`;
  notice.value = "";
  try {
    await readyToPrintMaterial({ materialId: material.id, courseId: material.courseId });
    notice.value = "Material listo para imprimir.";
    await load();
  } catch (e) {
    notice.value = (e as Error).message;
  } finally {
    busy.value = "";
  }
}

async function download(material: Material, kind: "PDF" | "DOCX"): Promise<void> {
  busy.value = `dl-${material.id}`;
  notice.value = "";
  try {
    const file = await downloadMaterial(material.id, kind);
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

async function downloadAll(kind: "PDF" | "DOCX"): Promise<void> {
  busy.value = `all-${kind}`;
  notice.value = "";
  try {
    const file = await downloadAllMaterials(courseId.value, kind);
    const bytes = Uint8Array.from(atob(file.buffer), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    notice.value = `ZIP descargado con todo el material (${kind}). Incluye un índice ordenado por fases.`;
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
    <h1>Materiales</h1>
    <p class="muted">Guías, evaluaciones y rúbricas con flujo de revisión institucional (evaluadora · PIE · UTP).</p>

    <label for="course">Curso</label>
    <select id="course" v-model="courseId" class="select" @change="load">
      <option v-for="c in session.courses" :key="c" :value="c">{{ c }}</option>
    </select>

    <div class="row download-all">
      <button class="btn btn-primary btn-sm" :disabled="busy === 'all-PDF'" @click="downloadAll('PDF')">Descargar todo (PDF)</button>
      <button class="btn btn-ghost btn-sm" :disabled="busy === 'all-DOCX'" @click="downloadAll('DOCX')">Descargar todo (DOCX)</button>
      <span class="muted small">Un ZIP por formato, ordenado por fases, con índice para evaluadora · PIE · UTP.</span>
    </div>

    <p v-if="notice" class="notice" role="status">{{ notice }}</p>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <template v-else>
      <BaseCard class="create" title="Generar material (borrador)">
        <div class="row">
          <select v-model="genForm.type" class="select" aria-label="Tipo de material">
            <option value="GUIDE">GENERAR GUÍA</option>
            <option value="WRITTEN_TEST">GENERAR PRUEBA</option>
            <option value="RUBRIC">GENERAR RÚBRICA</option>
            <option value="SCORING_GUIDE">GENERAR PAUTA</option>
            <option value="DUA_VERSION">GENERAR VERSIÓN DUA</option>
            <option value="PIE_VERSION">GENERAR VERSIÓN PIE</option>
            <option value="ASSESSMENT">Evaluación</option>
            <option value="ANSWER_KEY">Solucionario</option>
            <option value="READING">Lectura</option>
            <option value="WORKSHEET">Hoja de trabajo</option>
            <option value="EXIT_TICKET">Ticket de salida</option>
            <option value="SUPPORT_MATERIAL">Material complementario</option>
          </select>
          <input v-model="genForm.title" class="input" placeholder="Título (p. ej. Guía 04 — Cartografía social)" />
          <select v-model="genForm.classId" class="select" aria-label="Clase">
            <option value="">Sin clase</option>
            <option v-for="n in 12" :key="n" :value="`class-${String(n).padStart(2, '0')}`">Clase {{ n }}</option>
          </select>
          <input v-model="genForm.classDate" type="date" class="input" aria-label="Fecha de clase (calcula plazos −3/−7 días)" />
          <label class="row"><input type="checkbox" v-model="genForm.requiresPrinting" /> Requiere impresión</label>
          <button class="btn btn-primary" :disabled="busy === 'generate' || !genForm.title" @click="generate">Generar</button>
        </div>
      </BaseCard>

      <BaseCard v-for="material in materials" :key="material.id" class="material">
        <div class="head">
          <h2>{{ material.title }}</h2>
          <BaseBadge :tone="tone(material.status)">{{ MATERIAL_STATUS_LABELS[material.status] }}</BaseBadge>
        </div>
        <p class="muted small">
          v{{ material.version }} · {{ material.type }} · {{ material.classId ?? "sin clase" }}
          <template v-if="material.hasDUA"> · con DUA</template>
          <template v-if="material.sentAt"> · enviado {{ material.sentAt.slice(0, 10) }}</template>
          <template v-if="material.reviewDeadline"> · revisión límite {{ material.reviewDeadline.slice(0, 10) }}</template>
          <template v-if="material.printDeadline"> · impresión límite {{ material.printDeadline.slice(0, 10) }}</template>
        </p>

        <div class="actions">
          <RouterLink :to="`/teacher/materials/${material.id}`" class="btn btn-ghost btn-sm">Ver</RouterLink>
          <RouterLink :to="`/teacher/materials/${material.id}/edit`" class="btn btn-ghost btn-sm">Editar</RouterLink>
          <button class="btn btn-ghost btn-sm" :disabled="busy === `dl-${material.id}`" @click="download(material, 'PDF')">PDF</button>
          <button class="btn btn-ghost btn-sm" :disabled="busy === `dl-${material.id}`" @click="download(material, 'DOCX')">DOCX</button>
          <button class="btn btn-ghost btn-sm" :disabled="busy === `d-${material.id}`" @click="duplicate(material)">Duplicar</button>
          <button class="btn btn-ghost btn-sm" :disabled="busy === `a-${material.id}`" @click="archive(material)">Archivar</button>
          <button
            v-if="material.status === MATERIAL_STATUS.APROBADO_FINAL"
            class="btn btn-primary btn-sm"
            :disabled="busy === `p-${material.id}`"
            @click="print(material)"
          >
            Listo para imprimir
          </button>
        </div>

        <div class="row">
          <input v-model="vf(material.id).fileName" class="input" placeholder="Nombre del archivo (ej. guia-03.pdf)" />
          <select v-model="vf(material.id).kind" class="select" :aria-label="`Tipo de versión de ${material.title}`">
            <option value="GENERAL">General</option>
            <option value="DUA">DUA</option>
            <option value="PIE">PIE</option>
          </select>
          <input v-model="vf(material.id).url" class="input" placeholder="URL del archivo (opcional)" />
          <button class="btn btn-ghost btn-sm" :disabled="busy === `v-${material.id}`" @click="addVersion(material)">+ Versión</button>
        </div>

        <div class="row send">
          <input v-model="vf(material.id).evaluatorEmail" class="input" placeholder="Evaluadora (evaluador@demo.cl)" aria-label="Correo de la evaluadora" />
          <input v-model="vf(material.id).pieEmail" class="input" placeholder="PIE (opcional)" aria-label="Correo PIE" />
          <input v-model="vf(material.id).utpEmail" class="input" placeholder="UTP (opcional)" aria-label="Correo UTP" />
          <button
            class="btn btn-primary btn-sm"
            :disabled="busy === `s-${material.id}` || material.status !== MATERIAL_STATUS.BORRADOR && material.status !== MATERIAL_STATUS.LISTO_PARA_REVISION"
            @click="send(material)"
          >
            Enviar a revisión
          </button>        </div>
      </BaseCard>

      <p v-if="materials.length === 0" class="muted">Aún no hay materiales en este curso. Genera el primero arriba.</p>
    </template>
  </div>
</template>

<style scoped>
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
.select,
.input {
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.92rem;
}
.create {
  margin: var(--space-4) 0;
}
.row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}
.material {
  margin: var(--space-3) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.head {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  justify-content: space-between;
}
.actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.send input {
  min-width: 180px;
}
.btn-sm {
  padding: 6px 12px;
}
.download-all {
  margin: var(--space-3) 0;
}
</style>
