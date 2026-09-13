import { ref } from "vue";
import { useSounds } from "./useSounds";

/** Sistema global de notificaciones (toasts) para recompensas y avisos. */

export type NoticeKind = "xp" | "badge" | "item" | "level" | "coins" | "info";

export interface Notice {
  id: number;
  kind: NoticeKind;
  icon: string;
  title: string;
  detail?: string;
}

const DEFAULT_ICON: Record<NoticeKind, string> = {
  xp: "⭐",
  badge: "🏅",
  item: "🎁",
  level: "🚀",
  coins: "🪙",
  info: "ℹ️",
};

export const notices = ref<Notice[]>([]);
let seq = 0;

export interface NotifyInput {
  kind: NoticeKind;
  title: string;
  detail?: string;
  icon?: string;
  /** Por defecto suena; usa `sound: false` para avisos silenciosos. */
  sound?: boolean;
}

export function notify(input: NotifyInput, ttl = 6000): number {
  const id = ++seq;
  const notice: Notice = {
    id,
    kind: input.kind,
    icon: input.icon ?? DEFAULT_ICON[input.kind],
    title: input.title,
    detail: input.detail,
  };
  notices.value = [notice, ...notices.value].slice(0, 4);
  if (input.sound !== false) {
    if (input.kind === "badge" || input.kind === "level") useSounds.win();
    else useSounds.click();
  }
  if (ttl > 0 && typeof window !== "undefined") {
    window.setTimeout(() => dismiss(id), ttl);
  }
  return id;
}

export function dismiss(id: number): void {
  notices.value = notices.value.filter((n) => n.id !== id);
}

export function clearNotices(): void {
  notices.value = [];
}

/** Notifica una subida de nivel comparando el nivel anterior con el nuevo. */
export function notifyLevelUp(prev: number, next: number): boolean {
  if (next > prev) {
    notify({
      kind: "level",
      title: `¡Subiste al nivel ${next}!`,
      detail: "Tu personaje evoluciona y desbloqueas nuevas mejoras.",
    });
    return true;
  }
  return false;
}

/**
 * Lleva el seguimiento del nivel visto por la estudiante y notifica si subió.
 * Útil para detectar subidas producidas en otras pantallas.
 */
export function trackLevelSeen(key: string, level: number): void {
  try {
    const prev = Number(localStorage.getItem(key) ?? "0");
    if (prev > 0 && level > prev) {
      notify({
        kind: "level",
        title: `¡Subiste al nivel ${level}!`,
        detail: "Tu personaje evoluciona y desbloqueas nuevas mejoras.",
      });
    }
    localStorage.setItem(key, String(level));
  } catch {
    // sin almacenamiento
  }
}

export function useNotify() {
  return { notices, notify, dismiss, clearNotices, notifyLevelUp, trackLevelSeen };
}
