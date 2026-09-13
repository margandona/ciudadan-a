import type { Directive } from "vue";
import VanillaTilt from "vanilla-tilt";

interface TiltOptions {
  max?: number;
  speed?: number;
  scale?: number;
}

/** Directiva `v-tilt` para un efecto 3D sutil al pasar el mouse (respetando reduced-motion). */
export const tilt: Directive<HTMLElement, TiltOptions | undefined> = {
  mounted(el, binding) {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    const opts = binding.value ?? {};
    VanillaTilt.init(el, {
      max: opts.max ?? 8,
      speed: opts.speed ?? 400,
      scale: opts.scale ?? 1.02,
      glare: false,
    });
  },
  unmounted(el) {
    const instance = (el as HTMLElement & { vanillaTilt?: { destroy: () => void } }).vanillaTilt;
    instance?.destroy();
  },
};
