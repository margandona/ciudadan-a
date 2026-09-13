<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { FlippedLesson, FlippedProgress, Material } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { getFlippedLesson, trackFlippedProgress } from "@/infrastructure/appDeps";
import { awardMissionBadge, getStudentGuide, downloadStudentGuide } from "@/services/importApi";
import { celebrate } from "@/composables/useConfetti";
import { notify } from "@/composables/useNotify";
import { useSounds } from "@/composables/useSounds";
import SpeakButton from "@/components/ui/SpeakButton.vue";
import FlippedLessonPlayer from "./FlippedLessonPlayer.vue";
import BadgeArt from "@/components/ui/BadgeArt.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const MISSION_ICONS: Record<string, string> = {
  "class-01": "star", "class-02": "flame", "class-03": "flag", "class-04": "map-pin",
  "class-05": "magnifier", "class-06": "mic", "class-07": "compass", "class-08": "chart",
  "class-09": "scale", "class-10": "droplet", "class-11": "bulb", "class-12": "trophy",
};

const props = defineProps<{ classId: string }>();

const session = useSessionStore();
const lesson = ref<FlippedLesson | null>(null);
const progress = ref<FlippedProgress | null>(null);
const loading = ref(true);
const error = ref("");
const missionBadge = ref<{ name: string; code: string } | null>(null);

const stageName: Record<string, string> = {
  "class-07": "Consejo de soluciones",
  "class-08": "Presupuesto bajo presión",
  "class-09": "Código desigualdad",
  "class-10": "El acuerdo del Limarí",
  "class-11": "Diseño Ovalle 2035",
  "class-12": "Feria ciudadana",
};
const missionStage = computed(() => stageName[props.classId] ?? "Misión ciudadana");
const roleOptions: Record<string, string[]> = {
  "class-07": ["Mediadora", "Defensora del bien común", "Analista de actores"],
  "class-08": ["Alcaldesa por un día", "Guardiana de la equidad", "Analista de prioridades"],
  "class-09": ["Detective de datos", "Verificadora de fuentes", "Narradora del territorio"],
  "class-10": ["Mediadora del agua", "Defensora de la comunidad", "Guardiana del río"],
  "class-11": ["Diseñadora de soluciones", "Investigadora local", "Coordinadora de equipo"],
  "class-12": ["Vocera", "Editora de evidencias", "Anfitriona de la feria"],
};
const roles = computed(() => roleOptions[props.classId] ?? ["Exploradora", "Investigadora", "Vocera"]);
const selectedRole = ref("");
const guide = ref<Material | null>(null);
const guideOpen = ref(false);
const guideLoading = ref(false);
const guideError = ref("");
const downloadingKind = ref<"PDF" | "DOCX" | null>(null);

const guideSpeakText = computed(() => {
  const m = guide.value;
  if (!m) return "";
  const content = m.content as { sections?: { kind: string; text?: string; items?: string[] }[]; items?: { prompt?: string }[] } | undefined;
  const parts: string[] = [m.title];
  for (const s of content?.sections ?? []) {
    if (s.text) parts.push(s.text);
    if (s.kind === "list") parts.push((s.items ?? []).join(". "));
  }
  for (const it of content?.items ?? []) if (it.prompt) parts.push(it.prompt);
  return parts.filter(Boolean).join(". ");
});

async function loadGuide(): Promise<void> {
  if (!session.courseId) return;
  guideLoading.value = true;
  guideError.value = "";
  try {
    guide.value = await getStudentGuide(session.courseId, props.classId);
  } catch (e) {
    guideError.value = (e as Error).message ?? "No se pudo cargar la guía.";
  } finally {
    guideLoading.value = false;
  }
}

async function downloadGuide(kind: "PDF" | "DOCX"): Promise<void> {
  if (!guide.value || !session.courseId) return;
  downloadingKind.value = kind;
  guideError.value = "";
  try {
    await downloadStudentGuide(session.courseId, props.classId, guide.value.id, kind);
  } catch (e) {
    guideError.value = (e as Error).message ?? "No se pudo descargar.";
  } finally {
    downloadingKind.value = null;
  }
}

type GuideSection = { kind: string; text?: string; items?: string[] };
type GuideItem = { prompt?: string; options?: string[] };

