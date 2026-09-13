<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { ExitTicket } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { submitExitTicket } from "@/services/importApi";
import { offlineSafe } from "@/services/offlineSafe";
import BaseCard from "@/components/ui/BaseCard.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const props = defineProps<{ classId: string }>();

const session = useSessionStore();
const form = ref<ExitTicket["answers"]>({ learned: "", evidence: "", concept: "", question: "", relationOvalle: "" });
const difficulty = ref(3);
const sent = ref(false);
const pending = ref(false);
const loading = ref(false);
const error = ref("");

async function send(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const payload = {
      classId: props.classId,
      courseId: session.courseId,
      answers: form.value,
      difficulty: difficulty.value,
    };
    const result = await offlineSafe("submitExitTicket", payload, (p) => submitExitTicket(p as never));
    sent.value = true;
    pending.value = result.queued;
    error.value = "";
  } catch (e) {
    error.value = (e as Error).message ?? "No se pudo enviar.";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loading.value = false;
});
</script>

<template>
  <div>
     <RouterLink :to="`/student/missions/${props.classId}/flipped`" class="back">← Volver a la misión</RouterLink>
     <p class="stage-kicker">Etapa 3 · Cerrar</p>
     <h1>La última jugada</h1>
     <p class="muted">Cierra la misión con tus propias palabras: qué descubriste, qué evidencia te convenció y qué pregunta te queda.</p>

    <AppErrorState v-if="error" :message="error" @retry="send" />

    <BaseCard v-if="!sent" class="ticket">
      <form class="form" @submit.prevent="send">
        <label for="learned">¿Qué aprendí hoy?</label>
        <textarea id="learned" v-model="form.learned" rows="2" required></textarea>

        <label for="evidence">¿Qué evidencia me ayudó?</label>
        <textarea id="evidence" v-model="form.evidence" rows="2" required></textarea>

        <label for="concept">¿Qué concepto puedo explicar?</label>
        <textarea id="concept" v-model="form.concept" rows="2" required></textarea>

        <label for="question">¿Qué pregunta todavía tengo?</label>
        <textarea id="question" v-model="form.question" rows="2" required></textarea>

        <label for="relation">¿Cómo se relaciona esto con Ovalle?</label>
        <textarea id="relation" v-model="form.relationOvalle" rows="2" required></textarea>

        <label for="difficulty">Dificultad percibida (1 = fácil … 5 = difícil)</label>
        <input id="difficulty" v-model.number="difficulty" type="range" min="1" max="5" step="1" />
        <span class="muted">{{ difficulty }}/5</span>

        <button class="btn btn-primary" type="submit" :disabled="loading">
           {{ loading ? "Enviando…" : "Guardar mi última jugada" }}
        </button>
      </form>
    </BaseCard>

     <p v-else class="ok" role="status">
       {{ pending ? "¡Ticket guardado! Se sincronizará cuando tengas conexión." : "¡Ticket enviado! Gracias por cerrar la clase." }}
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
.ticket {
  margin-top: var(--space-4);
}
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.form textarea,
.form input[type="text"],
.form input[type="range"] {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-family: inherit;
  font-size: 1rem;
}
.ok {
  color: var(--color-accent);
  font-weight: 600;
}
</style>
