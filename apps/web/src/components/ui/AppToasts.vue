<script setup lang="ts">
import { dismiss, notices } from "@/composables/useNotify";
</script>

<template>
  <Teleport to="body">
    <div class="toasts" role="status" aria-live="polite">
      <TransitionGroup name="toast">
        <button
          v-for="n in notices"
          :key="n.id"
          type="button"
          class="toast"
          :class="n.kind"
          @click="dismiss(n.id)"
        >
          <span class="toast-ico" aria-hidden="true">{{ n.icon }}</span>
          <span class="toast-body">
            <strong>{{ n.title }}</strong>
            <small v-if="n.detail">{{ n.detail }}</small>
          </span>
          <span class="toast-x" aria-hidden="true">×</span>
        </button>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toasts {
  position: fixed;
  top: var(--space-3);
  right: var(--space-3);
  z-index: 4000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(360px, 92vw);
  pointer-events: none;
}
.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  border: 1px solid var(--color-border);
  border-left: 5px solid var(--color-accent);
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 12px;
  padding: 10px 12px;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.22);
  cursor: pointer;
  font: inherit;
}
.toast.badge { border-left-color: #e0b34f; }
.toast.level { border-left-color: #7a5af8; }
.toast.xp { border-left-color: #2f9e83; }
.toast.item { border-left-color: #d44f85; }
.toast.coins { border-left-color: #b8860b; }
.toast.info { border-left-color: #5b6572; }
.toast-ico { font-size: 1.4rem; line-height: 1; }
.toast-body { display: flex; flex-direction: column; flex: 1; }
.toast-body strong { font-size: 0.92rem; }
.toast-body small { color: var(--color-text-muted); font-size: 0.78rem; }
.toast-x { color: var(--color-text-muted); font-size: 1.1rem; line-height: 1; }

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: none;
  }
}
</style>
