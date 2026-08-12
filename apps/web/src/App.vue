<script setup lang="ts">
import { useSessionStore } from "@/stores/session";
import { ROLES } from "@pclab/shared";
import SyncBanner from "@/components/SyncBanner.vue";

const session = useSessionStore();
</script>

<template>
  <header class="app-header" v-if="session.isAuthenticated">
    <div class="brand">
      <span class="brand-dot" aria-hidden="true"></span>
      <span>Providencia Ciudadanía Lab</span>
      <span class="brand-sub">Observatorio Ciudadano · Ovalle 2035</span>
    </div>
    <nav aria-label="Principal" v-if="session.canManageStudents">
      <RouterLink to="/teacher" class="nav-link">Cursos</RouterLink>
      <RouterLink to="/teacher/classes" class="nav-link">Clases</RouterLink>
      <RouterLink to="/teacher/calendar" class="nav-link">Calendario</RouterLink>
      <RouterLink to="/teacher/materials" class="nav-link">Materiales</RouterLink>
      <RouterLink to="/teacher/feedback" class="nav-link">Feedback</RouterLink>
      <RouterLink to="/teacher/analytics" class="nav-link">Analítica</RouterLink>
      <RouterLink to="/teacher/teams" class="nav-link">Equipos</RouterLink>
      <RouterLink to="/teacher/projects" class="nav-link">Proyectos</RouterLink>
      <RouterLink to="/teacher/fair" class="nav-link">Feria</RouterLink>
      <RouterLink to="/teacher/students/import" class="nav-link">Importar estudiantes</RouterLink>
    </nav>
    <nav aria-label="Evaluador" v-else-if="session.role === 'EVALUADOR'">
      <RouterLink to="/evaluator" class="nav-link">Revisar material</RouterLink>
    </nav>
    <nav aria-label="PIE" v-else-if="session.role === 'PIE'">
      <RouterLink to="/pie" class="nav-link">Revisión de material</RouterLink>
    </nav>
    <nav aria-label="UTP" v-else-if="session.role === 'UTP'">
      <RouterLink to="/utp" class="nav-link">Revisión de material</RouterLink>
    </nav>
    <nav aria-label="Estudiante" v-else-if="session.role === 'ESTUDIANTE'">
      <RouterLink to="/student" class="nav-link">Mis misiones</RouterLink>
    </nav>
    <button class="btn btn-ghost" @click="session.logout()">Salir ({{ session.role || ROLES.ESTUDIANTE }})</button>
  </header>
  <SyncBanner />
  <main class="app-main">
    <RouterView />
  </main>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-5);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-wrap: wrap;
}
.brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 600;
  color: var(--color-primary);
}
.brand-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-accent);
}
.brand-sub {
  font-weight: 400;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
nav {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.nav-link {
  text-decoration: none;
  color: var(--color-text);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius);
}
.nav-link:hover {
  background: var(--color-primary-soft);
}
.app-main {
  max-width: 1080px;
  margin: 0 auto;
  padding: var(--space-5);
}
</style>
