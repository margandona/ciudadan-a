<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(defineProps<{ style?: string; message?: string; size?: number }>(), {
  style: "orb",
  size: 44,
});
const dim = computed(() => ({ "--ls": `${props.size}px` } as Record<string, string>));
</script>

<template>
  <div class="loader" :class="style" :style="dim" role="status" aria-live="polite">
    <template v-if="style === 'orb'">
      <span class="orb" aria-hidden="true"></span>
    </template>
    <template v-else-if="style === 'dots'">
      <span class="dot" aria-hidden="true"></span>
      <span class="dot" aria-hidden="true"></span>
      <span class="dot" aria-hidden="true"></span>
    </template>
    <template v-else-if="style === 'ring'">
      <span class="ring" aria-hidden="true"></span>
    </template>
    <template v-else-if="style === 'pulse'">
      <span class="pulse" aria-hidden="true"></span>
    </template>
    <template v-else-if="style === 'sparkle'">
      <span class="spark" aria-hidden="true"></span>
      <span class="spark" aria-hidden="true"></span>
      <span class="spark" aria-hidden="true"></span>
    </template>
    <template v-else-if="style === 'leaf'">
      <span class="leaf" aria-hidden="true"></span>
    </template>
    <template v-else-if="style === 'wave'">
      <span class="wave" aria-hidden="true"></span>
      <span class="wave" aria-hidden="true"></span>
      <span class="wave" aria-hidden="true"></span>
    </template>
    <template v-else-if="style === 'gear'">
      <span class="gear" aria-hidden="true"></span>
    </template>
    <template v-else-if="style === 'coin'">
      <span class="coin" aria-hidden="true"></span>
    </template>
    <template v-else-if="style === 'rocket'">
      <span class="rocket" aria-hidden="true"></span>
    </template>
    <p v-if="message" class="text">{{ message }}</p>
  </div>
</template>

