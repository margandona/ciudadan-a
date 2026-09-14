<script setup lang="ts">
import { onMounted, ref } from "vue";
import { computed } from "vue";
import type { Activity, EvidenceAttachment, Submission } from "@pclab/shared";
import { SUBMISSION_STATUS } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { listActivities, submissionRepo } from "@/infrastructure/appDeps";
import { submitEvidence } from "@/services/importApi";
import { offlineSafe } from "@/services/offlineSafe";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import BaseCard from "@/components/ui/BaseCard.vue";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const props = defineProps<{ classId: string }>();

const session = useSessionStore();
const activities = ref<Activity[]>([]);
const submissions = ref<Map<string, Submission>>(new Map());
const texts = ref<Record<string, string>>({});
const links = ref<Record<string, string>>({});
const attachments = ref<Record<string, EvidenceAttachment[]>>({});
const uploading = ref<Record<string, boolean>>({});
const recordingId = ref("");
const loading = ref(true);
const error = ref("");
const notice = ref("");
const submittingId = ref("");
const copiedAi = ref(false);

const missionLabel: Record<string, string> = {
  "class-07": "Consejo de soluciones",
  "class-08": "Centro de mando presupuestario",
  "class-09": "Laboratorio de pistas",
  "class-10": "Consejo del agua",
  "class-11": "Diseño del futuro",
  "class-12": "Sala de prensa ciudadana",
};
const stageTitle = computed(() => missionLabel[props.classId] ?? "Desafío de misión");

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

function actor() {
  return { uid: session.user?.uid ?? "", role: session.role, courses: session.courses };
}

const aiPrompt = "Actúa como una tutora de Educación Ciudadana. Ayúdame a interpretar este dato sobre desigualdad sin inventar información. Primero describe qué muestra, luego explica qué preguntas faltan y finalmente propone dos acciones posibles. Distingue claramente hechos, interpretaciones y propuestas. No uses datos personales ni reemplaces mis propias palabras.";

async function copyAiPrompt(): Promise<void> {
  try {
    await navigator.clipboard.writeText(aiPrompt);
    copiedAi.value = true;
    window.setTimeout(() => { copiedAi.value = false; }, 2200);
  } catch {
    notice.value = "Selecciona y copia el prompt manualmente.";
  }
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    activities.value = await listActivities.run(props.classId, actor());
    const mine = await submissionRepo.findByStudentAndClass(session.studentId, props.classId);
    submissions.value = new Map(mine.map((s) => [s.activityId, s]));
  } catch (e) {
    error.value = (e as Error).message ?? "No disponible.";
  } finally {
    loading.value = false;
  }
}

async function uploadFile(activity: Activity, file: File, kind: "image" | "audio"): Promise<EvidenceAttachment> {
  const clean = file.name.replace(/[^\w.]/g, "_");
  const path = `submissions/${session.studentId}/${activity.id}/${Date.now()}-${clean}`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, file);
  const url = await getDownloadURL(ref);
  return { type: kind, url, name: file.name, mime: file.type, size: file.size, storagePath: path };
}

function attach(activity: Activity, att: EvidenceAttachment): void {
  attachments.value[activity.id] = [...(attachments.value[activity.id] ?? []), att];
}

function removeAtt(activity: Activity, index: number): void {
  const list = [...(attachments.value[activity.id] ?? [])];
  list.splice(index, 1);
  attachments.value[activity.id] = list;
}

async function onFile(activity: Activity, event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  uploading.value[activity.id] = true;
  error.value = "";
  try {
    const att = await uploadFile(activity, file, "image");
    attach(activity, att);
    notice.value = "Foto adjuntada.";
  } catch (e) {
    error.value = (e as Error).message ?? "No se pudo subir la foto.";
  } finally {
    uploading.value[activity.id] = false;
    input.value = "";
  }
}

async function toggleRecording(activity: Activity): Promise<void> {
  if (recordingId.value === activity.id) {
    mediaRecorder?.stop();
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    error.value = "Tu dispositivo no soporta grabación de audio.";
    return;
  }
  error.value = "";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    audioChunks = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      recordingId.value = "";
      const blob = new Blob(audioChunks, { type: "audio/webm" });
      const file = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
      uploading.value[activity.id] = true;
      try {
        const att = await uploadFile(activity, file, "audio");
        attach(activity, att);
        notice.value = "Audio adjuntado.";
      } catch (e) {
        error.value = (e as Error).message ?? "No se pudo subir el audio.";
      } finally {
        uploading.value[activity.id] = false;
      }
    };
    rec.start();
    mediaRecorder = rec;
    recordingId.value = activity.id;
  } catch {
    error.value = "No se pudo acceder al micrófono.";
  }
}

