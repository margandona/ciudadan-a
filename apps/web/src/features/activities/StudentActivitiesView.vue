<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { Activity, Submission } from "@pclab/shared";
import { SUBMISSION_STATUS } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { listActivities, submissionRepo } from "@/infrastructure/appDeps";
import { submitEvidence } from "@/services/importApi";
import BaseCard from "@/components/ui/BaseCard.vue";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const props = defineProps<{ classId: string }>();

const session = useSessionStore();
const activities = ref<Activity[]>([]);
const submissions = ref<Map<string, Submission>>(new Map());
const texts = ref<Record<string, string>>({});
const links = ref<Record<string, string>>({});
const loading = ref(true);
const error = ref("");
const submittingId = ref("");

function actor() {
  return { uid: session.user?.uid ?? "", role: session.role, courses: session.courses };
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    activities.value = await listActivities.run(props.classId, actor());
    const all = await submissionRepo.listByClass(session.courseId, props.classId);
    const mine = all.filter((s) => s.studentId === session.studentId);
    submissions.value = new Map(mine.map((s) => [s.activityId, s]));
  } catch (e) {
    error.value = (e as Error).message ?? "No disponible.";
  } finally {
    loading.value = false;
  }
}

async function send(activity: Activity): Promise<void> {
  submittingId.value = activity.id;
  error.value = "";
  try {
    const content = activity.evidenceTypes.includes("link") && links.value[activity.id]
      ? { text: links.value[activity.id] }
      : { text: texts.value[activity.id] ?? "" };
    const submission = await submitEvidence({
      activityId: activity.id,
      classId: props.classId,
      courseId: session.courseId,
      content,
    });
    submissions.value.set(activity.id, submission);
    texts.value[activity.id] = "";
    links.value[activity.id] = "";
  } catch (e) {
    error.value = (e as Error).message ?? "No se pudo enviar.";
  } finally {
    submittingId.value = "";
  }
}

onMounted(load);
</script>

<template>
  <div>
    <RouterLink to="/student" class="back">← Mis misiones</RouterLink>
    <h1>Actividades y evidencias</h1>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error && activities.length === 0" :message="error" @retry="load" />

    <BaseCard v-for="activity in activities" :key="activity.id" :title="activity.title" class="activity">
      <p class="muted">{{ activity.description }}</p>
      <ol v-if="activity.instructions.length">
        <li v-for="(ins, i) in activity.instructions" :key="i">{{ ins }}</li>
      </ol>

      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <div v-if="submissions.get(activity.id)" class="delivered">
        <BaseBadge :tone="submissions.get(activity.id)!.status === SUBMISSION_STATUS.ENTREGADO ? 'success' : 'neutral'">
          {{ submissions.get(activity.id)!.status }}
        </BaseBadge>
        <p v-if="submissions.get(activity.id)!.teacherFeedback" class="feedback">
          Retroalimentación: {{ submissions.get(activity.id)!.teacherFeedback }}
        </p>
        <p v-if="submissions.get(activity.id)!.score !== null" class="feedback">
          Nota: {{ submissions.get(activity.id)!.score }}
        </p>
      </div>

      <form v-else class="form" @submit.prevent="send(activity)">
        <template v-if="activity.evidenceTypes.includes('link')">
          <label :for="`link-${activity.id}`">Enlace</label>
          <input :id="`link-${activity.id}`" v-model="links[activity.id]" type="url" class="text-input" placeholder="https://…" />
        </template>
        <template v-else>
          <label :for="`text-${activity.id}`">Tu evidencia</label>
          <textarea :id="`text-${activity.id}`" v-model="texts[activity.id]" rows="4" class="text-input" required></textarea>
        </template>
        <button class="btn btn-primary" type="submit" :disabled="submittingId === activity.id">
          {{ submittingId === activity.id ? "Enviando…" : "Entregar evidencia" }}
        </button>
      </form>
    </BaseCard>

    <p v-if="!loading && activities.length === 0" class="muted">No hay actividades disponibles en esta clase.</p>
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
.activity {
  margin: var(--space-4) 0;
}
.delivered {
  margin-top: var(--space-3);
}
.feedback {
  color: var(--color-accent);
}
.error {
  color: var(--color-danger);
}
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
.text-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-family: inherit;
  font-size: 1rem;
}
</style>