<style scoped>
.loader {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: calc(var(--ls) * 0.35);
  color: var(--color-text-muted);
}
.text {
  width: 100%;
  margin: 8px 0 0;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 600;
}
/* Orbe líquido */
.orb {
  width: var(--ls);
  height: var(--ls);
  border-radius: 46% 54% 58% 42% / 48% 44% 56% 52%;
  background: conic-gradient(from 200deg, #2f9e83, #37c3a2, #123a5f, #2f9e83);
  box-shadow: inset -4px -6px 14px rgba(13, 35, 60, 0.45), inset 4px 6px 14px rgba(255, 255, 255, 0.4),
    0 8px 18px rgba(13, 35, 60, 0.25);
  position: relative;
  animation: morph 3.6s ease-in-out infinite;
}
.orb::before {
  content: "";
  position: absolute;
  top: calc(var(--ls) * 0.12);
  left: calc(var(--ls) * 0.16);
  width: calc(var(--ls) * 0.24);
  height: calc(var(--ls) * 0.16);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  filter: blur(2px);
  animation: shine 3.6s ease-in-out infinite;
}
@keyframes morph {
  0%, 100% { border-radius: 46% 54% 58% 42% / 48% 44% 56% 52%; transform: rotate(0deg) scale(1); }
  33% { border-radius: 60% 40% 45% 55% / 42% 60% 40% 58%; transform: rotate(8deg) scale(1.05); }
  66% { border-radius: 40% 60% 58% 42% / 55% 42% 58% 45%; transform: rotate(-8deg) scale(0.97); }
}
@keyframes shine {
  0%, 100% { opacity: 0.45; transform: translate(0, 0); }
  50% { opacity: 0.95; transform: translate(calc(var(--ls) * 0.12), calc(var(--ls) * 0.18)); }
}
/* Gotitas */
.dot {
  width: calc(var(--ls) * 0.26);
  height: calc(var(--ls) * 0.26);
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  background: linear-gradient(135deg, #2f9e83, #37c3a2);
  animation: bounce 1.2s ease-in-out infinite;
}
.dot:nth-child(2) { animation-delay: 0.18s; }
.dot:nth-child(3) { animation-delay: 0.36s; }
@keyframes bounce {
  0%, 100% { transform: rotate(-45deg) translateY(0); opacity: 0.6; }
  50% { transform: rotate(-45deg) translateY(calc(var(--ls) * -0.3)); opacity: 1; }
}
/* Anillo */
.ring {
  width: var(--ls);
  height: var(--ls);
  border-radius: 50%;
  border: calc(var(--ls) * 0.1) solid rgba(46, 125, 138, 0.2);
  border-top-color: #2f9e83;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
/* Latido */
.pulse {
  width: calc(var(--ls) * 0.62);
  height: calc(var(--ls) * 0.62);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #7fe3c8, #2f9e83 70%);
  animation: beat 1.1s ease-in-out infinite;
}
@keyframes beat {
  0%, 100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(47, 158, 131, 0.45); }
  45% { transform: scale(1); box-shadow: 0 0 0 calc(var(--ls) * 0.18) rgba(47, 158, 131, 0); }
  60% { transform: scale(0.95); }
}
/* Destellos */
.spark {
  width: calc(var(--ls) * 0.28);
  height: calc(var(--ls) * 0.28);
  background: linear-gradient(135deg, #ffd166, #fff3c4);
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  animation: twinkle 1.4s ease-in-out infinite;
}
.spark:nth-child(2) { animation-delay: 0.2s; }
.spark:nth-child(3) { animation-delay: 0.4s; }
@keyframes twinkle {
  0%, 100% { transform: scale(0.6) rotate(0deg); opacity: 0.5; }
  50% { transform: scale(1.1) rotate(90deg); opacity: 1; }
}
/* Brote */
.leaf {
  width: calc(var(--ls) * 0.5);
  height: calc(var(--ls) * 0.5);
  background: linear-gradient(135deg, #7fe3c8, #2f9e83);
  border-radius: 0 100% 0 100%;
  transform-origin: bottom left;
  animation: grow 1.6s ease-in-out infinite;
}
@keyframes grow {
  0%, 100% { transform: rotate(0deg) scale(0.7); opacity: 0.6; }
  50% { transform: rotate(-12deg) scale(1); opacity: 1; }
}
/* Ondas */
.wave {
  width: calc(var(--ls) * 0.22);
  height: calc(var(--ls) * 0.7);
  border-radius: 999px;
  background: linear-gradient(180deg, #37c3a2, #2f9e83);
  animation: swell 1.2s ease-in-out infinite;
}
.wave:nth-child(2) { animation-delay: 0.15s; }
.wave:nth-child(3) { animation-delay: 0.3s; }
@keyframes swell {
  0%, 100% { transform: scaleY(0.5); opacity: 0.6; }
  50% { transform: scaleY(1); opacity: 1; }
}
/* Engranaje */
.gear {
  width: var(--ls);
  height: var(--ls);
  border-radius: 50%;
  border: calc(var(--ls) * 0.16) dashed #2f9e83;
  animation: spin 1.4s linear infinite;
}
/* Moneda */
.coin {
  width: calc(var(--ls) * 0.8);
  height: calc(var(--ls) * 0.8);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ffe9a3, #e0b34f 70%);
  box-shadow: inset 0 0 0 calc(var(--ls) * 0.08) #b7791f;
  animation: flip 1.4s ease-in-out infinite;
}
@keyframes flip {
  0%, 100% { transform: rotateY(0deg) scale(1); }
  50% { transform: rotateY(180deg) scale(0.85); }
}
/* Cohete */
.rocket {
  width: calc(var(--ls) * 0.34);
  height: calc(var(--ls) * 0.6);
  background: linear-gradient(180deg, #e8eef5, #8fb9e6);
  border-radius: 50% 50% 20% 20%;
  position: relative;
  animation: lift 1.2s ease-in-out infinite;
}
.rocket::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: calc(var(--ls) * -0.18);
  width: calc(var(--ls) * 0.2);
  height: calc(var(--ls) * 0.3);
  transform: translateX(-50%);
  background: radial-gradient(circle, #ffd166, #ff8c42 70%, transparent);
  border-radius: 50%;
}
@keyframes lift {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(calc(var(--ls) * -0.18)); }
}
</style>
