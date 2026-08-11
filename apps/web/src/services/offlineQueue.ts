import { idbDelete, idbGetAll, idbPut } from "@/lib/idb";

/** Estados visibles de sincronización. */
export const SYNC_STATUS = {
  SYNCED: "SYNCED",
  PENDING: "PENDING",
  ERROR: "ERROR",
} as const;

export type SyncStatus = (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS];

export interface QueueItem {
  id: string;
  kind: string;
  payload: unknown;
  createdAt: string;
  status: SyncStatus;
  attempts: number;
}

type KindHandler = (payload: unknown) => Promise<unknown>;

const handlers = new Map<string, KindHandler>();

function newId(): string {
  const crypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Registra cómo reproducir una acción diferida (una por kind). */
export function registerKindHandler(kind: string, handler: KindHandler): void {
  handlers.set(kind, handler);
}

/** Encola una acción para sincronizar cuando haya conexión. */
export async function enqueue(kind: string, payload: unknown): Promise<QueueItem> {
  const item: QueueItem = {
    id: newId(),
    kind,
    payload,
    createdAt: new Date().toISOString(),
    status: SYNC_STATUS.PENDING,
    attempts: 0,
  };
  await idbPut({ id: item.id, value: item });
  return item;
}

/** Lista las acciones pendientes o con error. */
export async function listPending(): Promise<QueueItem[]> {
  const items = await idbGetAll<QueueItem>();
  return items.map((r) => r.value).filter((i) => i.status !== SYNC_STATUS.SYNCED);
}

/** Marca el estado de una acción. */
export async function setStatus(id: string, status: SyncStatus): Promise<void> {
  const items = await idbGetAll<QueueItem>();
  const record = items.find((i) => i.id === id);
  if (!record) return;
  const updated: QueueItem = { ...record.value, status, attempts: record.value.attempts + (status === SYNC_STATUS.ERROR ? 1 : 0) };
  await idbPut({ id, value: updated });
}

/** Elimina una acción ya sincronizada. */
export async function removeSynced(id: string): Promise<void> {
  await idbDelete(id);
}

/**
 * Reproduce las acciones pendientes (idempotente): cada handler debe serlo.
 * Devuelve los ids sincronizados y los que quedaron en error.
 */
export async function syncPending(): Promise<{ synced: string[]; failed: string[] }> {
  const pending = await listPending();
  const synced: string[] = [];
  const failed: string[] = [];
  for (const item of pending) {
    const handler = handlers.get(item.kind);
    if (!handler) {
      failed.push(item.id);
      continue;
    }
    try {
      await handler(item.payload);
      await removeSynced(item.id);
      synced.push(item.id);
    } catch {
      await setStatus(item.id, SYNC_STATUS.ERROR);
      failed.push(item.id);
    }
  }
  return { synced, failed };
}

/** Cuenta de pendientes (para el banner). */
export async function pendingCount(): Promise<number> {
  return (await listPending()).length;
}
