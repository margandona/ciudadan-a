<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { StudentBadgesOverview } from "@pclab/shared";
import type { StudentMission } from "@pclab/application";
import { useSessionStore } from "@/stores/session";
import { listMissions } from "@/infrastructure/appDeps";
import { evaluateBadges, getBadgesForStudent, getPositiveMessage } from "@/services/importApi";
import BaseCard from "@/components/ui/BaseCard.vue";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";
import AppEmptyState from "@/components/ui/AppEmptyState.vue";

const session = useSessionStore();
const missions = ref<StudentMission[]>([]);
const badges = ref<StudentBadgesOverview | null>(null);
const positiveMessage = ref<string | null>(null);
const evaluating = ref(false);
const loading = ref(true);
const error = ref("");

const firstName = computed(() => {
  const name = session.user?.displayName ?? "";
  return name.split(" ")[0] || "ciudadana";
});

const visible = computed(() => missions.value.filter((m) => m.visibility !== "hidden"));

const nextMission = computed(() => {
  return (
    missions.value.find((m) => m.flippedAvailable && !m.flippedProgress?.ready && m.visibility === "open") ??
    visible.value.find((m) => m.flippedAvailable) ??
    null
  );
});

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    missions.value = await listMissions.run(
      { courseId: session.courseId, studentId: session.studentId },
      { uid: session.user?.uid ?? "", role: session.role, courses: session.courses },
    );
    if (session.courseId && session.studentId) {
      badges.value = await getBadgesForStudent(session.courseId, session.studentId);
      positiveMessage.value = await getPositiveMessage("flipped");
    }
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

async function runEvaluation(): Promise<void> {
  if (!session.courseId || !session.studentId || evaluating.value) return;
  evaluating.value = true;
  try {
    const result = await evaluateBadges(session.courseId, session.studentId);
    badges.value = result.overview;
    if (result.awarded.length > 0) {
      positiveMessage.value = `¡Nueva medalla! ${result.awarded.join(", ")}`;
    }
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    evaluating.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <template v-if="!session.courseId || !session.studentId">
      <AppEmptyState message="Tu profesora aún no ha habilitado tu acceso al curso." />
    </template>

    <template v-else>
      <h1>Hola, {{ firstName }}</h1>
      <p class="muted">Observatorio Ciudadano · Ovalle 2035</p>

      <SkeletonRows v-if="loading" />
      <AppErrorState v-else-if="error" :message="error" @retry="load" />

      <template v-else-if="nextMission">
        <BaseCard class="next" :title="`Tu próxima misión: ${nextMission.class.title}`">
          <p class="muted">{{ nextMission.class.learningGoal }}</p>
          <div class="bar" aria-hidden="true">
            <div class="bar-fill" :style="{ width: `${nextMission.flippedProgress?.progressPercent ?? 0}%` }"></div>
          </div>
          <p class="small muted">
            Aula invertida: {{ nextMission.flippedProgress?.progressPercent ?? 0 }}% completada
            <template v-if="nextMission.flippedProgress?.ready"> · ¡Lista!</template>
          </p>
          <RouterLink :to="`/student/missions/${nextMission.class.id}/flipped`" class="btn btn-primary">
            {{ nextMission.flippedProgress?.progressPercent && nextMission.flippedProgress.progressPercent > 0 ? "Continuar misión" : "Comenzar misión" }}
          </RouterLink>
        </BaseCard>
      </template>

      <AppEmptyState v-else-if="!loading && !error" message="No hay misiones disponibles todavía." />

      <h2 v-if="visible.length" class="section">Mis misiones</h2>
      <div class="grid">
        <BaseCard v-for="m in missions" :key="m.class.id" :title="m.class.title">
          <p class="muted small">{{ m.class.subtitle }}</p>
          <BaseBadge :tone="m.visibility === 'done' ? 'success' : m.visibility === 'locked' ? 'neutral' : m.flippedAvailable ? 'success' : 'neutral'">
            {{ m.visibility === 'done' ? 'Completada' : m.visibility === 'locked' ? 'Próximamente' : m.visibility === 'hidden' ? 'No disponible' : m.flippedProgress?.ready ? 'Aula invertida lista' : 'Disponible' }}
          </BaseBadge>
        </BaseCard>
      </div>

      <div v-if="badges" class="badges">
        <h2 class="section">Mis medallas</h2>
        <p v-if="positiveMessage" class="message" role="status">{{ positiveMessage }}</p>
        <p class="muted small">
          {{ badges.earnedCount }}/{{ badges.totalCount }} medallas · sin ranking ni impacto en la nota
        </p>
        <button class="btn btn-ghost btn-sm" :disabled="evaluating" @click="runEvaluation">
          {{ evaluating ? "Evaluando…" : "Evaluar medallas" }}
        </button>
        <div class="badge-grid">
          <div
            v-for="view in badges.badges"
            :key="view.badge.id"
            class="badge-card"
            :class="{ earned: view.earned }"
          >
            <span class="icon" aria-hidden="true">{{ view.badge.icon }}</span>
            <strong>{{ view.badge.name }}</strong>
            <p class="muted small">{{ view.badge.description }}</p>
            <BaseBadge :tone="view.earned ? 'success' : 'neutral'">
              {{ view.earned ? (view.via === 'teacher' ? 'Otorgada por tu profesora' : 'Ganada') : 'Bloqueada' }}
            </BaseBadge>
          </div>
        </div>
      </div>
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
.section {
  margin-top: var(--space-6);
}
.next {
  margin: var(--space-4) 0;
}
.bar {
  background: var(--color-border);
  border-radius: 999px;
  height: 10px;
  overflow: hidden;
  margin: var(--space-3) 0;
}
.bar-fill {
  background: var(--color-accent);
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}
.grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}
.badges {
  margin-top: var(--space-6);
}
.message {
  background: var(--color-primary-soft);
  padding: var(--space-3);
  border-radius: var(--radius);
  color: var(--color-primary);
}
.badge-grid {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  margin-top: var(--space-3);
}
.badge-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--space-3);
}
.badge-card:not(.earned) .icon,
.badge-card:not(.earned) > strong {
  color: var(--color-text-muted);
}
.badge-card.earned {
  border-color: var(--color-accent);
}
.badge-card .icon {
  font-size: 1.4rem;
  display: block;
  margin-bottom: var(--space-1);
}
.btn-sm {
  padding: 6px 12px;
}
</style>
