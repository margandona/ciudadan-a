import { onScopeDispose, watch } from "vue";
import { useSessionStore } from "@/stores/session";
import { notify } from "./useNotify";

/**
 * Escucha en vivo la granja de la estudiante (Firestore `onSnapshot`) y notifica
 * los regalos del docente apenas llegan, sin recargar. Las reglas permiten a la
 * estudiante leer su propio documento `farms/{uid}`.
 */

interface RawNotice {
  id: string;
  kind: "avatar" | "item" | "coins";
  label: string;
}

const TITLES: Record<RawNotice["kind"], string> = {
  avatar: "¡Tu profe te regaló un avatar!",
  item: "¡Tu profe te regaló un objeto!",
  coins: "¡Tu profe te regaló monedas/semillas!",
};

const ICONS: Record<RawNotice["kind"], string> = { avatar: "🧑", item: "🎁", coins: "🪙" };

function seenKey(uid: string): string {
  return `pclab-notices-seen-${uid}`;
}

function loadSeen(uid: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(seenKey(uid));
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function saveSeen(uid: string, seen: Set<string>): void {
  try {
    localStorage.setItem(seenKey(uid), JSON.stringify([...seen]));
  } catch {
    // sin almacenamiento
  }
}

export function useFarmWatch(): void {
  const session = useSessionStore();
  let unsubscribe: (() => void) | null = null;

  function stop(): void {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  }

  async function start(uid: string): Promise<void> {
    stop();
    const [{ db }, { doc, onSnapshot }] = await Promise.all([
      import("@/lib/firebase"),
      import("firebase/firestore"),
    ]);
    const stored = loadSeen(uid);
    const known = stored ?? new Set<string>();
    unsubscribe = onSnapshot(doc(db, "farms", uid), (snap) => {
      const data = snap.data() as { notices?: RawNotice[] } | undefined;
      const notices = data?.notices ?? [];
      if (stored === null) {
        // Primera vez en este dispositivo: no notificar lo histórico.
        for (const n of notices) known.add(n.id);
        saveSeen(uid, known);
        return;
      }
      for (const n of notices) {
        if (known.has(n.id)) continue;
        known.add(n.id);
        notify({
          kind: "item",
          icon: ICONS[n.kind] ?? "🎁",
          title: TITLES[n.kind] ?? "¡Recibiste un regalo!",
          detail: n.label,
        });
      }
      saveSeen(uid, known);
    });
  }

  watch(
    () => [session.role, session.studentId, session.user?.uid] as const,
    ([role, studentId, uid]) => {
      const id = studentId || uid || "";
      if (role === "ESTUDIANTE" && id) void start(id);
      else stop();
    },
    { immediate: true },
  );

  onScopeDispose(stop);
}
