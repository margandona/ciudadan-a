<script setup lang="ts">
import { computed, ref } from "vue";
import type { CandidateStudent, ImportPreview, ImportResult } from "@pclab/shared";
import { DUPLICATE_KIND, ISSUE_LEVEL } from "@pclab/shared";
import { arrayBufferToBase64, importStudents, previewStudents } from "@/services/importApi";
import { readAsArrayBuffer } from "@/lib/read-file";
import BaseCard from "@/components/ui/BaseCard.vue";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";
import AppEmptyState from "@/components/ui/AppEmptyState.vue";

const fileName = ref("");
const preview = ref<ImportPreview | null>(null);
const loading = ref(false);
const importing = ref(false);
const error = ref("");
const result = ref<ImportResult | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const selected = ref<Record<number, boolean>>({});
const previewsSelected = computed(() => preview.value?.rows.filter((r) => selected.value[r.rowIndex] ?? true) ?? []);

const summary = computed(() => preview.value?.summary ?? null);

function onFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const ok = /\.(xlsx|xls)$/i.test(file.name);
  if (!ok) {
    error.value = "Formato no soportado. Sube un archivo .xlsx o .xls.";
    return;
  }
  runPreview(file);
}

async function runPreview(file: File): Promise<void> {
  loading.value = true;
  error.value = "";
  result.value = null;
  preview.value = null;
  fileName.value = file.name;
  selected.value = {};
  try {
    const buffer = await readAsArrayBuffer(file);
    const data = arrayBufferToBase64(buffer);
    preview.value = await previewStudents(file.name, data);
  } catch (e) {
    error.value = (e as Error).message ?? "No se pudo leer el archivo.";
  } finally {
    loading.value = false;
  }
}

async function confirmImport(): Promise<void> {
  if (!preview.value || importing.value) return;
  importing.value = true;
  error.value = "";
  try {
    result.value = await importStudents(previewsSelected.value, fileName.value);
  } catch (e) {
    error.value = (e as Error).message ?? "Error al importar.";
  } finally {
    importing.value = false;
  }
}

function reset(): void {
  preview.value = null;
  result.value = null;
  error.value = "";
  fileName.value = "";
  if (fileInput.value) fileInput.value.value = "";
}

function issueText(row: CandidateStudent): string {
  return row.issues.map((i) => i.message).join(" · ") || "—";
}

function toneFor(row: CandidateStudent): "success" | "warning" | "neutral" | "danger" {
  if (row.issues.some((i) => i.level === ISSUE_LEVEL.BLOCKER)) return "danger";
  if (row.duplicateKind === DUPLICATE_KIND.POSSIBLE_DUPLICATE) return "warning";
  if (row.duplicateKind === DUPLICATE_KIND.DUPLICATE_CONFIRMED) return "warning";
  if (row.issues.length > 0) return "warning";
  return "success";
}
</script>

