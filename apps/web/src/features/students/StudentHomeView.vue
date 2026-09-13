<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { StudentBadgesOverview, StudentBadgeView } from "@pclab/shared";
import type { StudentMission } from "@pclab/application";
import { badgeProgress } from "@pclab/domain";
import { useSessionStore } from "@/stores/session";
import { listMissions } from "@/infrastructure/appDeps";
import { evaluateBadges, getBadgesForStudent, getPositiveMessage, getStudentGamification, type StudentGamification } from "@/services/importApi";
import { celebrate } from "@/composables/useConfetti";
import { useSounds } from "@/composables/useSounds";
import { notify, trackLevelSeen } from "@/composables/useNotify";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";
import AppEmptyState from "@/components/ui/AppEmptyState.vue";
import SpeakButton from "@/components/ui/SpeakButton.vue";
import BadgeArt from "@/components/ui/BadgeArt.vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import Avatar from "@/components/ui/Avatar.vue";
import { AVATAR_FEATURES, AVATAR_STYLES, useAvatar } from "@/composables/useAvatar";
import { isAvatarStyleAvailable } from "@pclab/shared";

const session = useSessionStore();
const missions = ref<StudentMission[]>([]);
const badges = ref<StudentBadgesOverview | null>(null);
const gamification = ref<StudentGamification | null>(null);
const positiveMessage = ref<string | null>(null);
const evaluating = ref(false);
const loading = ref(true);
const error = ref("");
const medalModalOpen = ref(false);
const selectedMedal = ref<StudentBadgeView | null>(null);
const avatar = useAvatar();
const avatarOpen = ref(false);
const previewStyle = ref(avatar.pref.value.style);

const FARM_ANNOUNCE_KEY = "pclab-farm-announce";
function farmAnnouncementDismissed(): boolean {
  try {
    return localStorage.getItem(FARM_ANNOUNCE_KEY) === "1";
  } catch {
    return false;
  }
}
const showFarmAnnouncement = ref(!farmAnnouncementDismissed());
function dismissFarmAnnouncement(): void {
  showFarmAnnouncement.value = false;
  try {
    localStorage.setItem(FARM_ANNOUNCE_KEY, "1");
  } catch {
    // sin almacenamiento
  }
}

const firstName = computed(() => {
  const name = session.user?.displayName ?? "";
  return name.split(" ")[0] || "ciudadana";
});

const visible = computed(() => missions.value.filter((m) => m.visibility !== "hidden"));
const regularVisible = computed(() => visible.value.filter((m) => !m.class.alternative));
const altVisible = computed(() => visible.value.filter((m) => !!m.class.alternative));
const regularMissions = computed(() => missions.value.filter((m) => !m.class.alternative));

const stats = computed(() => {
  const total = regularMissions.value.length;
  const done = regularMissions.value.filter((m) => m.visibility === "done" || m.flippedProgress?.ready).length;
  const earned = badges.value?.earnedCount ?? 0;
  const level = Math.max(1, Math.floor(earned / 4) + 1);
  return { total, done, earned, level };
});

const nextMission = computed(() => {
  return (
    regularMissions.value.find((m) => m.flippedAvailable && !m.flippedProgress?.ready && m.visibility === "open") ??
    regularVisible.value.find((m) => m.flippedAvailable) ??
    null
  );
});

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return "¡Buenos días";
  if (hour < 19) return "¡Buenas tardes";
  return "¡Buenas noches";
});

const avatarLevel = computed(() => gamification.value?.level ?? stats.value.level);
const unlockedFeatures = computed(() => AVATAR_FEATURES.filter((feature) => avatarLevel.value >= feature.minLevel));
const unlockedStyles = computed(() => gamification.value?.unlockedAvatarStyles ?? []);
const avatarStyles = computed(() =>
  AVATAR_STYLES.map((style) => ({ ...style, available: isAvatarStyleAvailable(style.id, unlockedStyles.value) })),
);
function chooseAvatarStyle(style: string): void {
  if (!isAvatarStyleAvailable(style, unlockedStyles.value)) return;
  previewStyle.value = style;
}
function saveAvatar(): void {
  avatar.choose({ style: previewStyle.value, seed: avatar.pref.value.seed });
  avatarOpen.value = false;
}
function ensureAvatarSeed(): void {
  if (avatar.pref.value.seed === "ciudadana-2035" && session.user?.uid) {
    avatar.choose({ style: avatar.pref.value.style, seed: session.user.uid });
  }
}

const joinLiveCode = ref("");
function goLive(): void {
  const code = joinLiveCode.value.trim().toUpperCase();
  if (code) {
    window.location.assign(`/join/${encodeURIComponent(code)}`);
  }
}

