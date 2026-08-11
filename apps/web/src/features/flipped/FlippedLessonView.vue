<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { FlippedLesson, FlippedProgress } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { getFlippedLesson, trackFlippedProgress } from "@/infrastructure/appDeps";
import FlippedLessonPlayer from "./FlippedLessonPlayer.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const props = defineProps<{ classId: string }>();

const session = useSessionStore();
const lesson = ref<FlippedLesson | null>(null);
const progress = ref<FlippedProgress | null>(null);
const loading = ref(true);
const error = ref("");

function actor() {
  return { uid: session.user?.uid ?? "", role: session.role, courses: session.courses };
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const result = await getFlippedLesson.run(
      { courseId: session.courseId, classId: props.classId, studentId: session.studentId },
      actor(),
    );
    lesson.value = result.lesson;
    progress.value = result.progress;
  } catch (e) {
    error.value = (e as Error).message ?? "No disponible.";
  } finally {
    loading.value = false;
  }
}

async function onTrack(payload: {
  blockId?: string;
  question?: { blockId: string; correct: boolean; score: number };
  reflection?: { blockId: string; text: string };
  markReady?: boolean;
  interactionSeconds?: number;
}): Promise<void> {
  if (!progress.value) return;
  try {
    progress.value = await trackFlippedProgress.run(
      { courseId: session.courseId, classId: props.classId, studentId: session.studentId, ...payload },
      actor(),
    );
  } catch (e) {
    error.value = (e as Error).message ?? "No se pudo guardar el progreso.";
  }
}

onMounted(load);
</script>

<template>
  <div>
    <RouterLink to="/student" class="back">← Mis misiones</RouterLink>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <template v-else-if="lesson">
      <h1>{{ lesson.title }}</h1>
      <p class="muted">{{ lesson.objective }}</p>

      <FlippedLessonPlayer :lesson-blocks="lesson.blocks" :progress="progress!" @track="onTrack" />

      <div v-if="progress?.ready" class="next-steps">
        <p class="ok">¡Aula invertida lista!</p>
        <RouterLink :to="`/student/missions/${props.classId}/activities`" class="btn btn-primary">Ir a las actividades</RouterLink>
        <RouterLink :to="`/student/missions/${props.classId}/exit-ticket`" class="btn btn-ghost">Ticket de salida</RouterLink>
        <RouterLink
          v-if="['class-01', 'class-04', 'class-07', 'class-10'].includes(props.classId)"
          :to="`/student/missions/${props.classId}/feedback`"
          class="btn btn-ghost"
        >Dar feedback</RouterLink>
        <RouterLink
          v-if="props.classId === 'class-11'"
          :to="`/student/missions/${props.classId}/project`"
          class="btn btn-ghost"
        >Proyecto Ovalle 2035</RouterLink>
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
.ok {
  color: var(--color-accent);
  font-weight: 600;
}
.next-steps {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  flex-wrap: wrap;
  margin-top: var(--space-4);
}
</style>
