<script setup lang="ts">
defineProps<{ title?: string }>();
</script>

<template>
  <section class="card" :aria-label="title">
    <h3 v-if="title" class="card-title">{{ title }}</h3>
    <slot />
  </section>
</template>

<style scoped>
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: var(--space-4);
}
.card-title {
  margin: 0 0 var(--space-3);
  font-size: 1rem;
}
</style>
