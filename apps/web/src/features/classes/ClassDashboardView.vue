<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { ClassDashboard, ParticipationOverview } from "@pclab/shared";
import { PARTICIPATION_SKILLS } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { getClassDashboard, getParticipationOverview } from "@/services/importApi";
import BaseCard from "@/components/ui/BaseCard.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import { flowGuideFor } from "./classFlowGuides";

const props = defineProps<{ classId: string }>();

const session = useSessionStore();
const courseId = ref(session.courses[0] ?? "");
const dashboard = ref<ClassDashboard | null>(null);
const participation = ref<ParticipationOverview | null>(null);
const loading = ref(true);
const error = ref("");
const copied = ref(false);
const planText = ref<HTMLTextAreaElement | null>(null);

const guide = computed(() => flowGuideFor(props.classId));

const description = computed(() => {
  const g = guide.value;
  if (!g) return "";
  const d = dashboard.value;
  const lines: string[] = [];
  lines.push(g.title);
  lines.push(`Objetivo de la clase: ${g.goal}`);
  lines.push(`Tiempo estimado: ${g.minutes} · ${g.roles}`);
  lines.push("");
  lines.push("Actividades desarrolladas en la clase:");
  g.flow.forEach((m, i) => {
    lines.push(`${i + 1}. ${m.step} (${m.time})`);
    if (m.foco) lines.push(`   Enfoque: ${m.foco}`);
    m.actions.forEach((a) => lines.push(`   • ${a}`));
  });
  if (g.materials.length) {
    lines.push("");
    lines.push(`Recursos usados: ${g.materials.join(" · ")}`);
  }
  lines.push("");
  lines.push(`Trabajo en casa / encargo: ${g.encargo}`);
  lines.push(`Evaluación: ${g.evaluation}`);
  if (d) {
    lines.push("");
    lines.push("Registro de la plataforma:");
    if (d.flippedTotal > 0) lines.push(`• Aula invertida completada: ${d.flippedCompleted} de ${d.flippedTotal} estudiantes (${d.flippedPercent}%).`);
    if (d.submissions > 0) lines.push(`• Evidencias entregadas hoy: ${d.submissions}.`);
    if (d.exitTickets > 0) lines.push(`• Tickets de salida respondidos: ${d.exitTickets}.`);
    if (d.participation > 0) lines.push(`• Intervenciones de participación registradas: ${d.participation}.`);
    if (d.avgDifficulty !== null) lines.push(`• Dificultad percibida media: ${d.avgDifficulty} de 5.`);
  }
  return lines.join("\n");
});

async function copyDescription(): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(description.value);
    } else {
      planText.value?.select();
      document.execCommand("copy");
    }
  } catch {
    planText.value?.select();
    document.execCommand("copy");
  }
  copied.value = true;
  window.setTimeout(() => (copied.value = false), 2200);
}

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

    <label for="course">Curso</label>
    <select id="course" v-model="courseId" class="select" @change="load" :disabled="loading">
      <option v-for="c in session.courses" :key="c" :value="c">{{ c }}</option>
    </select>

    <div class="toolbar">
      <RouterLink :to="`/teacher/classes/${props.classId}/results`" class="btn btn-primary">Resultados de la misión</RouterLink>
      <RouterLink :to="`/teacher/live/${props.classId}`" class="btn btn-primary">Registro de participación en vivo</RouterLink>
      <RouterLink :to="`/teacher/classes/${props.classId}/plan`" class="btn btn-primary">Guía para llevar la clase</RouterLink>
      <RouterLink :to="`/teacher/classes/${props.classId}/submissions`" class="btn btn-ghost">Evidencias</RouterLink>
      <RouterLink :to="`/teacher/classes/${props.classId}/quizzes`" class="btn btn-ghost">Quizzes</RouterLink>
    </div>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <section v-if="guide" class="lirmi-card">
      <div class="lirmi-head">
        <div>
          <p class="lirmi-kicker">Para registrar en Lirmi</p>
          <h2>Descripción de lo realizado en la clase</h2>
        </div>
        <button class="btn btn-primary" :disabled="copied" @click="copyDescription">
          <AppIcon name="copy" /> {{ copied ? "Copiado ✓" : "Copiar para Lirmi" }}
        </button>
      </div>
      <p class="muted hint">Copia este texto y pégalo en el registro de Lirmi. También puedes hacer clic dentro del cuadro y usar Ctrl+A / Ctrl+C.</p>
      <textarea
        ref="planText"
        :value="description"
        rows="14"
        readonly
        aria-label="Descripción de lo realizado en la clase para Lirmi"
        @focus="($event.target as HTMLTextAreaElement).select()"
      ></textarea>
    </section>

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
.select {
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 1rem;
  margin: var(--space-2) 0;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.toolbar {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin: var(--space-4) 0;
}
.lirmi-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  padding: var(--space-4);
  box-shadow: var(--shadow);
  margin-bottom: var(--space-4);
}
.lirmi-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.lirmi-head h2 {
  margin: 0 0 4px;
  color: var(--color-primary);
}
.lirmi-kicker {
  margin: 0 0 2px;
  color: var(--color-accent);
  font-weight: 800;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}
.hint {
  margin: var(--space-2) 0;
  font-size: 0.85rem;
}
.lirmi-card textarea {
  width: 100%;
  box-sizing: border-box;
  font: 13px/1.5 ui-monospace, Consolas, "Courier New", monospace;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-bg);
  color: var(--color-text);
  resize: vertical;
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