<template>
  <div>
    <h1>Importar estudiantes</h1>
    <p class="muted">
      Sube la nómina (.xlsx/.xls). Se mostrará una vista previa editable <strong>antes</strong> de guardar;
      el archivo original no se modifica y sus datos no se exponen públicamente.
    </p>

    <BaseCard class="upload">
      <input
        ref="fileInput"
        type="file"
        accept=".xlsx,.xls"
        data-testid="roster-input"
        @change="onFileSelected"
        :disabled="loading || importing"
      />
      <p v-if="fileName" class="muted small">Archivo: {{ fileName }}</p>
    </BaseCard>

    <SkeletonRows v-if="loading" />

    <AppErrorState v-else-if="error" :message="error" />

    <template v-else-if="preview">
      <div class="stats" aria-label="Resumen del preview">
        <BaseCard><strong>{{ summary?.totalRows ?? 0 }}</strong><span>Estudiantes</span></BaseCard>
        <BaseCard><strong>{{ summary?.courseDetected ?? "NO DETERMINADO" }}</strong><span>Curso detectado</span></BaseCard>
        <BaseCard><strong>{{ summary?.newStudents ?? 0 }}</strong><span>Nuevas</span></BaseCard>
        <BaseCard><strong>{{ summary?.duplicateConfirmed ?? 0 }}</strong><span>Duplicadas</span></BaseCard>
        <BaseCard><strong>{{ summary?.possibleDuplicate ?? 0 }}</strong><span>Posibles duplicadas</span></BaseCard>
        <BaseCard><strong>{{ summary?.withWarnings ?? 0 }}</strong><span>Con advertencias</span></BaseCard>
        <BaseCard><strong>{{ summary?.readyToImport ?? 0 }}</strong><span>Listas para importar</span></BaseCard>
      </div>

      <p v-if="summary?.sensitiveFieldsDetected" class="notice warning" role="status">
        Se detectaron {{ summary.sensitiveFieldsDetected }} columna(s) sensible(s) (p. ej. RUN) que NO se importan.
      </p>

      <div class="table-wrap">
        <table>
          <caption class="sr-only">Vista previa de la importación</caption>
          <thead>
            <tr>
              <th scope="col"><span class="sr-only">Seleccionar</span></th>
              <th scope="col">Nombre original</th>
              <th scope="col">Nombre interpretado</th>
              <th scope="col">Curso</th>
              <th scope="col">Estado</th>
              <th scope="col">Advertencias</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in preview.rows" :key="row.rowIndex" :data-testid="`row-${row.rowIndex}`">
              <td>
                <input
                  type="checkbox"
                  :checked="selected[row.rowIndex] ?? true"
                  @change="selected[row.rowIndex] = !(selected[row.rowIndex] ?? true)"
                  :aria-label="`Incluir a ${row.displayName}`"
                />
              </td>
              <td>{{ row.originalName }}</td>
              <td>
                <input
                  v-model="row.editable.displayName"
                  class="edit-name"
                  :aria-label="`Nombre interpretado de ${row.originalName}`"
                />
              </td>
              <td>{{ row.courseName || "—" }}</td>
              <td>
                <BaseBadge :tone="toneFor(row)">
                  {{ row.duplicateKind === DUPLICATE_KIND.DUPLICATE_CONFIRMED ? "Duplicada" : row.duplicateKind === DUPLICATE_KIND.POSSIBLE_DUPLICATE ? "Revisar" : "Lista" }}
                </BaseBadge>
              </td>
              <td class="issue">{{ issueText(row) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="toolbar">
        <button class="btn btn-primary" :disabled="importing || previewsSelected.length === 0" @click="confirmImport">
          {{ importing ? "Importando…" : `Importar ${previewsSelected.length} estudiante(s)` }}
        </button>
        <button class="btn btn-ghost" @click="reset">Elegir otro archivo</button>
      </div>

      <AppEmptyState v-if="result" message="Importación completada">
        <dl class="result">
          <dt>Importadas</dt><dd>{{ result.imported }}</dd>
          <dt>Actualizadas</dt><dd>{{ result.updated }}</dd>
          <dt>Desactivadas</dt><dd>{{ result.deactivated }}</dd>
          <dt>Omitidas (posibles duplicados)</dt><dd>{{ result.skippedDuplicates }}</dd>
          <dt>Cursos</dt><dd>{{ result.courseIds.join(", ") }}</dd>
        </dl>
        <RouterLink v-if="result.courseIds[0]" :to="`/teacher/courses/${result.courseIds[0]}`" class="btn btn-primary">Ver dashboard del curso</RouterLink>
      </AppEmptyState>
    </template>

    <AppEmptyState v-else message="Selecciona un archivo de nómina para comenzar." />
  </div>
</template>

<style scoped>
.muted {
  color: var(--color-text-muted);
}
.small {
  font-size: 0.85rem;
}
.upload {
  margin: var(--space-4) 0;
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-3);
  margin: var(--space-4) 0;
}
.stats strong {
  display: block;
  font-size: 1.25rem;
}
.stats span {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}
.notice {
  padding: var(--space-3);
  border-radius: var(--radius);
}
.notice.warning {
  background: #fdf3e0;
  color: var(--color-warning);
}
.table-wrap {
  overflow-x: auto;
  margin: var(--space-3) 0;
}
table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.92rem;
}
th,
td {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
}
th {
  background: var(--color-primary-soft);
}
.edit-name {
  width: 100%;
  min-width: 180px;
  padding: 4px 8px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
}
.issue {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  min-width: 180px;
}
.toolbar {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  flex-wrap: wrap;
}
.result {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-2);
  text-align: left;
  margin: 0 auto var(--space-4);
  max-width: 360px;
}
.result dt {
  color: var(--color-text-muted);
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
