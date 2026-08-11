<script setup lang="ts">
import { onMounted, ref } from "vue";
import type { ExitTicket } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import { submitExitTicket } from "@/services/importApi";
import BaseCard from "@/components/ui/BaseCard.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const props = defineProps<{ classId: string }>();

const session = useSessionStore();
const form = ref<ExitTicket["answers"]>({ learned: "", evidence: "", concept: "", question: "", relationOvalle: "" });
const difficulty = ref(3);
const sent = ref(false);
const loading = ref(false);
const error = ref("");

async function send(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    await submitExitTicket({
      classId: props.classId,
      courseId: session.courseId,
      answers: form.value,
      difficulty: difficulty.value,
    });
    sent.value = true;
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
    <RouterLink to="/student" class="back">← Mis misiones</RouterLink>
    <h1>Ticket de salida</h1>
    <p class="muted">Cierra la clase con tus propias palabras.</p>

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
          {{ loading ? "Enviando…" : "Enviar ticket" }}
        </button>
      </form>
    </BaseCard>

    <p v-else class="ok" role="status">¡Ticket enviado! Gracias por cerrar la clase.</p>
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