function guideSections(): GuideSection[] {
  const content = guide.value?.content as { sections?: GuideSection[] } | undefined;
  return content?.sections ?? [];
}
function guideItems(): GuideItem[] {
  const content = guide.value?.content as { items?: GuideItem[] } | undefined;
  return content?.items ?? [];
}
function guideHeading(): string {
  const first = guideSections().find((s) => s.kind === "heading");
  return first?.text ?? guide.value?.title ?? "";
}

function actor() {
  return { uid: session.user?.uid ?? "", role: session.role, courses: session.courses };
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const result = await getFlippedLesson.run(
      { courseId: session.courseId, classId: props.classId, studentId: session.studentId },
      actor(),
    );
    lesson.value = result.lesson;
    progress.value = result.progress;
    void loadGuide();
  } catch (e) {
    error.value = (e as Error).message ?? "No disponible.";
  } finally {
    loading.value = false;
  }
}

async function onTrack(payload: {
  blockId?: string;
  question?: { blockId: string; correct: boolean; score: number };
  reflection?: { blockId: string; text: string };
  markReady?: boolean;
  interactionSeconds?: number;
}): Promise<void> {
  if (!progress.value) return;
  const wasReady = progress.value.ready;
  try {
    progress.value = await trackFlippedProgress.run(
      { courseId: session.courseId, classId: props.classId, studentId: session.studentId, ...payload },
      actor(),
    );
    if (progress.value.ready && !wasReady) {
      await claimMissionBadge();
      celebrate();
      useSounds.win();
    }
  } catch (e) {
    error.value = (e as Error).message ?? "No se pudo guardar el progreso.";
  }
}

async function claimMissionBadge(): Promise<void> {
  try {
    const res = await awardMissionBadge(session.courseId, props.classId);
    if (res.awarded && res.badge) {
      missionBadge.value = res.badge;
      notify({ kind: "badge", title: `¡Ganaste la medalla «${res.badge.name}»!`, detail: "Completaste la misión · +15 XP" });
    }
  } catch {
    // La medalla se puede otorgar más tarde; no bloqueamos la misión.
  }
}

onMounted(load);
</script>

