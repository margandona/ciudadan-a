<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { Student, StudentBadgesOverview } from "@pclab/shared";
import { getStudentOverview, currentActor } from "@/infrastructure/appDeps";
import { awardBadge, evaluateBadges, getBadgesForStudent, setStudentActive } from "@/services/importApi";
import BaseCard from "@/components/ui/BaseCard.vue";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const props = defineProps<{ courseId: string; studentId: string }>();

const student = ref<Student | null>(null);
const badges = ref<StudentBadgesOverview | null>(null);
const selectedBadge = ref("");
const loading = ref(true);
const error = ref("");
const busy = ref(false);
const message = ref("");

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    student.value = await getStudentOverview.run(props.courseId, props.studentId, currentActor());
    badges.value = await getBadgesForStudent(props.courseId, props.studentId);
    if (badges.value && !selectedBadge.value) {
      const locked = badges.value.badges.find((b) => !b.earned);
      if (locked) selectedBadge.value = locked.badge.id;
    }
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

async function award(): Promise<void> {
  if (!selectedBadge.value || busy.value) return;
  busy.value = true;
  message.value = "";
  try {
    await awardBadge(props.courseId, props.studentId, selectedBadge.value);
    badges.value = await getBadgesForStudent(props.courseId, props.studentId);
    message.value = "Medalla otorgada.";
  } catch (e) {
    message.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

async function runEvaluation(): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  message.value = "";
  try {
    const result = await evaluateBadges(props.courseId, props.studentId);
    badges.value = result.overview;
    message.value = result.awarded.length > 0 ? `Medallas automáticas otorgadas: ${result.awarded.join(", ")}` : "Sin nuevas medallas por ahora.";
  } catch (e) {
    message.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

async function toggleActive(): Promise<void> {
  if (!student.value || busy.value) return;
  busy.value = true;
  message.value = "";
  try {
    const next = !student.value.active;
    student.value = await setStudentActive(props.courseId, props.studentId, next);
    message.value = next ? "Estudiante reactivada." : "Estudiante retirada (soft delete). Se conserva el historial.";
  } catch (e) {
    message.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <RouterLink :to="`/teacher/courses/${courseId}`" class="back">← Volver al curso</RouterLink>
    <h1>{{ student?.displayName ?? "Perfil" }}</h1>
    <p class="muted">{{ student?.courseId }}</p>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <template v-else-if="student">
      <p v-if="message" class="notice" role="status">{{ message }}</p>

      <div class="grid">
        <BaseCard title="Datos generales">
          <dl class="dl">
            <dt>Nombre</dt>
            <dd>{{ student.displayName }}</dd>
            <dt>Curso</dt>
            <dd>{{ student.courseId }}</dd>
            <dt>Estado</dt>
            <dd>
              <BaseBadge :tone="student.active ? 'success' : 'neutral'">
                {{ student.active ? "Activa" : "Retirada" }}
              </BaseBadge>
            </dd>
            <dt>Última actividad</dt>
            <dd>{{ student.stats?.lastActivityAt ? new Date(student.stats.lastActivityAt).toLocaleDateString("es-CL") : "—" }}</dd>
          </dl>
          <button class="btn btn-ghost" :disabled="busy" @click="toggleActive">
            {{ student.active ? "Retirar del curso" : "Reactivar" }}
          </button>
        </BaseCard>

        <BaseCard title="Progreso">
          <p class="muted">Aula invertida, misiones, quizzes, actividades y evidencias se poblarán en las Fases 3–4.</p>
          <ul class="list">
            <li>Clases completadas: {{ student.stats?.completedClasses ?? 0 }}</li>
            <li>Entregas: {{ student.stats?.submittedCount ?? 0 }}</li>
            <li>Intentos de quiz: {{ student.stats?.quizAttempts ?? 0 }}</li>
          </ul>
        </BaseCard>

        <BaseCard title="Participación">
          <p class="muted">Intervenciones, colaboración, argumentación, pensamiento crítico… (Fase 5).</p>
        </BaseCard>

        <BaseCard title="Gamificación">
          <p v-if="message" class="notice" role="status">{{ message }}</p>
          <template v-if="badges">
            <p class="muted small">{{ badges.earnedCount }}/{{ badges.totalCount }} medallas · sin impacto en la nota</p>
            <div class="badge-list">
              <span
                v-for="view in badges.badges"
                :key="view.badge.id"
                class="badge-chip"
                :class="{ earned: view.earned }"
              >
                {{ view.badge.icon }} {{ view.badge.name }}
              </span>
            </div>
            <div class="award">
              <select v-model="selectedBadge" class="select" aria-label="Medalla a otorgar">
                <option v-for="view in badges.badges.filter((b) => !b.earned)" :key="view.badge.id" :value="view.badge.id">
                  {{ view.badge.name }}
                </option>
              </select>
              <button class="btn btn-ghost btn-sm" :disabled="busy || !selectedBadge" @click="award">Otorgar</button>
              <button class="btn btn-ghost btn-sm" :disabled="busy" @click="runEvaluation">Evaluar automáticamente</button>
            </div>
          </template>
        </BaseCard>

        <BaseCard title="Evaluaciones">
          <p class="muted">Resultados, rúbricas y retroalimentación (Fases 7 y 10).</p>
        </BaseCard>

        <BaseCard title="Tickets de salida">
          <p class="muted">Historial de tickets (Fase 4).</p>
        </BaseCard>

        <BaseCard title="Feedback">
          <p class="muted">Solo información que corresponda según permisos (Fase 9).</p>
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
.muted {
  color: var(--color-text-muted);
}
.notice {
  background: var(--color-primary-soft);
  padding: var(--space-3);
  border-radius: var(--radius);
}
.grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
.dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-2);
}
.dt {
  color: var(--color-text-muted);
}
.list {
  padding-left: var(--space-4);
}
.notice {
  background: var(--color-primary-soft);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius);
  margin-bottom: var(--space-3);
}
.badge-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-3) 0;
}
.badge-chip {
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 0.85rem;
  opacity: 0.5;
}
.badge-chip.earned {
  opacity: 1;
  border-color: var(--color-accent);
  background: #e2f4ee;
}
.award {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}
.select {
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.9rem;
}
.btn-sm {
  padding: 6px 12px;
}
</style>
