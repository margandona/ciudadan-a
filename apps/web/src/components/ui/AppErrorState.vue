<script setup lang="ts">
defineProps<{ message?: string }>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="state" role="alert">
    <p>{{ message ?? "Ocurrió un error. Inténtalo de nuevo." }}</p>
    <button class="btn btn-ghost" @click="emit('retry')">Reintentar</button>
  </div>
</template>

<style scoped>
.state {
  text-align: center;
  padding: var(--space-5);
  color: var(--color-danger);
}
</style>
