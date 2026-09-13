<script setup lang="ts">
import { useSpeech } from "@/composables/useSpeech";

defineProps<{ text: string; label?: string }>();

const { supported, speaking, toggle } = useSpeech();
</script>

<template>
  <button
    v-if="supported && text"
    type="button"
    class="speak"
    :class="{ active: speaking }"
    :aria-pressed="speaking"
    @click="toggle(text)"
  >
    <span aria-hidden="true">{{ speaking ? "■" : "▶" }}</span>
    {{ label ?? (speaking ? "Detener" : "Escuchar") }}
  </button>
</template>

<style scoped>
.speak {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-primary);
  font-size: 0.85rem;
  padding: 4px 12px;
  cursor: pointer;
}
.speak.active {
  border-color: var(--color-accent);
  background: var(--color-primary-soft);
}
</style>