const feedbackMissions = computed(() => regularVisible.value.filter((m) => m.feedbackReady));
const earnedOrdered = computed(() =>
  (badges.value?.badges ?? [])
    .filter((view) => view.earned)
    .sort((a, b) => (a.earnedAt ?? "").localeCompare(b.earnedAt ?? "")),
);
const lockedOrdered = computed(() =>
  (badges.value?.badges ?? [])
    .filter((view) => !view.earned)
    .sort((a, b) => a.badge.order - b.badge.order),
);
const missionBadges = computed(() => earnedOrdered.value.filter((view) => view.badge.classId));
const generalBadges = computed(() => earnedOrdered.value.filter((view) => !view.badge.classId));
const missionById = computed(() => new Map(missions.value.map((m) => [m.class.id, m.class.title])));

function missionLabelOf(view: StudentBadgeView): string {
  const classId = view.badge.classId;
  if (classId) return missionById.value.get(classId) ?? `Misión ${classId.replace("class-", "")}`;
  return "Logro ciudadano";
}

function openMedalModal(initial?: StudentBadgeView): void {
  selectedMedal.value = initial ?? earnedOrdered.value[0] ?? lockedOrdered.value[0] ?? null;
  medalModalOpen.value = true;
}

function selectMedal(view: StudentBadgeView): void {
  selectedMedal.value = view;
  useSounds.click();
}

function statusOf(m: StudentMission): "done" | "locked" | "open" | "hidden" {
  return m.visibility;
}

function statusLabel(m: StudentMission): string {
  if (m.visibility === "done") return "Completada";
  if (m.visibility === "locked") return "Próximamente";
  if (m.visibility === "hidden") return "No disponible";
  if (m.flippedProgress?.ready) return "¡Lista!";
  if (m.flippedProgress && m.flippedProgress.progressPercent > 0) return `En curso · ${m.flippedProgress.progressPercent}%`;
  return "Disponible";
}

function missionHref(m: StudentMission): string {
  if (m.flippedAvailable) return `/student/missions/${m.class.id}/flipped`;
  return `/student/missions/${m.class.id}/activities`;
}

function progressOf(m: StudentMission): number {
  return m.flippedProgress?.progressPercent ?? 0;
}

