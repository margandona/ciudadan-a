<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useSessionStore } from "@/stores/session";
import { ROLES } from "@pclab/shared";
import SyncBanner from "@/components/SyncBanner.vue";
import AccessibilityBar from "@/components/ui/AccessibilityBar.vue";
import PwaInstallBanner from "@/components/ui/PwaInstallBanner.vue";
import AppHelp from "@/components/ui/AppHelp.vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import AppToasts from "@/components/ui/AppToasts.vue";
import Avatar from "@/components/ui/Avatar.vue";
import { loadAvatarPref } from "@/composables/useAvatar";
import { useFarmWatch } from "@/composables/useFarmWatch";

const session = useSessionStore();
const router = useRouter();

// Notificaciones en vivo de los regalos del docente.
useFarmWatch();

watch(
  () => session.user,
  (user) => {
    if (user) return;
    session.error = "";
    if (router.currentRoute.value.name !== "login") {
      void router.replace({ name: "login" });
    }
  },
);

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
const avatarTick = ref(0);

function refreshAvatar(): void {
  avatarTick.value += 1;
}

function headerAvatarSeed(): string {
  const pref = loadAvatarPref(session.user?.uid ?? "ciudadana");
  return pref.seed;
}
function headerAvatarStyle(): string {
  return loadAvatarPref().style;
}

function canBeat(): boolean {
  return session.role === ROLES.ESTUDIANTE && Boolean(session.courseId);
}

function beat(): void {
  if (!canBeat()) return;
  const courseId = session.courseId;
  void import("@/services/importApi").then(({ studentHeartbeat }) => studentHeartbeat(courseId));
}

function startHeartbeat(): void {
  stopHeartbeat();
  beat();
  heartbeatTimer = setInterval(beat, 60_000);
}

function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function onVisibility(): void {
  if (document.visibilityState === "visible") beat();
}

watch(
  () => [session.role, session.courseId] as const,
  () => {
    if (canBeat()) startHeartbeat();
    else stopHeartbeat();
  },
  { immediate: true },
);

onMounted(() => {
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pclab-avatar", refreshAvatar);
});
onBeforeUnmount(() => {
  stopHeartbeat();
  document.removeEventListener("visibilitychange", onVisibility);
  window.removeEventListener("pclab-avatar", refreshAvatar);
});
</script>

<template>
  <AccessibilityBar />
  <AppToasts />
  <PwaInstallBanner />
  <header class="app-header" v-if="session.isAuthenticated">
    <div class="brand">
      <span class="brand-dot" aria-hidden="true"></span>
      <span>Providencia Ciudadanía Lab</span>
      <span class="brand-sub">Observatorio Ciudadano · Ovalle 2035</span>
    </div>
    <nav aria-label="Principal" v-if="session.canManageStudents">
      <RouterLink to="/teacher" class="nav-link"><AppIcon name="home" /> Cursos</RouterLink>
      <RouterLink to="/teacher/classes" class="nav-link"><AppIcon name="calendar" /> Clases</RouterLink>
      <RouterLink to="/teacher/calendar" class="nav-link"><AppIcon name="gauge" /> Calendario</RouterLink>
      <RouterLink to="/teacher/materials" class="nav-link"><AppIcon name="file" /> Materiales</RouterLink>
      <RouterLink to="/teacher/feedback" class="nav-link"><AppIcon name="chat" /> Feedback</RouterLink>
      <RouterLink to="/teacher/analytics" class="nav-link"><AppIcon name="chart" /> Analítica</RouterLink>
      <RouterLink to="/teacher/teams" class="nav-link"><AppIcon name="teams" /> Equipos</RouterLink>
      <RouterLink to="/teacher/projects" class="nav-link"><AppIcon name="folder" /> Proyectos</RouterLink>
      <RouterLink to="/teacher/fair" class="nav-link"><AppIcon name="trophy" /> Feria</RouterLink>
      <RouterLink to="/teacher/students/import" class="nav-link"><AppIcon name="users" /> Importar estudiantes</RouterLink>
      <AppHelp />
    </nav>
    <nav aria-label="Evaluador" v-else-if="session.role === 'EVALUADOR'">
      <RouterLink to="/evaluator" class="nav-link"><AppIcon name="eye" /> Revisar material</RouterLink>
      <AppHelp />
    </nav>
    <nav aria-label="PIE" v-else-if="session.role === 'PIE'">
      <RouterLink to="/pie" class="nav-link"><AppIcon name="sparkles" /> Revisión de material</RouterLink>
      <AppHelp />
    </nav>
    <nav aria-label="UTP" v-else-if="session.role === 'UTP'">
      <RouterLink to="/utp" class="nav-link"><AppIcon name="book" /> Revisión de material</RouterLink>
      <AppHelp />
    </nav>
    <nav aria-label="Estudiante" v-else-if="session.role === 'ESTUDIANTE'">
      <RouterLink to="/student" class="nav-link"><AppIcon name="lightning" /> Mis misiones</RouterLink>
      <RouterLink to="/student/farm" class="nav-link"><AppIcon name="farm" /> Granja</RouterLink>
      <AppHelp />
    </nav>
    <template v-if="session.role === 'ESTUDIANTE'">
      <span class="header-avatar" :key="avatarTick">
        <Avatar :seed="headerAvatarSeed()" :style="headerAvatarStyle()" :size="42" hide-level />
      </span>
    </template>
    <button class="btn btn-ghost" @click="session.logout()"><AppIcon name="logout" /> Salir ({{ session.role || ROLES.ESTUDIANTE }})</button>
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.nav-link:hover {
  background: var(--color-primary-soft);
}
.header-avatar {
  display: inline-flex;
  align-items: center;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.18));
}
.app-main {
  max-width: 1080px;
  margin: 0 auto;
  padding: var(--space-5);
}
</style>
