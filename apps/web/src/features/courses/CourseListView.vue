<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { Course } from "@pclab/shared";
import { courseRepo } from "@/infrastructure/appDeps";
import BaseCard from "@/components/ui/BaseCard.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";
import AppEmptyState from "@/components/ui/AppEmptyState.vue";

const courses = ref<Course[]>([]);
const loading = ref(true);
const error = ref("");

const YEARS = [2026];
const SECTIONS = ["D", "E"];

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const found: Course[] = [];
    for (const year of YEARS) {
      for (const section of SECTIONS) {
        const c = await courseRepo.findBySectionYear(section, year);
        if (c) found.push(c);
      }
    }
    courses.value = found.sort((a, b) => a.section.localeCompare(b.section));
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <h1>Cursos</h1>
    <p class="muted">Educación Ciudadana · Tercero Medio · 2026</p>

    <div class="toolbar">
      <RouterLink to="/teacher/students/import" class="btn btn-primary">Importar estudiantes</RouterLink>
    </div>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />
    <AppEmptyState v-else-if="courses.length === 0" message="Aún no hay cursos creados.">
      <RouterLink to="/teacher/students/import" class="btn btn-ghost">Importar nóminas para crear los cursos</RouterLink>
    </AppEmptyState>
    <div v-else class="grid">
      <BaseCard v-for="c in courses" :key="c.id" :title="c.name">
        <h2>{{ c.name }}</h2>
        <p class="muted">{{ c.subject }} · {{ c.year }}</p>
        <RouterLink :to="`/teacher/courses/${c.id}`" class="btn btn-primary">Abrir dashboard</RouterLink>
      </BaseCard>
    </div>
  </div>
</template>

<style scoped>
.muted {
  color: var(--color-text-muted);
}
.toolbar {
  margin: var(--space-4) 0;
}
.grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
}
h2 {
  margin: 0;
}
</style>
