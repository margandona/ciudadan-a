<script setup lang="ts">
import { computed } from "vue";
import { avatarUrl, frameEmojiFor, tierFor } from "@/composables/useAvatar";

const props = withDefaults(
  defineProps<{
    seed: string;
    style?: string;
    level?: number;
    size?: number;
    hideLevel?: boolean;
    /** Emoji de accesorio equipado (arriba a la derecha). */
    accessory?: string;
    /** Emoji de vestimenta equipada (abajo a la izquierda). */
    outfit?: string;
  }>(),
  { size: 128, hideLevel: false },
);

const url = computed(() => avatarUrl({ style: props.style || "adventurer", seed: props.seed }, props.size));
const tier = computed(() => tierFor(props.level ?? 1));
const emoji = computed(() => (props.hideLevel ? null : frameEmojiFor(props.level ?? 1)));
const emojiSize = computed(() => Math.max(15, Math.round(props.size * 0.2)));
</script>

<template>
  <span class="avatar" :class="`t${tier}`" :style="{ width: `${size}px`, height: `${size}px` }">
    <img :src="url" :width="size" :height="size" alt="Avatar de mi personaje" loading="lazy" />
    <span v-if="outfit" class="corner outfit" :style="{ fontSize: `${emojiSize}px` }" aria-hidden="true">{{ outfit }}</span>
    <span v-if="emoji" class="corner" :style="{ fontSize: `${emojiSize}px` }" aria-hidden="true">{{ emoji }}</span>
    <span v-if="accessory" class="corner accessory" :style="{ fontSize: `${emojiSize}px` }" aria-hidden="true">{{ accessory }}</span>
  </span>
</template>

<style scoped>
.avatar {
  position: relative;
  display: inline-flex;
  border-radius: 24%;
  overflow: visible;
  background: var(--color-surface);
  box-shadow: var(--shadow);
}
.avatar img {
  width: 100%;
  height: 100%;
  border-radius: 24%;
  border: 3px solid transparent;
  object-fit: cover;
}
.avatar.t0 img { border-color: #9fb3c8; }
.avatar.t1 img { border-color: #2f9e83; box-shadow: 0 0 0 3px rgba(47, 158, 131, 0.25); }
.avatar.t2 img { border-color: #e0b34f; box-shadow: 0 0 0 4px rgba(224, 179, 79, 0.35); }
.avatar.t3 img {
  border-color: #ffd166;
  box-shadow: 0 0 0 4px rgba(255, 209, 102, 0.5), 0 0 22px rgba(255, 209, 102, 0.55);
}
.corner {
  position: absolute;
  right: -9px;
  bottom: -9px;
  line-height: 1;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.25));
  animation: float 3s ease-in-out infinite;
}
.corner.outfit {
  right: auto;
  left: -9px;
  bottom: -9px;
  animation-delay: 0.6s;
}
.corner.accessory {
  right: -9px;
  bottom: auto;
  top: -9px;
  animation-delay: 1.2s;
}
@keyframes float {
  0%, 100% { transform: translateY(0) rotate(-4deg); }
  50% { transform: translateY(-3px) rotate(6deg); }
}
</style>
