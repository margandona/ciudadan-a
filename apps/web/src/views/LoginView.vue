<script setup lang="ts">
import { useSessionStore } from "@/stores/session";
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

const session = useSessionStore();
const route = useRoute();
const router = useRouter();
const email = ref("");
const password = ref("");
const busy = ref(false);

async function submit(): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  try {
    await session.login(email.value, password.value);
    // El guard redirige por rol desde la home.
    await router.push(typeof route.query.redirect === "string" ? route.query.redirect : "/");
  } catch {
    // session.error ya contiene el mensaje
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="login-wrap">
    <form class="login-card" @submit.prevent="submit" aria-label="Iniciar sesión">
      <h1>Providencia Ciudadanía Lab</h1>
      <p class="muted">Observatorio Ciudadano — Ovalle 2035</p>

      <label for="email">Correo institucional</label>
      <input id="email" v-model="email" type="email" autocomplete="username" required />

      <label for="password">Contraseña</label>
      <input id="password" v-model="password" type="password" autocomplete="current-password" required />

      <p v-if="session.error" class="error" role="alert">{{ session.error }}</p>

      <button class="btn btn-primary" type="submit" :disabled="busy">
        {{ busy ? "Entrando…" : "Entrar" }}
      </button>

      <p class="muted small">
        Modo desarrollo: usa el emulador de Firebase y el usuario docente de prueba
        (ver <code>scripts/seed-demo-teacher.ts</code>).
      </p>
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
input {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 1rem;
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
