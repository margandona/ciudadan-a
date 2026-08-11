<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { ParticipationOverview, Student } from "@pclab/shared";
import { PARTICIPATION_QUICK_ACTIONS, PARTICIPATION_SKILLS } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { listStudents } from "@/infrastructure/appDeps";
import { getParticipationOverview, registerParticipation } from "@/services/importApi";
import BaseCard from "@/components/ui/BaseCard.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const props = defineProps<{ classId: string }>();

const session = useSessionStore();
const courseId = ref(session.courses[0] ?? "");
const students = ref<Student[]>([]);
const overview = ref<ParticipationOverview | null>(null);
const selected = ref<Record<string, boolean>>({});
const level = ref(1);
const note = ref("");
const saving = ref(false);
const loading = ref(true);
const error = ref("");
const notice = ref("");

function actor() {
  return { uid: session.user?.uid ?? "", role: session.role, courses: session.courses };
}

const activeStudents = ref<Student[]>([]);

async function load(): Promise<void> {
  if (!courseId.value) return;
  loading.value = true;
  error.value = "";
  notice.value = "";
  try {
    const list = await listStudents.run(courseId.value, actor());
    activeStudents.value = list.filter((s) => s.active);
    students.value = list;
    selected.value = {};
    for (const s of activeStudents.value) selected.value[s.id] = true;
    overview.value = await getParticipationOverview(courseId.value, props.classId);
  } catch (e) {
    error.value = (e as Error).message ?? "No disponible.";
  } finally {
    loading.value = false;
  }
}

function toggleAll(on: boolean): void {
  for (const s of activeStudents.value) selected.value[s.id] = on;
}

async function quick(skill: string): Promise<void> {
  const ids = activeStudents.value.filter((s) => selected.value[s.id]).map((s) => s.id);
  if (ids.length === 0) {
    notice.value = "Selecciona al menos una estudiante.";
    return;
  }
  saving.value = true;
  notice.value = "";
  try {
    const saved = await registerParticipation(
      courseId.value,
      props.classId,
      ids.map((studentId) => ({ studentId, skill, level: level.value, note: note.value || undefined })),
    );
    notice.value = `${saved} registro(s) guardados.`;
    overview.value = await getParticipationOverview(courseId.value, props.classId);
  } catch (e) {
    notice.value = (e as Error).message ?? "Error al registrar.";
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <RouterLink to="/teacher/classes" class="back">← Clases</RouterLink>
    <h1>Registro de participación en vivo</h1>
    <p class="muted">Clase {{ props.classId }} · escala 0 = sin evidencia … 3 = logrado</p>

    <p v-if="notice" class="notice" role="status">{{ notice }}</p>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <template v-else>
      <BaseCard class="controls">
        <div class="level">
          <label for="level">Nivel</label>
          <select id="level" v-model.number="level" class="select">
            <option v-for="n in [0, 1, 2, 3]" :key="n" :value="n">{{ n }}</option>
          </select>
          <label for="note">Observación breve</label>
          <input id="note" v-model="note" type="text" class="input" placeholder="(opcional)" />
          <button class="btn btn-ghost" @click="toggleAll(true)">Seleccionar todas</button>
          <button class="btn btn-ghost" @click="toggleAll(false)">Ninguna</button>
        </div>
        <div class="quick">
          <button
            v-for="action in PARTICIPATION_QUICK_ACTIONS"
            :key="action.skill"
            class="btn btn-primary btn-sm"
            :disabled="saving"
            @click="quick(action.skill)"
          >
            + {{ action.label }}
          </button>
        </div>
      </BaseCard>

      <h2 class="section">Resumen por habilidad</h2>
      <div v-if="overview" class="stats">
        <BaseCard v-for="skill of PARTICIPATION_SKILLS" :key="skill">
          <strong>{{ overview.bySkill[skill].count }}</strong>
          <span>{{ skill }} · media {{ overview.bySkill[skill].avg }}</span>
        </BaseCard>
      </div>
      <p v-if="overview" class="muted small">
        Total registros: {{ overview.total }} · estudiantes con registro: {{ overview.studentCount }}
      </p>

      <h2 class="section">Estudiantes</h2>
      <div class="grid">
        <BaseCard v-for="s in activeStudents" :key="s.id" class="student">
          <label class="row">
            <input type="checkbox" v-model="selected[s.id]" :aria-label="`Seleccionar a ${s.displayName}`" />
            <span>{{ s.displayName }}</span>
          </label>
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
.small {
  font-size: 0.85rem;
}
.notice {
  background: var(--color-primary-soft);
  padding: var(--space-3);
  border-radius: var(--radius);
}
.controls {
  margin: var(--space-4) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.level {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}
.select,
.input {
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.95rem;
}
.quick {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.btn-sm {
  padding: 6px 12px;
}
.section {
  margin-top: var(--space-5);
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--space-2);
}
.stats strong {
  display: block;
  font-size: 1.2rem;
}
.stats span {
  color: var(--color-text-muted);
  font-size: 0.8rem;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--space-2);
}
.student {
  padding: var(--space-2) var(--space-3);
}
.row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  cursor: pointer;
}
</style>
