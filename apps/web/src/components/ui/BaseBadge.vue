<script setup lang="ts">
defineProps<{ tone?: "neutral" | "success" | "warning" | "danger" }>();
</script>

<template>
  <span class="badge" :data-tone="tone ?? 'neutral'"><slot /></span>
</template>

<style scoped>
.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}
.badge[data-tone="neutral"] {
  background: var(--color-primary-soft);
  color: var(--color-primary);
}
.badge[data-tone="success"] {
  background: #e2f4ee;
  color: var(--color-accent);
}
.badge[data-tone="warning"] {
  background: #fdf3e0;
  color: var(--color-warning);
}
.badge[data-tone="danger"] {
  background: #fdecea;
  color: var(--color-danger);
}
</style>