async function send(activity: Activity): Promise<void> {
  submittingId.value = activity.id;
  error.value = "";
  try {
    const content = activity.evidenceTypes.includes("link") && links.value[activity.id]
      ? { text: links.value[activity.id] }
      : { text: texts.value[activity.id] ?? "" };
    const payload = {
      activityId: activity.id,
      classId: props.classId,
      courseId: session.courseId,
      content,
      attachments: attachments.value[activity.id] ?? [],
    };
    const result = await offlineSafe("submitEvidence", payload, (p) => submitEvidence(p as never));
    if (result.queued) {
      notice.value = "Evidencia guardada en tu dispositivo (PENDIENTE_DE_SINCRONIZAR). Se sincronizará con conexión.";
      return;
    }
    const submission = result.data;
    submissions.value.set(activity.id, submission);
    texts.value[activity.id] = "";
    links.value[activity.id] = "";
    attachments.value[activity.id] = [];
  } catch (e) {
    error.value = (e as Error).message ?? "No se pudo enviar.";
  } finally {
    submittingId.value = "";
  }
}

onMounted(load);
</script>

<template>
  <div>
     <RouterLink :to="`/student/missions/${props.classId}/flipped`" class="back">← Volver a la misión</RouterLink>
     <p class="stage-kicker">Etapa 2 · Demostrar</p>
     <h1>{{ stageTitle }}</h1>
     <p class="muted">Aquí conviertes lo aprendido en una evidencia. Cuando la entregues, podrás ver la retroalimentación de tu profesora en esta misma pantalla.</p>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error && activities.length === 0" :message="error" @retry="load" />

     <BaseCard v-for="activity in activities" :key="activity.id" :title="activity.title" class="activity">
       <p class="muted">{{ activity.description }}</p>
       <div v-if="activity.type === 'aiLab'" class="ai-coach">
         <strong>Modo copilota: la IA te ayuda, pero tú decides</strong>
         <p>Usa una herramienta de IA aprobada por tu profesora. No copies la respuesta completa: verifica una fuente, corrige un error y escribe la conclusión con tus propias palabras.</p>
         <blockquote>{{ aiPrompt }}</blockquote>
         <button type="button" class="btn-ghost" @click="copyAiPrompt">{{ copiedAi ? "Prompt copiado ✓" : "Copiar prompt de investigación" }}</button>
       </div>
       <div v-if="activity.dilemma" class="dilemma">
         <p class="dilemma-kicker">Dilema de la clase</p>
         <h3>{{ activity.dilemma.title }}</h3>
         <p>{{ activity.dilemma.text }}</p>
         <ul v-if="activity.dilemma.perspectives?.length">
           <li v-for="(p, i) in activity.dilemma.perspectives" :key="i"><strong>{{ p.label }}:</strong> {{ p.text }}</li>
         </ul>
         <p v-if="activity.dilemma.question" class="dilemma-q"><strong>Para tu evidencia:</strong> {{ activity.dilemma.question }}</p>
       </div>

       <ol v-if="activity.instructions.length">
        <li v-for="(ins, i) in activity.instructions" :key="i">{{ ins }}</li>
      </ol>

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>

      <div v-if="submissions.get(activity.id)" class="delivered">
        <BaseBadge :tone="submissions.get(activity.id)!.status === SUBMISSION_STATUS.ENTREGADO ? 'success' : 'neutral'">
          {{ submissions.get(activity.id)!.status }}
        </BaseBadge>
        <div v-if="submissions.get(activity.id)!.attachments?.length" class="attachments">
          <a
            v-for="(att, i) in submissions.get(activity.id)!.attachments"
            :key="i"
            :href="att.url"
            target="_blank"
            rel="noopener"
            class="attachment"
          >{{ att.type === "audio" ? "AUDIO" : att.type === "image" ? "IMAGEN" : "ARCHIVO" }} — {{ att.name ?? att.type }}</a>
        </div>
        <p v-if="submissions.get(activity.id)!.teacherFeedback" class="feedback">
          Retroalimentación: {{ submissions.get(activity.id)!.teacherFeedback }}
        </p>
        <p v-if="submissions.get(activity.id)!.score !== null" class="feedback">
          Nota: {{ submissions.get(activity.id)!.score }}
        </p>
      </div>

      <form v-else class="form" @submit.prevent="send(activity)">
        <template v-if="activity.evidenceTypes.includes('link')">
          <label :for="`link-${activity.id}`">Enlace</label>
          <input :id="`link-${activity.id}`" v-model="links[activity.id]" type="url" class="text-input" placeholder="https://…" />
        </template>
        <template v-else>
          <label :for="`text-${activity.id}`">Tu evidencia</label>
          <textarea :id="`text-${activity.id}`" v-model="texts[activity.id]" rows="4" class="text-input"></textarea>
        </template>

        <div class="media-row">
          <label class="btn-ghost">
            {{ uploading[activity.id] ? "Subiendo…" : "Adjuntar foto" }}
            <input type="file" accept="image/*" class="sr-input" :disabled="uploading[activity.id]" @change="onFile(activity, $event)" />
          </label>
          <button type="button" class="btn-ghost" :disabled="uploading[activity.id]" @click="toggleRecording(activity)">
            {{ recordingId === activity.id ? "Detener grabación" : "Grabar audio" }}
          </button>
        </div>

        <div v-if="attachments[activity.id]?.length" class="attachments">
          <span v-for="(att, i) in attachments[activity.id]" :key="i" class="attachment pending">
            {{ att.type === "audio" ? "AUDIO" : att.type === "image" ? "IMAGEN" : "ARCHIVO" }} — {{ att.name }}
            <button type="button" class="remove" :aria-label="`Quitar ${att.name}`" @click="removeAtt(activity, i)">×</button>
          </span>
        </div>

        <button class="btn btn-primary" type="submit" :disabled="submittingId === activity.id">
          {{ submittingId === activity.id ? "Enviando…" : "Entregar evidencia" }}
        </button>
      </form>
    </BaseCard>

     <p v-if="!loading && activities.length === 0" class="muted">No hay actividades disponibles en esta clase.</p>
     <RouterLink :to="`/student/missions/${props.classId}/exit-ticket`" class="next-stage">
       Cuando termines tu evidencia, juega la última jugada →
     </RouterLink>
  </div>
