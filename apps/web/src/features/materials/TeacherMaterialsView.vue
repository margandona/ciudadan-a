<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { Material } from "@pclab/shared";
import { MATERIAL_STATUS, MATERIAL_STATUS_LABELS } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { addMaterialVersion, createMaterial, listMaterialsForTeacher, sendMaterialForReview } from "@/services/importApi";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

interface VersionForm {
  kind: string;
  fileName: string;
  url: string;
  note: string;
  evaluatorEmail: string;
}

const session = useSessionStore();
const courseId = ref(session.courses[0] ?? "");
const materials = ref<Material[]>([]);
const loading = ref(true);
const error = ref("");
const notice = ref("");

const createForm = ref({ type: "guia", title: "", hasDUA: false, printDeadline: "", reviewDeadline: "" });
const versionForm = ref<Record<string, VersionForm>>({});
const busy = ref("");

function vf(materialId: string): VersionForm {
  const existing = versionForm.value[materialId];
  if (existing) return existing;
  const created: VersionForm = { kind: "GENERAL", fileName: "", url: "", note: "", evaluatorEmail: "" };
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

function tone(status: string): "success" | "warning" | "neutral" {
  if (status === MATERIAL_STATUS.APROBADO) return "success";
  if (status === MATERIAL_STATUS.BORRADOR || status === MATERIAL_STATUS.EN_REVISION) return "warning";
  return "neutral";
}

async function create(): Promise<void> {
  busy.value = "create";
  notice.value = "";
  try {
    await createMaterial({
      courseId: courseId.value,
      type: createForm.value.type as Material["type"],
      title: createForm.value.title,
      hasDUA: createForm.value.hasDUA,
      printDeadline: createForm.value.printDeadline ? new Date(createForm.value.printDeadline).toISOString() : null,
      reviewDeadline: createForm.value.reviewDeadline ? new Date(createForm.value.reviewDeadline).toISOString() : null,
    });
    createForm.value = { type: "guia", title: "", hasDUA: false, printDeadline: "", reviewDeadline: "" };
    notice.value = "Material creado.";
    await load();
  } catch (e) {
    notice.value = (e as Error).message;
  } finally {
    busy.value = "";
  }
}

async function addVersion(material: Material): Promise<void> {
  const f = vf(material.id);
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
  const email = vf(material.id).evaluatorEmail;
  if (!email) {
    notice.value = "Ingresa el correo del evaluador.";
    return;
  }
  busy.value = `s-${material.id}`;
  notice.value = "";
  try {
    await sendMaterialForReview({ materialId: material.id, courseId: material.courseId, evaluatorEmail: email });
    notice.value = "Enviado a revisión.";
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
    <h1>Materiales</h1>
    <p class="muted">Guías, evaluaciones y rúbricas con versiones GENERAL y DUA/adecuada.</p>

    <label for="course">Curso</label>
    <select id="course" v-model="courseId" class="select" @change="load">
      <option v-for="c in session.courses" :key="c" :value="c">{{ c }}</option>
    </select>

    <p v-if="notice" class="notice" role="status">{{ notice }}</p>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <template v-else>
      <BaseCard class="create" :title="'Nuevo material'">
        <form class="form" @submit.prevent="create">
          <select v-model="createForm.type" class="select" aria-label="Tipo de material">
            <option value="guia">Guía</option>
            <option value="evaluacion">Evaluación</option>
            <option value="rubrica">Rúbrica</option>
            <option value="pauta">Pauta</option>
            <option value="solucionario">Solucionario</option>
            <option value="lectura">Lectura</option>
            <option value="complementario">Complementario</option>
          </select>
          <input v-model="createForm.title" class="input" placeholder="Título" required />
          <label class="row"><input type="checkbox" v-model="createForm.hasDUA" /> Tiene versión DUA</label>
          <input v-model="createForm.printDeadline" type="date" class="input" aria-label="Plazo de impresión" />
          <input v-model="createForm.reviewDeadline" type="date" class="input" aria-label="Plazo de envío al evaluador" />
          <button class="btn btn-primary" :disabled="busy === 'create'">Crear material</button>
        </form>
      </BaseCard>

      <BaseCard v-for="material in materials" :key="material.id" class="material">
        <div class="head">
          <h2>{{ material.title }}</h2>
          <BaseBadge :tone="tone(material.status)">{{ MATERIAL_STATUS_LABELS[material.status] }}</BaseBadge>
        </div>
        <p class="muted small">
          {{ material.type }} · {{ material.hasDUA ? "con DUA" : "general" }}
          <template v-if="material.sentAt"> · enviado {{ material.sentAt.slice(0, 10) }}</template>
          <template v-if="material.reviewAt"> · revisado {{ material.reviewAt.slice(0, 10) }}</template>
        </p>

        <div class="row">
          <input v-model="vf(material.id).fileName" class="input" placeholder="Nombre del archivo (ej. guia-03.pdf)" />
          <select v-model="vf(material.id).kind" class="select" :aria-label="`Tipo de versión de ${material.title}`">
            <option value="GENERAL">General</option>
            <option value="DUA">DUA</option>
          </select>
          <input v-model="vf(material.id).url" class="input" placeholder="URL del archivo (opcional)" />
          <button class="btn btn-ghost btn-sm" :disabled="busy === `v-${material.id}`" @click="addVersion(material)">+ Versión</button>
        </div>

        <div class="row">
          <input v-model="vf(material.id).evaluatorEmail" class="input" placeholder="Correo del evaluador (evaluador@demo.cl)" />
          <button
            class="btn btn-primary btn-sm"
            :disabled="material.status !== MATERIAL_STATUS.BORRADOR || busy === `s-${material.id}`"
            @click="send(material)"
          >
            Enviar a revisión
          </button>
        </div>
      </BaseCard>

      <p v-if="materials.length === 0" class="muted">Aún no hay materiales en este curso.</p>
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
.form,
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
.row input {
  min-width: 220px;
}
.btn-sm {
  padding: 6px 12px;
}
</style>
