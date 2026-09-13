/** Sonidos de refuerzo con Web Audio API (sin archivos). Respeta prefers-reduced-motion y el toggle de sonido. */
let ctx: AudioContext | null = null;
let muted = typeof window !== "undefined" && localStorage.getItem("pclab-sound") === "0";

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return null;
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = "sine", volume = 0.12): void {
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = c.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const useSounds = {
  /** Respuesta correcta: dos notas ascendentes. */
  correct(): void {
    tone(660, 0, 0.12, "triangle");
    tone(880, 0.12, 0.16, "triangle");
  },
  /** Respuesta incorrecta: un zumbido grave. */
  wrong(): void {
    tone(220, 0, 0.22, "sawtooth", 0.06);
    tone(180, 0.1, 0.2, "sawtooth", 0.05);
  },
  /** Victoria / medalla: arpegio. */
  win(): void {
    tone(523, 0, 0.14, "triangle");
    tone(659, 0.14, 0.14, "triangle");
    tone(784, 0.28, 0.14, "triangle");
    tone(1047, 0.42, 0.3, "triangle", 0.14);
  },
  /** Click suave. */
  click(): void {
    tone(440, 0, 0.05, "sine", 0.05);
  },
  setMuted(value: boolean): void {
    muted = value;
    if (typeof window !== "undefined") localStorage.setItem("pclab-sound", value ? "0" : "1");
  },
  isMuted(): boolean {
    return muted;
  },
};
