<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { Project } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { listProjects } from "@/services/importApi";
import BaseCard from "@/components/ui/BaseCard.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const session = useSessionStore();
const courseId = ref(session.courses[0] ?? "");
const projects = ref<Project[]>([]);
const loading = ref(true);
const error = ref("");

async function load(): Promise<void> {
  if (!courseId.value) return;
  loading.value = true;
  error.value = "";
  try {
    projects.value = (await listProjects(courseId.value, "class-12")).filter((p) => p.status !== "EN_PROGRESO");
  } catch (e) {
    error.value = (e as Error).message ?? "No disponible.";
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <h1>Feria Ciudadana Ovalle 2035</h1>
    <p class="muted">Proyectos presentados por los equipos (Misión 12).</p>

    <label for="course">Curso</label>
    <select id="course" v-model="courseId" class="select" @change="load">
      <option v-for="c in session.courses" :key="c" :value="c">{{ c }}</option>
    </select>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <p v-else-if="projects.length === 0" class="muted">Aún no hay proyectos presentados.</p>

    <div v-else class="grid">
      <BaseCard v-for="p in projects" :key="p.id" :title="p.teamId">
        <p><strong>Problema:</strong> {{ p.fields.problem }}</p>
        <p><strong>Territorio:</strong> {{ p.fields.territory }}</p>
        <p><strong>Propuesta:</strong> {{ p.fields.proposal }}</p>
        <p><strong>Actor estatal:</strong> {{ p.fields.publicAgency }}</p>
        <p><strong>Actor privado:</strong> {{ p.fields.privateActor }}</p>
        <p><strong>Participación ciudadana:</strong> {{ p.fields.citizenParticipation }}</p>
        <p><strong>Sostenibilidad:</strong> {{ p.fields.socialImpact }} · {{ p.fields.environmentalImpact }}</p>
      </BaseCard>
    </div>
  </div>
</template>

<style scoped>
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
.grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}
</style>