<template>
  <div>
    <RouterLink to="/student" class="back">← Mis misiones</RouterLink>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <template v-else-if="lesson">
       <h1>{{ lesson.title }}</h1>
       <p class="muted">{{ lesson.objective }}</p>

       <section class="mission-control" aria-labelledby="mission-control-title">
         <div>
           <p class="control-kicker">Centro de mando · tú diriges el aprendizaje</p>
           <h2 id="mission-control-title">{{ missionStage }}</h2>
           <p>La profesora prepara el escenario; tú eliges cómo investigar, qué evidencia aceptar y cómo defender tu decisión.</p>
         </div>
         <div class="role-picker">
           <strong>Elige tu rol para esta misión</strong>
           <div class="role-options">
             <button v-for="role in roles" :key="role" type="button" :class="{ selected: selectedRole === role }" @click="selectedRole = role">{{ role }}</button>
           </div>
           <small v-if="selectedRole">Rol elegido: <strong>{{ selectedRole }}</strong>. Puedes cambiarlo cuando quieras.</small>
         </div>
       </section>

       <!-- ===== Guía de trabajo de la misión ===== -->
       <section class="guide-card" aria-labelledby="guide-title">
         <div class="guide-head">
           <div>
             <p class="guide-kicker">Material para la clase</p>
             <h2 id="guide-title">Guía de trabajo</h2>
             <p class="muted small">La guía se trabaja en clases. Acá puedes leerla en la app, escucharla o descargarla.</p>
           </div>
           <SpeakButton v-if="guide && guideSpeakText" :text="guideSpeakText" label="Escuchar la guía" />
         </div>

         <p v-if="guideLoading" class="muted small">Cargando guía…</p>
         <p v-else-if="guideError" class="guide-error" role="alert">{{ guideError }}</p>

         <template v-else-if="guide">
           <div class="guide-actions">
             <button class="btn-guide" @click="guideOpen = !guideOpen">{{ guideOpen ? "Ocultar contenido" : "Leer la guía en la app" }}</button>
             <button class="btn-guide" :disabled="downloadingKind === 'PDF'" @click="downloadGuide('PDF')">
               {{ downloadingKind === "PDF" ? "Descargando…" : "Descargar PDF" }}
             </button>
             <button class="btn-guide" :disabled="downloadingKind === 'DOCX'" @click="downloadGuide('DOCX')">
               {{ downloadingKind === "DOCX" ? "Descargando…" : "Descargar DOCX" }}
             </button>
           </div>

           <div v-if="guideOpen" class="guide-content">
             <template v-if="guideHeading()"><h3 class="guide-heading">{{ guideHeading() }}</h3></template>
             <template v-for="(s, si) in guideSections()" :key="`s${si}`">
               <template v-if="s.kind === 'heading' && si > 0"><h4 class="guide-heading">{{ s.text }}</h4></template>
               <template v-else-if="s.kind === 'list' && s.items">
                 <ul class="guide-list">
                   <li v-for="(li, liIdx) in s.items" :key="liIdx">{{ li }}</li>
                 </ul>
               </template>
               <template v-else-if="s.text"><p class="guide-text">{{ s.text }}</p></template>
             </template>
             <ol v-if="guideItems().length" class="guide-list">
               <li v-for="(it, ii) in guideItems()" :key="ii">{{ it.prompt }}</li>
             </ol>
           </div>
         </template>

         <p v-else class="muted small">No hay guía digital publicada para esta misión todavía.</p>
       </section>

       <FlippedLessonPlayer
         :lesson-blocks="lesson.blocks"
         :progress="progress!"
         :class-id="props.classId"
         @track="onTrack"
       />

       <div v-if="progress?.ready" class="finish-zone">
        <p v-if="missionBadge" class="badge-win" role="status">
          <BadgeArt :icon="MISSION_ICONS[props.classId] ?? 'star'" :earned="true" :size="80" />
          <span>¡Ganaste la medalla «{{ missionBadge.name }}»!</span>
        </p>
         <div class="finish-banner">
           <span class="finish-kicker">{{ missionStage }} · etapa 1 completada</span>
           <h2 class="finish-title">¡Llegaste a la meta de aprendizaje!</h2>
           <p>Ahora falta dejar tu huella: entrega una evidencia, juega el cierre y cuéntale a tu profesora cómo fue.</p>
         </div>

         <div class="stage-roadmap" aria-label="Etapas de la misión">
           <span class="current">1 · Explorar ✓</span><span>→</span><span>2 · Demostrar</span><span>→</span><span>3 · Cerrar</span><span>→</span><span>4 · Contar</span>
         </div>

         <div class="actions-grid">
          <RouterLink :to="`/student/missions/${props.classId}/activities`" class="action-card" :class="'ac-1'" v-tilt="{ max: 10 }">
            <span class="action-icon" aria-hidden="true">✎</span>
            <div>
               <strong>2 · Demostrar: entrega tu evidencia</strong>
               <span class="muted small">Resuelve el desafío de esta misión y recibe comentarios de tu profesora.</span>
            </div>
          </RouterLink>

          <RouterLink :to="`/student/missions/${props.classId}/exit-ticket`" class="action-card" :class="'ac-2'" v-tilt="{ max: 10 }">
            <span class="action-icon" aria-hidden="true">✓</span>
            <div>
               <strong>3 · Cerrar: desbloquea tu idea final</strong>
               <span class="muted small">Responde la última jugada y conecta lo aprendido con Ovalle.</span>
            </div>
          </RouterLink>

          <RouterLink
            v-if="['class-01', 'class-04', 'class-07', 'class-10'].includes(props.classId)"
            :to="`/student/missions/${props.classId}/feedback`"
            class="action-card" :class="'ac-3'" v-tilt="{ max: 10 }"
          >
            <span class="action-icon" aria-hidden="true">★</span>
            <div>
               <strong>4 · Contar: tu voz cuenta</strong>
               <span class="muted small">Cuéntale al equipo docente qué funcionó y qué mejorarías.</span>
            </div>
          </RouterLink>

          <RouterLink
            v-if="props.classId === 'class-11'"
            :to="`/student/missions/${props.classId}/project`"
            class="action-card" :class="'ac-4'" v-tilt="{ max: 10 }"
          >
            <span class="action-icon" aria-hidden="true">★</span>
            <div>
                 <strong>Desafío extra: Proyecto Ovalle 2035</strong>
              <span class="muted small">Diseña tu propuesta para la comuna.</span>
            </div>
          </RouterLink>
        </div>
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
.mission-control { display: grid; grid-template-columns: 1.1fr .9fr; gap: var(--space-4); margin: var(--space-4) 0; padding: var(--space-4); border: 1px solid #8bd0bd; border-radius: 18px; background: linear-gradient(135deg, #eefaf6, #fff); }
.control-kicker { margin: 0; color: var(--color-accent); font-size: .75rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.mission-control h2 { margin: 5px 0; color: var(--color-primary); }
.mission-control p { line-height: 1.5; }
.role-picker { display: flex; flex-direction: column; gap: 8px; justify-content: center; }
.role-options { display: flex; flex-wrap: wrap; gap: 8px; }
.role-options button { border: 1px solid var(--color-primary); border-radius: 999px; padding: 8px 12px; background: #fff; color: var(--color-primary); cursor: pointer; }
.role-options button.selected { background: var(--color-primary); color: #fff; }

/* ===== Guía de trabajo ===== */
.guide-card { margin: var(--space-4) 0; padding: var(--space-4); border: 1px solid var(--color-border); border-left: 6px solid var(--color-primary); border-radius: 16px; background: var(--color-surface); }
.guide-head { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); flex-wrap: wrap; }
.guide-head h2 { margin: 0 0 4px; color: var(--color-primary); }
.guide-kicker { margin: 0 0 2px; color: var(--color-accent); font-size: .72rem; font-weight: 800; text-transform: uppercase; letter-spacing: .07em; }
.guide-error { color: var(--color-danger); }
.guide-actions { display: flex; gap: 8px; flex-wrap: wrap; margin: var(--space-3) 0; }
.btn-guide { border: 1px solid var(--color-primary); border-radius: 999px; padding: 8px 14px; background: var(--color-primary-soft); color: var(--color-primary); font-weight: 700; cursor: pointer; }
.btn-guide:disabled { opacity: .5; cursor: not-allowed; }
.guide-content { border-top: 1px dashed var(--color-border); padding-top: var(--space-4); }
.guide-heading { color: var(--color-primary); margin: var(--space-4) 0 10px; font-size: 1.15rem; }
.guide-list { margin: 10px 0 10px 24px; padding: 0; }
.guide-list li { margin: 14px 0; line-height: 1.8; font-size: 1.08rem; }
.guide-text { margin: 16px 0; line-height: 2; font-size: 1.1rem; }
.ok {
  color: var(--color-accent);
  font-weight: 600;
}
.badge-win {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  background: linear-gradient(135deg, var(--color-accent), #37c3a2);
  color: #fff;
  border-radius: var(--radius);
  padding: var(--space-4);
  font-weight: 700;
  width: 100%;
  text-align: center;
}
.finish-zone {
  margin-top: var(--space-5);
  text-align: center;
}
.finish-banner { padding: var(--space-4); border-radius: 18px; background: linear-gradient(135deg, #0d2f52, #0e7c66); color: #fff; }
.finish-banner p { margin: 6px auto 0; max-width: 650px; line-height: 1.5; }
.finish-kicker { text-transform: uppercase; font-size: .75rem; letter-spacing: .08em; font-weight: 800; opacity: .85; }
.finish-title {
  color: #fff;
  margin: var(--space-3) 0 var(--space-1);
}
.stage-roadmap { display: flex; justify-content: center; align-items: center; flex-wrap: wrap; gap: 8px; margin: var(--space-4) 0; color: var(--color-text-muted); font-size: .85rem; }
.stage-roadmap .current { color: var(--color-accent); font-weight: 800; }
.actions-grid {
  display: grid;
  gap: var(--space-3);
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  margin-top: var(--space-4);
  text-align: left;
}
.action-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-left: 6px solid var(--color-border);
  border-radius: 16px;
  padding: var(--space-4);
  text-decoration: none;
  color: var(--color-text);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.action-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 22px rgba(18, 58, 95, 0.14);
}
.action-card.ac-1 { border-left-color: #2a6fae; }
.action-card.ac-2 { border-left-color: var(--color-accent); }
.action-card.ac-3 { border-left-color: #f6c945; }
.action-card.ac-4 { border-left-color: #e5679b; }
.action-icon {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 1.2rem;
  font-weight: 800;
  color: #fff;
}
.action-card.ac-1 .action-icon { background: #2a6fae; }
.action-card.ac-2 .action-icon { background: var(--color-accent); }
.action-card.ac-3 .action-icon { background: #d8a41f; }
.action-card.ac-4 .action-icon { background: #d84b85; }
.action-card strong {
  display: block;
  font-size: 1rem;
  margin-bottom: 2px;
}
.action-card .small {
  display: block;
  line-height: 1.3;
}
@media (max-width: 640px) {
  .mission-control { grid-template-columns: 1fr; }
}
</style>
