import { computed, ref } from "vue";
import { AVATAR_STYLES } from "@pclab/shared";

export { AVATAR_STYLES };

const KEY = "pclab-avatar";

export interface AvatarPref {
  style: string;
  seed: string;
}

export interface AvatarFeature {
  minLevel: number;
  label: string;
  icon: string;
}

export const AVATAR_FEATURES: AvatarFeature[] = [
  { minLevel: 2, label: "Marco ciudadana", icon: "⭐" },
  { minLevel: 3, label: "Destellos", icon: "✨" },
  { minLevel: 4, label: "Corona cívica", icon: "👑" },
  { minLevel: 5, label: "Alas del bien común", icon: "🕊️" },
  { minLevel: 6, label: "Aura arcoíris", icon: "🌈" },
  { minLevel: 7, label: "Estrella del Observatorio", icon: "🌟" },
  { minLevel: 8, label: "Capa de oro", icon: "🏆" },
];

export function tierFor(level: number): number {
  if (level >= 7) return 3;
  if (level >= 4) return 2;
  if (level >= 2) return 1;
  return 0;
}

export function frameEmojiFor(level: number): string | null {
  const unlocked = AVATAR_FEATURES.filter((f) => level >= f.minLevel);
  if (!unlocked.length) return null;
  return unlocked[unlocked.length - 1]!.icon;
}

export function avatarUrl(pref: AvatarPref, size = 128): string {
  const safe = pref.style || "adventurer";
  return `https://api.dicebear.com/9.x/${encodeURIComponent(safe)}/svg?seed=${encodeURIComponent(pref.seed || "ciudadana")}&size=${size}&backgroundColor=f6f7f9`;
}

export function loadAvatarPref(fallbackSeed?: string): AvatarPref {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AvatarPref;
      if (parsed?.style && parsed.seed) return parsed;
    }
  } catch {
    // se usa el predeterminado
  }
  return { style: "adventurer", seed: fallbackSeed || "ciudadana-2035" };
}

export function saveAvatarPref(pref: AvatarPref): void {
  localStorage.setItem(KEY, JSON.stringify(pref));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pclab-avatar"));
  }
}

export function useAvatar(fallbackSeed?: string) {
  const pref = ref<AvatarPref>(loadAvatarPref(fallbackSeed));
  const seed = computed(() => pref.value.seed);
  const style = computed(() => pref.value.style);

  function choose(next: AvatarPref): void {
    pref.value = next;
    saveAvatarPref(next);
  }
  return { pref, seed, style, choose };
}
