<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { FeedbackApp, FeedbackLearning } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { submitFeedback } from "@/services/importApi";
import { offlineSafe } from "@/services/offlineSafe";
import BaseCard from "@/components/ui/BaseCard.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const props = defineProps<{ classId: string }>();

const session = useSessionStore();
const anon = ref(true);
const app = ref<FeedbackApp>({ easyToFind: 3, clear: 3, working: 3, open: "" });
const learning = ref<FeedbackLearning>({ objective: 3, clarity: 3, helpful: 3, participated: 3, comfortable: 3, bestActivity: "", change: "", keep: "" });
const sent = ref(false);
const pending = ref(false);
const busy = ref(false);
const error = ref("");

const appRows: { key: keyof Omit<FeedbackApp, "open">; label: string }[] = [
  { key: "easyToFind", label: "Fue fácil encontrar el material" },
  { key: "clear", label: "La aplicación fue clara" },
  { key: "working", label: "Las actividades funcionaron correctamente" },
];

const learningRows: { key: keyof Omit<FeedbackLearning, "bestActivity" | "change" | "keep">; label: string }[] = [
  { key: "objective", label: "Entendí el objetivo de la clase" },
  { key: "clarity", label: "Las explicaciones fueron claras" },
  { key: "helpful", label: "Las actividades me ayudaron a comprender" },
  { key: "participated", label: "Pude participar" },
  { key: "comfortable", label: "Me sentí cómoda preguntando" },
];

async function send(): Promise<void> {
  busy.value = true;
  error.value = "";
  try {
    const payload = { classId: props.classId, courseId: session.courseId, anon: anon.value, app: app.value, learning: learning.value };
    const result = await offlineSafe("submitFeedback", payload, (p) => submitFeedback(p as never));
    sent.value = true;
    pending.value = result.queued;
    error.value = "";
  } catch (e) {
    error.value = (e as Error).message ?? "No se pudo enviar.";
  } finally {
    busy.value = false;
  }
}

onMounted(() => undefined);
</script>

<template>
  <div>
     <RouterLink :to="`/student/missions/${props.classId}/flipped`" class="back">← Volver a la misión</RouterLink>
     <p class="stage-kicker">Etapa 4 · Contar</p>
     <h1>Tu voz cuenta</h1>
     <p class="muted">Cuéntale a tu profesora cómo viviste la misión. Tu opinión es privada y puedes enviarla en forma anónima.</p>

    <AppErrorState v-if="error" :message="error" @retry="send" />

    <BaseCard v-if="!sent" class="card">
      <form class="form" @submit.prevent="send">
        <label class="row">
          <input type="checkbox" v-model="anon" />
          Enviar de forma anónima (el profesor solo verá tendencias)
        </label>

        <h2>A. Experiencia con la aplicación</h2>
        <div v-for="row in appRows" :key="row.key" class="row">
          <span>{{ row.label }}</span>
          <select v-model="app[row.key]" class="select" :aria-label="row.label">
            <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>
        <label for="app-open">¿Qué mejorarías de la aplicación?</label>
        <textarea id="app-open" v-model="app.open" rows="2"></textarea>

        <h2>B. Experiencia de aprendizaje y docencia</h2>
        <div v-for="row in learningRows" :key="row.key" class="row">
          <span>{{ row.label }}</span>
          <select v-model="learning[row.key]" class="select" :aria-label="row.label">
            <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
          </select>
        </div>
        <label for="best">¿Qué actividad te ayudó más?</label>
        <textarea id="best" v-model="learning.bestActivity" rows="2"></textarea>
        <label for="change">¿Qué cambiarías de la clase?</label>
        <textarea id="change" v-model="learning.change" rows="2"></textarea>
        <label for="keep">¿Qué debería mantener el profesor?</label>
        <textarea id="keep" v-model="learning.keep" rows="2"></textarea>

         <button class="btn btn-primary" type="submit" :disabled="busy">{{ busy ? "Enviando…" : "Dejar mi voz" }}</button>
      </form>
    </BaseCard>

     <p v-else-if="sent" class="ok" role="status">
       {{ pending ? "Feedback guardado en tu dispositivo. Se sincronizará cuando tengas conexión." : "¡Gracias por tu feedback! Se guardó de forma privada." }}
       <br /><RouterLink to="/student" class="next-stage">Volver a mi ruta de misiones →</RouterLink>
    </p>
  </div>
</template>

<style scoped>
.back {
  text-decoration: none;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
.stage-kicker { margin: var(--space-3) 0 0; color: var(--color-accent); font-size: .78rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.next-stage { color: var(--color-primary); text-decoration: none; }
.muted {
  color: var(--color-text-muted);
}
.card {
  margin-top: var(--space-4);
}
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.row {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  justify-content: space-between;
}
.select {
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  width: 70px;
}
textarea {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-family: inherit;
  font-size: 1rem;
}
h2 {
  margin: var(--space-4) 0 var(--space-2);
  font-size: 1.05rem;
}
.ok {
  color: var(--color-accent);
  font-weight: 600;
}
</style>
