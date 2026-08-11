<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { Project, ProjectFields, ProjectTeam } from "@pclab/shared";
import { PROJECT_FIELD_LABELS, PROJECT_STATUS } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { getProjectForTeam, listTeams, saveProject } from "@/services/importApi";
import BaseCard from "@/components/ui/BaseCard.vue";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const props = defineProps<{ classId: string }>();

const session = useSessionStore();
const teams = ref<ProjectTeam[]>([]);
const selectedTeam = ref("");
const project = ref<Project | null>(null);
const fields = ref<ProjectFields>({ problem: "", evidence: "", territory: "", affectedPopulation: "", citizenParticipation: "", publicAgency: "", privateActor: "", resources: "", socialImpact: "", environmentalImpact: "", proposal: "" });
const loading = ref(true);
const error = ref("");
const notice = ref("");
const busy = ref(false);

const fieldKeys = Object.keys(PROJECT_FIELD_LABELS) as (keyof ProjectFields)[];

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  notice.value = "";
  try {
    teams.value = await listTeams(session.courseId);
    if (teams.value.length === 1) selectedTeam.value = teams.value[0]!.id;
    await loadProject();
  } catch (e) {
    error.value = (e as Error).message ?? "No disponible.";
  } finally {
    loading.value = false;
  }
}

async function loadProject(): Promise<void> {
  if (!selectedTeam.value) return;
  project.value = await getProjectForTeam(selectedTeam.value, props.classId, session.courseId);
  if (project.value) {
    fields.value = { ...project.value.fields };
  }
}

async function send(submit: boolean): Promise<void> {
  if (!selectedTeam.value || busy.value) return;
  busy.value = true;
  notice.value = "";
  error.value = "";
  try {
    project.value = await saveProject({
      teamId: selectedTeam.value,
      courseId: session.courseId,
      classId: props.classId,
      fields: fields.value,
      submit,
    });
    notice.value = submit ? "Proyecto entregado." : "Proyecto guardado.";
  } catch (e) {
    error.value = (e as Error).message ?? "No se pudo guardar.";
  } finally {
    busy.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <RouterLink to="/student" class="back">← Mis misiones</RouterLink>
    <h1>Proyecto Ovalle 2035</h1>
    <p class="muted">Completen los 11 campos con su equipo (Misión 11).</p>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error && !teams.length" :message="error" @retry="load" />

    <p v-else-if="teams.length === 0" class="muted">
      Tu profesora aún no te ha asignado un equipo.
    </p>

    <template v-else>
      <label for="team">Equipo</label>
      <select id="team" v-model="selectedTeam" class="select" @change="loadProject">
        <option v-for="t in teams" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>

      <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      <AppErrorState v-if="error" :message="error" />

      <div v-if="project" class="status">
        <BaseBadge :tone="project.status === PROJECT_STATUS.ENTREGADO ? 'success' : 'warning'">{{ project.status }}</BaseBadge>
      </div>

      <BaseCard class="card">
        <div v-for="key in fieldKeys" :key="key" class="field">
          <label :for="`f-${key}`">{{ PROJECT_FIELD_LABELS[key] }}</label>
          <textarea :id="`f-${key}`" v-model="fields[key]" rows="3" :disabled="project?.status === PROJECT_STATUS.ENTREGADO"></textarea>
        </div>
        <div class="toolbar">
          <button class="btn btn-ghost" :disabled="busy || project?.status === PROJECT_STATUS.ENTREGADO" @click="send(false)">Guardar</button>
          <button class="btn btn-primary" :disabled="busy || project?.status === PROJECT_STATUS.ENTREGADO" @click="send(true)">Entregar proyecto</button>
        </div>
      </BaseCard>
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
.select {
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 1rem;
  margin: var(--space-2) 0 var(--space-4);
}
.notice {
  background: var(--color-primary-soft);
  padding: var(--space-3);
  border-radius: var(--radius);
}
.card {
  margin-top: var(--space-4);
}
.field {
  margin-bottom: var(--space-3);
}
.field label {
  display: block;
  font-weight: 600;
  margin-bottom: 4px;
}
.field textarea {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-family: inherit;
  font-size: 1rem;
}
.status {
  margin: var(--space-2) 0;
}
.toolbar {
  display: flex;
  gap: var(--space-2);
}
</style>