function badgeProgressView(view: StudentBadgeView): number {
  if (view.earned) return 100;
  const stats = badges.value?.stats ?? { flippedCompleted: 0, quizzesPassed: 0, evidenceCount: 0, participationTotal: 0, participationBySkill: {}, exitTickets: 0 };
  return badgeProgress(stats, view.badge);
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const hasStudent = Boolean(session.courseId && session.studentId);
    const [m, b, msg, g] = await Promise.all([
      listMissions.run(
        { courseId: session.courseId, studentId: session.studentId },
        { uid: session.user?.uid ?? "", role: session.role, courses: session.courses },
      ),
      hasStudent ? getBadgesForStudent(session.courseId, session.studentId) : Promise.resolve(null),
      hasStudent ? getPositiveMessage("flipped") : Promise.resolve(null),
      hasStudent ? getStudentGamification(session.courseId, session.studentId).catch(() => null) : Promise.resolve(null),
    ]);
    missions.value = m;
    badges.value = b;
    positiveMessage.value = msg;
    gamification.value = g;
    if (g) trackLevelSeen(levelKey(), g.level);
    ensureAvatarSeed();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

function levelKey(): string {
  return `pclab-level-${session.studentId || session.user?.uid || "anon"}`;
}

async function refreshGamification(): Promise<void> {
  if (!session.courseId || !session.studentId) return;
  const g = await getStudentGamification(session.courseId, session.studentId).catch(() => null);
  if (g) {
    gamification.value = g;
    trackLevelSeen(levelKey(), g.level);
  }
}

async function runEvaluation(): Promise<void> {
  if (!session.courseId || !session.studentId || evaluating.value) return;
  evaluating.value = true;
  try {
    const previous = new Set((badges.value?.badges ?? []).filter((view) => view.earned).map((view) => view.badge.id));
    const result = await evaluateBadges(session.courseId, session.studentId);
    badges.value = result.overview;
    const newlyEarned = result.overview.badges.filter((view) => view.earned && !previous.has(view.badge.id));
    if (newlyEarned.length > 0) {
      positiveMessage.value = `¡Nueva medalla! ${newlyEarned.map((view) => view.badge.name).join(", ")}`;
      notify({
        kind: "badge",
        title: "¡Ganaste medallas nuevas!",
        detail: `${newlyEarned.map((view) => view.badge.name).join(", ")} · +${newlyEarned.length * 15} XP`,
      });
      celebrate({ count: 200 });
      useSounds.win();
      openMedalModal(newlyEarned[0]!);
      void refreshGamification();
    } else if (result.awarded.length > 0) {
      positiveMessage.value = `¡Nueva medalla! ${result.awarded.join(", ")}`;
      notify({ kind: "badge", title: "¡Ganaste una medalla nueva!", detail: result.awarded.join(", ") });
      celebrate({ count: 200 });
      useSounds.win();
      void refreshGamification();
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
  <div class="student-home">
    <template v-if="!session.courseId || !session.studentId">
      <AppEmptyState message="Tu profesora aún no ha habilitado tu acceso al curso." />
    </template>

    <template v-else>
      <SkeletonRows v-if="loading" />
      <AppErrorState v-else-if="error" :message="error" @retry="load" />

      <template v-else>
        <!-- ===== Anuncio: La Granja Ciudadana ===== -->
        <section v-if="showFarmAnnouncement" class="farm-announce" role="status" aria-label="Novedad: La Granja Ciudadana">
          <span class="farm-announce-ico" aria-hidden="true">🌱</span>
          <div class="farm-announce-body">
            <strong>¡Nueva: La Granja Ciudadana!</strong>
            <p class="muted small">Siembra, cosecha y sube de nivel. Completa el desafío de conceptos y gana XP.</p>
          </div>
          <RouterLink to="/student/farm" class="btn btn-primary farm-announce-cta"><AppIcon name="farm" /> Entrar a la granja</RouterLink>
          <button type="button" class="farm-announce-close" aria-label="Cerrar anuncio" @click="dismissFarmAnnouncement">×</button>
        </section>

        <!-- ===== Héroe ===== -->
        <section class="hero">
          <div class="hero-inner">
            <div>
              <p class="hero-greet">{{ greeting }}, {{ firstName }}</p>
              <h1 class="hero-title">Observatorio Ciudadano · Ovalle 2035</h1>
              <p class="hero-sub">Completa tus {{ stats.total }} misiones y gana medallas de ciudadana.</p>
            </div>
            <div class="hero-stats">
              <div class="stat"><strong>{{ stats.done }}/{{ stats.total }}</strong><span>misiones</span></div>
              <div class="stat"><strong>{{ stats.earned }}</strong><span>medallas</span></div>
              <div class="stat"><strong>Nivel {{ gamification?.level ?? stats.level }}</strong><span>ciudadana</span></div>
              <div class="stat"><strong>{{ gamification?.xp ?? 0 }}</strong><span>puntos</span></div>
            </div>
          </div>
          <div class="hero-perks" v-if="gamification">
            <span>Racha: {{ gamification.streak }} día(s)</span>
            <span>Estrellas de la semana: {{ gamification.weeklyStars }}/7</span>
            <span>Próximo nivel: {{ gamification.progressToNext }}%</span>
          </div>
          <div class="hero-shape" aria-hidden="true"></div>
        </section>

         <!-- ===== Mi personaje ===== -->
         <section class="avatar-card">
           <Avatar :seed="avatar.pref.value.seed" :style="avatar.pref.value.style" :level="avatarLevel" :size="96" />
           <div class="avatar-info">
             <p class="next-label">Mi personaje</p>
             <h2>¡Hola, {{ firstName }}!</h2>
             <p class="muted small">
               Nivel {{ avatarLevel }} · {{ gamification?.xp ?? 0 }} pts ·
               {{ unlockedFeatures.length }} mejora(s) visual(es)
               <template v-if="avatarLevel > 1"> · racha {{ gamification?.streak ?? 0 }} día(s)</template>
             </p>
             <div v-if="gamification" class="bar avatar-bar" aria-hidden="true">
               <div class="bar-fill" :style="{ width: `${gamification.progressToNext ?? 0}%` }"></div>
             </div>
             <p class="small muted">Tu personaje mejora a medida que avanzas: gana marcos, destellos, corona y más.</p>
           </div>
           <button class="btn-medal" @click="avatarOpen = true; previewStyle = avatar.pref.value.style">Elegir personaje</button>
         </section>

         <Teleport to="body">
           <div v-if="avatarOpen" class="avatar-overlay" role="presentation" @click.self="avatarOpen = false">
             <div class="avatar-dialog" role="dialog" aria-modal="true" aria-label="Elegir mi personaje">
               <div class="dialog-head">
                 <div>
                   <h2>Mi personaje</h2>
                   <p class="muted small">Elige un estilo. Tu avatar evoluciona mientras avanzas de nivel.</p>
                 </div>
                 <button type="button" class="modal-close" aria-label="Cerrar" @click="avatarOpen = false">×</button>
               </div>

               <div class="preview-row">
                 <Avatar :seed="avatar.pref.value.seed" :style="previewStyle" :level="avatarLevel" :size="140" />
                 <div>
                   <p><strong>Nivel {{ avatarLevel }}</strong></p>
                   <p class="muted small">{{ gamification?.xp ?? 0 }} puntos · {{ gamification?.progressToNext ?? 0 }}% para el próximo nivel</p>
                 </div>
               </div>

               <p class="group-title">Estilos</p>
                <div class="styles-grid">
                  <button
                    v-for="s in avatarStyles"
                    :key="s.id"
                    type="button"
                    class="style-card"
                    :class="{ active: previewStyle === s.id, locked: !s.available }"
                    :disabled="!s.available"
                    @click="chooseAvatarStyle(s.id)"
                  >
                    <span class="style-emoji" aria-hidden="true">{{ s.emoji }}</span>
                    <span>{{ s.label }}</span>
                    <small v-if="!s.available" class="locked-tag">🔒 Regalo del profe</small>
                  </button>
                </div>

               <p class="group-title">Mejoras por nivel</p>
               <div class="features-grid">
                 <div v-for="feature in AVATAR_FEATURES" :key="feature.minLevel" class="feature" :class="{ unlocked: avatarLevel >= feature.minLevel }">
                   <span aria-hidden="true">{{ feature.icon }}</span>
                   <div><strong>{{ feature.label }}</strong><small>Nivel {{ feature.minLevel }}+</small></div>
                 </div>
               </div>

               <div class="dialog-actions">
                 <button class="btn-primary-big" @click="saveAvatar">Guardar personaje</button>
               </div>
             </div>
           </div>
         </Teleport>

         <!-- ===== Navegación por pestañas ===== -->
         <nav class="home-tabs" aria-label="Secciones del panel">
           <a href="#ruta" class="tab-pill"><AppIcon name="lightning" /> Misiones</a>
           <a href="#practica" class="tab-pill"><AppIcon name="target" /> Entrenamiento</a>
           <a href="#quiz-vivo" class="tab-pill"><AppIcon name="play" /> Quiz en vivo</a>
           <a href="#medallero" class="tab-pill"><AppIcon name="medal" /> Medallero</a>
         </nav>

         <!-- ===== Siguiente misión (CTA) ===== -->
         <section v-if="nextMission" class="next-card">
          <div class="next-info">
            <p class="next-label">Tu próxima misión</p>
            <h2>{{ nextMission.class.title }}</h2>
            <p class="muted">{{ nextMission.class.learningGoal }}</p>
            <div class="bar" aria-hidden="true">
              <div class="bar-fill" :style="{ width: `${progressOf(nextMission)}%` }"></div>
            </div>
            <p class="small muted">
              Aula invertida: {{ progressOf(nextMission) }}%
              <template v-if="nextMission.flippedProgress?.ready"> · ¡Lista!</template>
            </p>
          </div>
          <RouterLink :to="missionHref(nextMission)" class="btn-cta">
            <AppIcon v-if="progressOf(nextMission) > 0" name="arrow" />{{ progressOf(nextMission) > 0 ? "Continuar misión" : "Comenzar misión" }}
          </RouterLink>
         </section>

           <section id="practica" class="study-teaser">
           <div>
             <p class="next-label">Preparación disponible</p>
             <h2>Sala de entrenamiento para la prueba</h2>
             <p class="muted">Lee el resumen, escucha la historia y practica con retos de ciudadanía, participación y territorio.</p>
           </div>
             <div class="study-actions">
                <RouterLink to="/student/study" class="btn-cta"><AppIcon name="play" /> Entrar a entrenar</RouterLink>
               <RouterLink to="/student/quizzes/quiz-u3-sala-entrenamiento" class="btn-study-quiz">Abrir quiz directo</RouterLink>
             </div>
         </section>

         <section v-if="feedbackMissions.length" class="feedback-notice" role="status">
           <div>
             <p class="next-label">Novedad</p>
             <h2>Tu profesora dejó retroalimentación</h2>
             <p class="muted">Entra a la misión para leer el comentario y ver tu resultado.</p>
           </div>
            <RouterLink :to="`/student/missions/${feedbackMissions[0]!.class.id}/activities`" class="btn-cta"><AppIcon name="chat" /> Ver retroalimentación</RouterLink>
         </section>

         <section id="quiz-vivo" class="live-teaser">
           <div>
             <p class="next-label">Quiz en vivo</p>
             <h2>¿Tu profesora inició un quiz?</h2>
             <p class="muted">Escribe el código que muestra la pantalla para entrar y responder.</p>
           </div>
           <form class="live-join-form" @submit.prevent="goLive">
             <input
               v-model="joinLiveCode"
               class="live-code-input"
               placeholder="Código, ej. 3598"
               aria-label="Código del quiz en vivo"
               inputmode="numeric"
               maxlength="6"
             />
              <button class="btn-cta" type="submit"><AppIcon name="lightning" /> Entrar al quiz</button>
           </form>
         </section>

         <AppEmptyState
           v-if="!loading && !error && regularVisible.length === 0 && altVisible.length === 0"
          message="No hay misiones disponibles todavía."
        />

        <!-- ===== Ruta de misiones ===== -->
        <section v-if="regularVisible.length" id="ruta" class="route">
          <div class="section-head">
            <h2>Mi ruta de misiones</h2>
            <SpeakButton :text="regularVisible.map((m) => m.class.title).join('. ')" label="Escuchar ruta" />
          </div>

          <div class="route-list">
            <RouterLink
              v-for="m in regularVisible"
              :key="m.class.id"
              :to="missionHref(m)"
              class="mission-card"
              :class="[`st-${statusOf(m)}`, { ready: m.flippedProgress?.ready }]"
              :aria-label="`Misión ${m.class.number}: ${m.class.title}`"
              v-tilt
            >
              <span class="node" aria-hidden="true">{{ statusOf(m) === 'done' ? '✓' : String(m.class.number).padStart(2, '0') }}</span>
              <div class="mission-body">
                <h3>{{ m.class.title }}</h3>
                <p class="muted small">{{ m.class.subtitle }}</p>
                <span v-if="m.feedbackReady" class="feedback-chip">Retro lista · ver comentario</span>
              </div>
              <div class="mission-side">
                <span class="chip">{{ statusLabel(m) }}</span>
                <div class="mini-bar" aria-hidden="true">
                  <div class="mini-fill" :style="{ width: `${progressOf(m)}%` }"></div>
                </div>
              </div>
            </RouterLink>
          </div>
        </section>

        <!-- ===== Misiones alternativas ===== -->
        <section v-if="altVisible.length" class="route">
          <div class="section-head">
            <h2>Misiones alternativas</h2>
            <SpeakButton :text="altVisible.map((m) => m.class.title).join('. ')" label="Escuchar alternativas" />
          </div>
          <p class="muted small">Trabajo opcional propuesto por tu profesora, fuera de la ruta de 12 misiones.</p>

          <div class="route-list">
            <RouterLink
              v-for="m in altVisible"
              :key="m.class.id"
              :to="missionHref(m)"
              class="mission-card"
              :class="[`st-${statusOf(m)}`, { ready: m.flippedProgress?.ready }]"
              :aria-label="`Misión alternativa: ${m.class.title}`"
              v-tilt
            >
              <span class="node" aria-hidden="true">★</span>
              <div class="mission-body">
                <h3>{{ m.class.title }}</h3>
                <p class="muted small">{{ m.class.subtitle }}</p>
              </div>
              <div class="mission-side">
                <span class="chip">{{ statusLabel(m) }}</span>
                <div class="mini-bar" aria-hidden="true">
                  <div class="mini-fill" :style="{ width: `${progressOf(m)}%` }"></div>
                </div>
              </div>
            </RouterLink>
          </div>
        </section>

        <!-- ===== Medallero (abre modal) ===== -->
        <section v-if="badges" id="medallero" class="medallero">
          <div class="section-head">
            <div class="med-title">
              <h2>Mi medallero</h2>
              <p class="muted small">{{ badges.earnedCount }}/{{ badges.totalCount }} medallas ganadas · sin impacto en la nota</p>
            </div>
            <div class="med-actions">
              <button class="btn-ghost-small" :disabled="evaluating" @click="runEvaluation">
                {{ evaluating ? "Evaluando…" : "Actualizar medallas" }}
              </button>
              <button class="btn-medal" @click="openMedalModal()">Ver mi medallero</button>
            </div>
          </div>
          <p v-if="positiveMessage" class="message" role="status">{{ positiveMessage }}</p>

          <div class="medal-preview">
            <template v-if="earnedOrdered.length">
              <span class="medal-preview-text">Medallas ganadas:</span>
              <button
                v-for="view in earnedOrdered"
                :key="view.badge.id"
                type="button"
                class="medal-chip"
                :title="`${view.badge.name} · ${missionLabelOf(view)}`"
                @click="openMedalModal(view)"
              >
                <BadgeArt :icon="view.badge.icon" :earned="true" :size="40" />
              </button>
            </template>
            <p v-else class="muted">Aún no tienes medallas. Completa misiones y actividades para ganarlas.</p>
          </div>
        </section>

        <!-- ===== Modal de medallero ===== -->
        <Teleport to="body">
          <div v-if="medalModalOpen" class="modal-overlay" role="presentation" @click.self="medalModalOpen = false">
            <div class="modal-card" role="dialog" aria-modal="true" aria-label="Mi medallero">
              <div class="modal-head">
                <div>
                  <h2>Mi medallero</h2>
                  <p class="muted small">{{ badges?.earnedCount ?? 0 }} ganadas · {{ badges?.totalCount ?? 0 }} disponibles</p>
                </div>
                <button type="button" class="modal-close" aria-label="Cerrar medallero" @click="medalModalOpen = false">×</button>
              </div>

              <div v-if="selectedMedal" class="medal-detail">
                <div class="medal-detail-art">
                  <BadgeArt :icon="selectedMedal.badge.icon" :earned="selectedMedal.earned" :size="132" />
                  <span v-if="selectedMedal.earned && selectedMedal.earnedAt" class="medal-earned-at">Ganada el {{ new Date(selectedMedal.earnedAt).toLocaleDateString("es-CL") }}</span>
                </div>
                <div class="medal-detail-text">
                  <span class="medal-tag">{{ missionLabelOf(selectedMedal) }}</span>
                  <h3>{{ selectedMedal.badge.name }}</h3>
                  <p>{{ selectedMedal.badge.description }}</p>
                  <p v-if="!selectedMedal.earned" class="muted small">Progreso: <strong>{{ badgeProgressView(selectedMedal) }}%</strong> para desbloquearla.</p>
                  <p v-else class="muted small">Esta medalla no afecta tu nota: es un reconocimiento a tu avance como ciudadana.</p>
                </div>
              </div>

              <p class="muted small">Toca cualquier medalla para ver su significado.</p>

              <h4 class="group-title">Medallas de misión</h4>
              <div v-if="missionBadges.length" class="modal-grid">
                <button
                  v-for="view in missionBadges"
                  :key="view.badge.id"
                  type="button"
                  class="modal-medal"
                  :class="{ active: selectedMedal?.badge.id === view.badge.id }"
                  @click="selectMedal(view)"
                >
                  <BadgeArt :icon="view.badge.icon" :earned="true" :size="56" />
                  <span>{{ view.badge.name }}</span>
                </button>
              </div>
              <p v-else class="muted small">Completa misiones para ganar medallas de misión.</p>

              <h4 class="group-title">Logros ciudadanos</h4>
              <div v-if="generalBadges.length" class="modal-grid">
                <button
                  v-for="view in generalBadges"
                  :key="view.badge.id"
                  type="button"
                  class="modal-medal"
                  :class="{ active: selectedMedal?.badge.id === view.badge.id }"
                  @click="selectMedal(view)"
                >
                  <BadgeArt :icon="view.badge.icon" :earned="true" :size="56" />
                  <span>{{ view.badge.name }}</span>
                </button>
              </div>
              <p v-else class="muted small">Aún no has ganado logros ciudadanos.</p>

              <template v-if="lockedOrdered.length">
                <h4 class="group-title">Bloqueadas</h4>
                <div class="modal-grid locked">
                  <button
                    v-for="view in lockedOrdered"
                    :key="view.badge.id"
                    type="button"
                    class="modal-medal"
                    :class="{ active: selectedMedal?.badge.id === view.badge.id }"
                    @click="selectMedal(view)"
                  >
                    <BadgeArt :icon="view.badge.icon" :earned="false" :size="56" />
                    <span>{{ view.badge.name }}</span>
                  </button>
                </div>
              </template>
            </div>
          </div>
        </Teleport>
      </template>
    </template>
  </div>
</template>

<style scoped>
.student-home {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}
.muted { color: var(--color-text-muted); }
.small { font-size: 0.85rem; }

/* ===== Pestañas de navegación ===== */
.home-tabs {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 8px;
  margin: calc(-1 * var(--space-3)) 0 var(--space-1);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(4px);
  border-radius: 16px;
  border: 1px solid var(--color-border);
}
.tab-pill {
  text-decoration: none;
  color: var(--color-primary);
  font-weight: 700;
  font-size: 0.88rem;
  padding: 7px 14px;
  border-radius: 999px;
  background: var(--color-primary-soft);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.tab-pill:hover { background: var(--color-primary); color: #fff; }

/* ===== Mi personaje ===== */
.avatar-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  background: var(--color-surface);
  box-shadow: var(--shadow);
}
.avatar-card h2 { margin: 0 0 3px; }
.avatar-info { flex: 1; min-width: 220px; }
.avatar-bar { max-width: 320px; margin: 8px 0 4px; }
.btn-primary-big {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  color: #fff;
  border: 0;
  border-radius: 999px;
  padding: 11px 20px;
  font-weight: 700;
  cursor: pointer;
}
.avatar-overlay {
  position: fixed;
  inset: 0;
  z-index: 2100;
  background: rgba(8, 15, 25, 0.62);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: var(--space-4);
}
.avatar-dialog {
  width: min(660px, 96vw);
  max-height: 90vh;
  overflow-y: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  padding: var(--space-5);
}
.dialog-head { display: flex; justify-content: space-between; gap: var(--space-3); align-items: flex-start; }
.dialog-head h2 { margin: 0; color: var(--color-primary); }
.preview-row { display: flex; align-items: center; gap: var(--space-4); margin: var(--space-4) 0; }
.group-title { margin: var(--space-4) 0 8px; font-weight: 800; color: var(--color-primary); }
.styles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; }
.style-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-bg);
  cursor: pointer;
  font: inherit;
  color: var(--color-text);
}
.style-card.active { border-color: var(--color-accent); background: #eefaf6; }
.style-card.locked { opacity: 0.6; cursor: not-allowed; }
.locked-tag { color: var(--color-text-muted); font-size: 0.68rem; }
.style-emoji { font-size: 1.4rem; }
.features-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; }
.feature {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 10px;
  background: var(--color-border);
  opacity: 0.55;
}
.feature span { font-size: 1.3rem; }
.feature small { display: block; color: var(--color-text-muted); }
.feature.unlocked { background: linear-gradient(135deg, #fdf3c8, #fff8e6); opacity: 1; }
.dialog-actions { margin-top: var(--space-4); text-align: right; }
.avatar-card .btn-medal { align-self: center; }

/* ===== Héroe ===== */
.hero {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  background: linear-gradient(135deg, #0d2f52 0%, #0e7c66 100%);
  color: #fff;
  padding: var(--space-6);
}
.hero-inner {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
  align-items: center;
}
.hero-greet {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0 0 4px;
}
.hero-title {
  margin: 0 0 6px;
  font-size: 1.6rem;
}
.hero-sub {
  margin: 0;
  opacity: 0.9;
}
.hero-stats {
  display: flex;
  gap: var(--space-3);
}
.stat {
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 14px;
  padding: var(--space-2) var(--space-3);
  text-align: center;
  min-width: 86px;
}
.stat strong { display: block; font-size: 1.25rem; }
.stat span { font-size: 0.75rem; opacity: 0.9; }
.hero-shape {
  position: absolute;
  right: -60px;
  top: -60px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.18), transparent 70%);
}
.hero-perks {
  position: relative;
  z-index: 1;
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
  margin-top: var(--space-3);
  font-size: 0.85rem;
  opacity: 0.95;
}

/* ===== CTA siguiente misión ===== */
.next-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  box-shadow: var(--shadow);
  padding: var(--space-5);
}
.study-teaser {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
  padding: var(--space-5);
  border-radius: 18px;
  background: linear-gradient(135deg, #fff8df, #fff);
  border: 1px solid #ead58b;
}
.study-teaser h2 { margin: 0 0 6px; }
.feedback-notice { display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); flex-wrap: wrap; padding: var(--space-5); border: 1px solid #e3b341; border-left: 6px solid #d8a41f; border-radius: 18px; background: #fff9e8; }
.feedback-notice h2 { margin: 0 0 5px; }
.feedback-chip { display: inline-block; margin-top: 6px; padding: 3px 9px; border-radius: 999px; background: #fff3c4; color: #8a6500; font-size: .75rem; font-weight: 800; }
.live-teaser { display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); flex-wrap: wrap; padding: var(--space-5); border-radius: 18px; background: linear-gradient(135deg, #eef4ff, #fff); border: 1px solid #b9cdf0; }
.live-teaser h2 { margin: 0 0 5px; }
.live-join-form { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.live-code-input { padding: 10px 14px; border: 1px solid var(--color-primary); border-radius: 999px; font-size: 1.05rem; letter-spacing: 0.08em; text-transform: uppercase; width: 150px; }
.study-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.btn-study-quiz { display: inline-block; padding: 10px 16px; border: 1px solid var(--color-primary); border-radius: 999px; color: var(--color-primary); font-weight: 700; text-decoration: none; }
.next-label {
  margin: 0 0 4px;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-accent);
  font-weight: 700;
}
.next-card h2 { margin: 0 0 6px; }
.bar {
  background: var(--color-border);
  border-radius: 999px;
  height: 10px;
  overflow: hidden;
  margin: var(--space-2) 0;
  max-width: 420px;
}
.bar-fill {
  background: linear-gradient(90deg, var(--color-accent), #37c3a2);
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}
.btn-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, var(--color-primary), #0e7c66);
  color: #fff;
  font-weight: 700;
  padding: 12px 22px;
  border-radius: 999px;
  text-decoration: none;
  box-shadow: 0 6px 16px rgba(18, 58, 95, 0.28);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.btn-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(18, 58, 95, 0.34);
}

/* ===== Encabezados de sección ===== */
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}
.section-head h2 { margin: 0; }
.btn-ghost-small {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-primary);
  border-radius: 999px;
  padding: 6px 14px;
  cursor: pointer;
  font-size: 0.85rem;
}
.btn-ghost-small:hover { border-color: var(--color-primary); }

/* ===== Ruta de misiones ===== */
.route-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.mission-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-left: 6px solid var(--color-border);
  border-radius: 16px;
  padding: var(--space-4);
  text-decoration: none;
  color: var(--color-text);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.mission-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 22px rgba(18, 58, 95, 0.14);
}
.mission-card.st-done {
  border-left-color: var(--color-accent);
  background: linear-gradient(180deg, #ffffff, #f2fbf7);
}
.mission-card.st-open {
  border-left-color: var(--color-primary);
}
.mission-card.st-locked {
  opacity: 0.55;
}
.mission-card.st-locked:hover {
  transform: none;
  box-shadow: none;
  cursor: not-allowed;
}
.node {
  flex: 0 0 auto;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 0.95rem;
  background: var(--color-border);
  color: var(--color-text-muted);
}
.mission-card.st-done .node {
  background: linear-gradient(135deg, var(--color-accent), #37c3a2);
  color: #fff;
}
.mission-card.st-open .node {
  background: linear-gradient(135deg, var(--color-primary), #2a6fae);
  color: #fff;
}
.mission-body {
  flex: 1;
  min-width: 0;
}
.mission-body h3 { margin: 0 0 2px; font-size: 1.02rem; }
.mission-side {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  min-width: 120px;
}
.chip {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--color-primary-soft);
  color: var(--color-primary);
}
.st-done .chip { background: #e2f4ee; color: var(--color-accent); }
.st-locked .chip { background: var(--color-border); color: var(--color-text-muted); }
.mini-bar {
  width: 110px;
  height: 6px;
  border-radius: 999px;
  background: var(--color-border);
  overflow: hidden;
}
.mini-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--color-accent), #37c3a2);
  transition: width 0.4s ease;
}

/* ===== Medallero ===== */
.med-title h2 { margin: 0 0 3px; }
.med-actions { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.btn-medal {
  border: 0;
  border-radius: 999px;
  padding: 9px 18px;
  background: linear-gradient(135deg, #d8a41f, #b8860b);
  color: #fff;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(184, 134, 11, 0.35);
}
.btn-medal:hover { filter: brightness(1.06); }
.medal-preview { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: var(--space-3); border: 1px dashed var(--color-border); border-radius: 14px; margin-top: var(--space-3); background: var(--color-surface); }
.medal-preview-text { font-weight: 700; margin-right: 4px; }
.medal-chip { padding: 0; border: 0; background: transparent; cursor: pointer; border-radius: 50%; transition: transform 0.15s ease; }
.medal-chip:hover { transform: translateY(-3px) scale(1.08); }

/* ===== Modal de medallero ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(13, 35, 60, 0.6);
  backdrop-filter: blur(3px);
  display: grid;
  place-items: center;
  padding: var(--space-4);
}
.modal-card {
  width: min(680px, 96vw);
  max-height: 90vh;
  overflow-y: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(13, 35, 60, 0.4);
  padding: var(--space-5);
}
.modal-head { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); }
.modal-head h2 { margin: 0 0 4px; }
.modal-close { border: 0; background: transparent; color: var(--color-text-muted); font-size: 1.8rem; line-height: 1; cursor: pointer; }
.modal-close:hover { color: var(--color-danger); }
.medal-detail { display: grid; grid-template-columns: auto 1fr; gap: var(--space-4); align-items: center; margin: var(--space-4) 0; padding: var(--space-4); border-radius: 16px; background: linear-gradient(135deg, #fffdf0, #fdf3d7); }
.medal-detail-art { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.medal-earned-at { font-size: 0.7rem; color: #8a6500; }
.medal-detail-text h3 { margin: 4px 0; color: var(--color-primary); }
.medal-tag { display: inline-block; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #8a6500; background: #fff0c2; padding: 3px 10px; border-radius: 999px; }
.group-title { margin: var(--space-4) 0 var(--space-2); color: var(--color-primary); font-size: 1rem; }
.modal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 10px; }
.modal-medal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 6px;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-bg);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text);
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}
.modal-medal:hover { transform: translateY(-3px); border-color: var(--color-accent); }
.modal-medal.active { border-color: var(--color-accent); background: #f0fbf7; box-shadow: 0 0 0 3px rgba(14, 124, 102, 0.18); }
.modal-grid.locked .modal-medal { color: var(--color-text-muted); }
.message {
  background: var(--color-primary-soft);
  padding: var(--space-3);
  border-radius: var(--radius);
  color: var(--color-primary);
}
.badge-grid {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  margin-top: var(--space-3);
}
.badge-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: var(--space-4);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.badge-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(18, 58, 95, 0.12); }
.badge-card.earned {
  border-color: var(--color-accent);
  background: linear-gradient(180deg, #ffffff, #eefaf6);
}
.badge-state {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--color-border);
  color: var(--color-text-muted);
}
.badge-state.earned {
  background: linear-gradient(135deg, var(--color-accent), #37c3a2);
  color: #fff;
}
.badge-card .mini-bar { width: 100%; }

/* ===== Mobile-first (pantallas muy pequeñas) ===== */
@media (max-width: 480px) {
  .hero {
    padding: var(--space-4);
  }
  .hero-title {
    font-size: 1.25rem;
  }
  .hero-stats {
    width: 100%;
    flex-wrap: wrap;
    justify-content: flex-start;
  }
  .stat {
    min-width: 0;
    flex: 1 1 30%;
    padding: var(--space-2);
  }
  .stat strong {
    font-size: 1.1rem;
  }
  .mission-card {
    flex-wrap: wrap;
    gap: var(--space-2);
    padding: var(--space-3);
  }
  .node {
    width: 38px;
    height: 38px;
    font-size: 0.85rem;
  }
  .mission-body {
    flex-basis: calc(100% - 58px);
  }
  .mission-side {
    min-width: 0;
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
  .next-card {
    flex-direction: column;
    align-items: flex-start;
  }
}
.farm-announce {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
  background: linear-gradient(135deg, #eefaf6, #e8f3ff);
  border: 1px solid #2f9e83;
  border-left: 6px solid #2f9e83;
  border-radius: var(--radius);
  padding: 12px 14px;
  margin-bottom: var(--space-4);
  box-shadow: var(--shadow);
}
.farm-announce-ico {
  font-size: 1.8rem;
  line-height: 1;
}
.farm-announce-body {
  flex: 1;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.farm-announce-body p {
  margin: 0;
}
.farm-announce-cta {
  white-space: nowrap;
}
.farm-announce-close {
  border: 0;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  padding: 4px 6px;
}
</style>
