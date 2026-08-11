<script setup lang="ts">
defineProps<{ message?: string }>();
</script>

<template>
  <div class="state">
    <p>{{ message ?? "No hay datos todavía." }}</p>
    <slot />
  </div>
</template>

<style scoped>
.state {
  text-align: center;
  padding: var(--space-5);
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius);
}
</style>
