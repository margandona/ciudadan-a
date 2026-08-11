<script setup lang="ts">
defineProps<{ rows?: number }>();
</script>

<template>
  <div class="skeleton" :style="{ height: `${(rows ?? 6) * 34}px` }" aria-hidden="true" aria-label="Cargando" />
</template>

<style scoped>
.skeleton {
  background: linear-gradient(90deg, #eceff3 25%, #f6f7f9 50%, #eceff3 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: var(--radius);
}
@keyframes shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}
</style>
