<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSessionStore } from "@/stores/session";
import { listStudentLoginOptions, type StudentLoginOption } from "@/services/importApi";

const session = useSessionStore();
const route = useRoute();
const router = useRouter();

const mode = ref<"estudiante" | "staff">("estudiante");

const email = ref("");
const password = ref("");
const courseId = ref("");
const studentEmail = ref("");
const studentPassword = ref("");
const busy = ref(false);
const optionsLoading = ref(false);
const optionsError = ref("");
const courses = ref<{ id: string; name: string }[]>([]);
const allStudents = ref<StudentLoginOption[]>([]);

const studentsForCourse = computed(() => {
  const list = allStudents.value.filter((s) => s.courseId === courseId.value);
  const seen = new Map<string, number>();
  for (const s of list) seen.set(s.name, (seen.get(s.name) ?? 0) + 1);
  return list.map((s) => ({ ...s, label: seen.get(s.name)! > 1 ? `${s.name} (Nº ${s.listNumber ?? "?"})` : s.name }));
});

async function loadOptions(): Promise<void> {
  if (optionsLoading.value || allStudents.value.length > 0) return;
  optionsLoading.value = true;
  optionsError.value = "";
  try {
    const res = await listStudentLoginOptions();
    courses.value = res.courses;
    allStudents.value = res.students;
    if (courses.value.length > 0 && !courseId.value) courseId.value = courses.value[0]!.id;
  } catch (e) {
    optionsError.value = (e as Error).message ?? "No se pudieron cargar los estudiantes.";
  } finally {
    optionsLoading.value = false;
  }
}

onMounted(() => {
  if (mode.value === "estudiante") loadOptions();
});

function normalizeStudentKey(raw: string): string {
  return raw.trim().replace(/[\s.-]/g, "").toUpperCase();
}

async function submitStudent(): Promise<void> {
  if (busy.value) return;
  if (!studentEmail.value) return;
  busy.value = true;
  try {
    await session.login(studentEmail.value, normalizeStudentKey(studentPassword.value));
    await router.push(typeof route.query.redirect === "string" ? route.query.redirect : "/");
  } catch {
    // session.error ya contiene el mensaje
  } finally {
    busy.value = false;
  }
}

async function submitStaff(): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  try {
    await session.login(email.value, password.value);
    await router.push(typeof route.query.redirect === "string" ? route.query.redirect : "/");
  } catch {
    // session.error ya contiene el mensaje
  } finally {
    busy.value = false;
  }
}

function switchMode(next: "estudiante" | "staff"): void {
  mode.value = next;
  if (next === "estudiante") loadOptions();
}
</script>

<template>
  <div class="login-wrap">
    <form class="login-card" @submit.prevent="mode === 'estudiante' ? submitStudent() : submitStaff()" aria-label="Iniciar sesión">
      <h1>Providencia Ciudadanía Lab</h1>
      <p class="muted">Observatorio Ciudadano — Ovalle 2035</p>

      <div class="tabs" role="tablist" aria-label="Tipo de acceso">
        <button type="button" class="tab" :class="{ active: mode === 'estudiante' }" role="tab" :aria-selected="mode === 'estudiante'" @click="switchMode('estudiante')">
          Estudiante
        </button>
        <button type="button" class="tab" :class="{ active: mode === 'staff' }" role="tab" :aria-selected="mode === 'staff'" @click="switchMode('staff')">
          Docente / equipo
        </button>
      </div>

      <template v-if="mode === 'estudiante'">
        <p v-if="optionsLoading" class="muted small">Cargando estudiantes…</p>
        <p v-else-if="optionsError" class="error small" role="alert">{{ optionsError }}</p>
        <template v-else>
          <label for="stu-course">Curso</label>
          <select id="stu-course" v-model="courseId" class="select" :disabled="courses.length === 0">
            <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>

          <label for="stu-name">Elige tu nombre</label>
          <select id="stu-name" v-model="studentEmail" class="select" :disabled="studentsForCourse.length === 0">
            <option value="" disabled>Selecciona tu nombre…</option>
            <option v-for="s in studentsForCourse" :key="s.email" :value="s.email">{{ s.label }}</option>
          </select>

          <label for="stu-password">Tu clave</label>
          <input id="stu-password" v-model="studentPassword" type="password" autocomplete="current-password" required />
          <p class="muted small">Tu clave es tu <strong>RUT sin puntos ni guiones</strong> (ej. 201234567; si termina en K puedes escribirla en mayúscula o minúscula: 20123456K).</p>

          <button class="btn btn-primary" type="submit" :disabled="busy || !studentEmail">
            {{ busy ? "Entrando…" : "Entrar" }}
          </button>
        </template>
      </template>

      <template v-else>
        <label for="email">Correo institucional</label>
        <input id="email" v-model="email" type="email" autocomplete="username" required />

        <label for="password">Contraseña</label>
        <input id="password" v-model="password" type="password" autocomplete="current-password" required />

        <button class="btn btn-primary" type="submit" :disabled="busy">
          {{ busy ? "Entrando…" : "Entrar" }}
        </button>
      </template>

      <p v-if="session.error" class="error" role="alert">{{ session.error }}</p>
    </form>
  </div>
</template>

<style scoped>
.login-wrap {
  min-height: 80vh;
  display: grid;
  place-items: center;
}
.login-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: var(--space-6);
  width: min(420px, 92vw);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.tabs {
  display: flex;
  gap: var(--space-1);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-3);
}
.tab {
  flex: 1;
  padding: var(--space-2);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 0.95rem;
  color: var(--color-text-muted);
}
.tab.active {
  border-bottom-color: var(--color-primary);
  color: var(--color-text);
  font-weight: 600;
}
input,
.select {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 1rem;
  font-family: inherit;
}
.muted {
  color: var(--color-text-muted);
}
.small {
  font-size: 0.85rem;
}
.error {
  color: var(--color-danger);
}
</style>
