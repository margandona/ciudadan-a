<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { Project, ProjectAssessmentSummary, ProjectFields, ProjectTeam, Rubric } from "@pclab/shared";
import { PROJECT_FIELD_LABELS } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { assessProject, getProjectDetail, getRubric, listProjects } from "@/services/importApi";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const session = useSessionStore();
const courseId = ref(session.courses[0] ?? "");
const classId = ref("class-11");
const projects = ref<Project[]>([]);
const detail = ref<{ project: Project; team: ProjectTeam; assessments: ProjectAssessmentSummary } | null>(null);
const rubric = ref<Rubric | null>(null);
const scores = ref<Record<string, number>>({});
const feedback = ref("");
const loading = ref(true);
const error = ref("");
const notice = ref("");
const busy = ref(false);

async function load(): Promise<void> {
  if (!courseId.value) return;
  loading.value = true;
  error.value = "";
  try {
    projects.value = await listProjects(courseId.value, classId.value);
  } catch (e) {
    error.value = (e as Error).message ?? "No disponible.";
  } finally {
    loading.value = false;
  }
}

async function open(project: Project): Promise<void> {
  notice.value = "";
  detail.value = await getProjectDetail(project.id, courseId.value);
  rubric.value = await getRubric("rubric-proyecto");
  scores.value = {};
  feedback.value = detail.value.assessments.teacher?.feedback ?? "";
  if (rubric.value) {
    for (const c of rubric.value.criteria) {
      scores.value[c.id] = detail.value.assessments.teacher?.scores[c.id] ?? 0;
    }
  }
}

async function assess(): Promise<void> {
  if (!detail.value || !rubric.value || busy.value) return;
  busy.value = true;
  notice.value = "";
  try {
    await assessProject({ projectId: detail.value.project.id, courseId: courseId.value, rubricId: rubric.value.id, scores: scores.value, feedback: feedback.value });
    notice.value = "Evaluación registrada (rúbrica).";
    await open(detail.value.project);
  } catch (e) {
    notice.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

const fieldKeys = Object.keys(PROJECT_FIELD_LABELS) as (keyof ProjectFields)[];

onMounted(load);
</script>

<template>
  <div>
    <h1>Proyectos</h1>
    <p class="muted">Revisa y evalúa los proyectos con rúbrica (Ovalle 2035 · Feria).</p>

    <div class="filters">
      <select v-model="courseId" class="select" @change="load">
        <option v-for="c in session.courses" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="classId" class="select" @change="load">
        <option value="class-11">Misión 11 — Proyecto</option>
        <option value="class-12">Misión 12 — Feria</option>
      </select>
    </div>

    <p v-if="notice" class="notice" role="status">{{ notice }}</p>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <div v-else class="layout">
      <aside class="list">
        <p v-if="projects.length === 0" class="muted">Sin proyectos entregados todavía.</p>
        <button v-for="p in projects" :key="p.id" class="item" :class="{ active: detail?.project.id === p.id }" @click="open(p)">
          <strong>{{ p.teamId }}</strong>
          <BaseBadge :tone="p.status === 'ENTREGADO' ? 'warning' : p.status === 'REVISADO' ? 'success' : 'neutral'">{{ p.status }}</BaseBadge>
        </button>
      </aside>

      <section v-if="detail" class="panel">
        <h2>{{ detail.team.name }}</h2>
        <p class="muted small">Integrantes: {{ detail.team.members.join(", ") }}</p>

        <div class="fields">
          <div v-for="key in fieldKeys" :key="key" class="field">
            <strong>{{ PROJECT_FIELD_LABELS[key] }}</strong>
            <p>{{ detail.project.fields[key] || "—" }}</p>
          </div>
        </div>

        <template v-if="rubric">
          <h3>Evaluación con rúbrica</h3>
          <div v-for="c in rubric.criteria" :key="c.id" class="criteria">
            <label>{{ c.name }} (máx {{ c.maxPoints }}) — {{ c.descriptor }}</label>
            <input v-model.number="scores[c.id]" type="number" min="0" :max="c.maxPoints" class="score" :aria-label="c.name" />
          </div>
          <label for="feedback">Retroalimentación</label>
          <textarea id="feedback" v-model="feedback" rows="3" class="input"></textarea>
          <button class="btn btn-primary" :disabled="busy" @click="assess">Registrar evaluación</button>
        </template>

        <div v-if="detail.assessments.self" class="self">
          <h4>Autoevaluación</h4>
          <p>Puntos: {{ Object.values(detail.assessments.self.scores).reduce((a, b) => a + b, 0) }}</p>
          <p v-if="detail.assessments.self.feedback">{{ detail.assessments.self.feedback }}</p>
        </div>
        <div v-if="detail.assessments.peer.length" class="self">
          <h4>Coevaluación ({{ detail.assessments.peer.length }})</h4>
          <p v-for="p in detail.assessments.peer" :key="p.by">
            {{ Object.values(p.scores).reduce((a, b) => a + b, 0) }} puntos
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.muted {
  color: var(--color-text-muted);
}
.small {
  font-size: 0.85rem;
}
.notice {
  background: var(--color-primary-soft);
  padding: var(--space-3);
  border-radius: var(--radius);
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-3) 0;
}
.select,
.input {
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.95rem;
}
.layout {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: 280px 1fr;
}
@media (max-width: 800px) {
  .layout {
    grid-template-columns: 1fr;
  }
}
.list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.item {
  text-align: left;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--space-3);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.item.active {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}
.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--space-4);
}
.fields {
  display: grid;
  gap: var(--space-2);
  margin: var(--space-3) 0;
}
.field {
  border-top: 1px dashed var(--color-border);
  padding: var(--space-2) 0;
}
.field p {
  margin: 4px 0 0;
}
.criteria {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  margin: var(--space-2) 0;
}
.score {
  width: 70px;
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.self {
  margin-top: var(--space-4);
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-3);
}
</style>
