<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { ClassDashboard, ParticipationOverview } from "@pclab/shared";
import { PARTICIPATION_SKILLS } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { getClassDashboard, getParticipationOverview } from "@/services/importApi";
import BaseCard from "@/components/ui/BaseCard.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const props = defineProps<{ classId: string }>();

const session = useSessionStore();
const courseId = ref(session.courses[0] ?? "");
const dashboard = ref<ClassDashboard | null>(null);
const participation = ref<ParticipationOverview | null>(null);
const loading = ref(true);
const error = ref("");

async function load(): Promise<void> {
  if (!courseId.value) return;
  loading.value = true;
  error.value = "";
  try {
    [dashboard.value, participation.value] = await Promise.all([
      getClassDashboard(courseId.value, props.classId),
      getParticipationOverview(courseId.value, props.classId),
    ]);
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
    <RouterLink to="/teacher/classes" class="back">← Clases</RouterLink>
    <h1>Dashboard — {{ props.classId }}</h1>

    <div class="toolbar">
      <RouterLink :to="`/teacher/live/${props.classId}`" class="btn btn-primary">Registro de participación en vivo</RouterLink>
      <RouterLink :to="`/teacher/classes/${props.classId}/submissions`" class="btn btn-ghost">Evidencias</RouterLink>
      <RouterLink :to="`/teacher/classes/${props.classId}/quizzes`" class="btn btn-ghost">Quizzes</RouterLink>
    </div>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <template v-else-if="dashboard">
      <div class="stats">
        <BaseCard><strong>{{ dashboard.flippedCompleted }}/{{ dashboard.flippedTotal }}</strong><span>Aula invertida lista</span></BaseCard>
        <BaseCard><strong>{{ dashboard.flippedPercent }}%</strong><span>Avance flipped</span></BaseCard>
        <BaseCard><strong>{{ dashboard.submissions }}</strong><span>Evidencias</span></BaseCard>
        <BaseCard><strong>{{ dashboard.exitTickets }}</strong><span>Tickets de salida</span></BaseCard>
        <BaseCard><strong>{{ dashboard.participation }}</strong><span>Registros de participación</span></BaseCard>
        <BaseCard><strong>{{ dashboard.avgDifficulty ?? "—" }}</strong><span>Dificultad percibida (1–5)</span></BaseCard>
      </div>

      <h2 class="section">Participación por habilidad</h2>
      <div v-if="participation" class="skills">
        <BaseCard v-for="skill of PARTICIPATION_SKILLS" :key="skill">
          <strong>{{ participation.bySkill[skill].count }}</strong>
          <span>{{ skill }} · media {{ participation.bySkill[skill].avg }}</span>
        </BaseCard>
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
.toolbar {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin: var(--space-4) 0;
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: var(--space-3);
}
.stats strong {
  display: block;
  font-size: 1.4rem;
}
.stats span {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}
.section {
  margin-top: var(--space-5);
}
.skills {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--space-2);
}
.skills strong {
  display: block;
  font-size: 1.1rem;
}
.skills span {
  color: var(--color-text-muted);
  font-size: 0.8rem;
}
</style>