</template>

<style scoped>
.back {
  text-decoration: none;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
.stage-kicker { margin: var(--space-3) 0 0; color: var(--color-accent); font-size: .78rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.next-stage { display: inline-block; margin-top: var(--space-4); color: var(--color-primary); font-weight: 800; text-decoration: none; }
.ai-coach { margin: var(--space-3) 0; padding: var(--space-3); border: 1px solid #9c8be8; border-radius: 14px; background: #f5f2ff; }
.ai-coach p { line-height: 1.5; }
.ai-coach blockquote { margin: var(--space-2) 0; padding: 10px; border-left: 4px solid #7561c9; background: #fff; color: var(--color-text); line-height: 1.5; }
.muted {
  color: var(--color-text-muted);
}
.activity {
  margin: var(--space-4) 0;
}
.dilemma {
  margin: var(--space-3) 0;
  padding: var(--space-3) var(--space-4);
  border: 1px solid #2f9e83;
  border-left: 6px solid #2f9e83;
  border-radius: 14px;
  background: #eefaf6;
}
.dilemma-kicker {
  margin: 0;
  color: #0e7c66;
  font-size: .72rem;
  font-weight: 800;
  letter-spacing: .07em;
  text-transform: uppercase;
}
.dilemma h3 {
  margin: 4px 0 6px;
  color: var(--color-primary);
}
.dilemma p {
  margin: 0 0 8px;
  line-height: 1.5;
}
.dilemma ul {
  margin: 0 0 8px;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dilemma-q {
  margin: 0;
  color: var(--color-primary);
}
.delivered {
  margin-top: var(--space-3);
}
.feedback {
  color: var(--color-accent);
}
.error {
  color: var(--color-danger);
}
.notice {
  background: var(--color-primary-soft);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius);
  color: var(--color-primary);
}
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
.text-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-family: inherit;
  font-size: 1rem;
}
.media-row {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-primary);
  border-radius: 999px;
  padding: 8px 14px;
  cursor: pointer;
  font-size: 0.9rem;
}
.btn-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.sr-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.attachments {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-2) 0;
}
.attachment {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.85rem;
  background: var(--color-surface);
  color: var(--color-text);
}
.attachment.pending {
  background: var(--color-primary-soft);
}
.remove {
  background: transparent;
  border: none;
  color: var(--color-danger);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}
</style>
