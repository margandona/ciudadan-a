<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { ProjectTeam, Student } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { listStudents } from "@/infrastructure/appDeps";
import { createTeam, listTeams, randomGroups } from "@/services/importApi";
import BaseCard from "@/components/ui/BaseCard.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const session = useSessionStore();
const courseId = ref(session.courses[0] ?? "");
const teams = ref<ProjectTeam[]>([]);
const students = ref<Student[]>([]);
const selected = ref<Record<string, boolean>>({});
const newTeamName = ref("");
const groupCount = ref(4);
const loading = ref(true);
const error = ref("");
const notice = ref("");
const busy = ref("");

async function load(): Promise<void> {
  if (!courseId.value) return;
  loading.value = true;
  error.value = "";
  notice.value = "";
  try {
    [teams.value, students.value] = await Promise.all([
      listTeams(courseId.value),
      listStudents.run(courseId.value, { uid: session.user?.uid ?? "", role: session.role, courses: session.courses }),
    ]);
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

async function create(): Promise<void> {
  const memberIds = students.value.filter((s) => selected.value[s.id]).map((s) => s.id);
  busy.value = "create";
  notice.value = "";
  try {
    await createTeam(courseId.value, newTeamName.value || "Equipo nuevo", memberIds);
    newTeamName.value = "";
    notice.value = "Equipo creado.";
    await load();
  } catch (e) {
    notice.value = (e as Error).message;
  } finally {
    busy.value = "";
  }
}

async function groups(): Promise<void> {
  busy.value = "groups";
  notice.value = "";
  try {
    const created = await randomGroups(courseId.value, groupCount.value);
    notice.value = `${created.length} grupo(s) aleatorios creados.`;
    await load();
  } catch (e) {
    notice.value = (e as Error).message;
  } finally {
    busy.value = "";
  }
}

onMounted(load);
</script>

<template>
  <div>
    <h1>Equipos</h1>
    <p class="muted">Crea equipos, asígnales estudiantes o genera grupos aleatorios (nunca mezclan cursos).</p>

    <label for="course">Curso</label>
    <select id="course" v-model="courseId" class="select" @change="load">
      <option v-for="c in session.courses" :key="c" :value="c">{{ c }}</option>
    </select>

    <p v-if="notice" class="notice" role="status">{{ notice }}</p>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <div v-else class="layout">
      <BaseCard class="create">
        <h2>Nuevo equipo</h2>
        <input v-model="newTeamName" class="input" placeholder="Nombre del equipo" />
        <div class="members">
          <label v-for="s in students.filter((x) => x.active)" :key="s.id" class="row">
            <input type="checkbox" v-model="selected[s.id]" />
            <span>{{ s.displayName }}</span>
          </label>
        </div>
        <button class="btn btn-primary" :disabled="busy === 'create'" @click="create">Crear equipo</button>
      </BaseCard>

      <BaseCard class="create">
        <h2>Grupos aleatorios</h2>
        <label for="groups">Nº de grupos</label>
        <input id="groups" v-model.number="groupCount" type="number" min="1" class="input" />
        <button class="btn btn-ghost" :disabled="busy === 'groups'" @click="groups">Generar grupos (sin mezclar cursos)</button>
      </BaseCard>

      <BaseCard v-for="team in teams" :key="team.id" :title="team.name">
        <p class="muted small">{{ team.members.length }} integrantes</p>
        <ul class="list">
          <li v-for="m in team.members" :key="m">{{ students.find((s) => s.id === m)?.displayName ?? m }}</li>
        </ul>
      </BaseCard>
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
.select,
.input {
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.95rem;
  margin: var(--space-2) 0;
}
.layout {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}
.create {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.members {
  max-height: 220px;
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--space-2);
}
.row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}
.list {
  padding-left: var(--space-4);
}
</style>
