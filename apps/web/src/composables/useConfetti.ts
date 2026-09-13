import confetti from "canvas-confetti";

/** Celebración con confeti (respeta prefers-reduced-motion). */
export function celebrate(opts?: { count?: number; duration?: number }): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
  const count = opts?.count ?? 120;
  const duration = opts?.duration ?? 1800;
  confetti({ particleCount: count, spread: 100, startVelocity: 38, origin: { y: 0.6 } });
  const end = Date.now() + duration;
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.6 } });
    confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.6 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}
