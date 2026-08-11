import { defineStore } from "pinia";
import { pendingCount, syncPending, type SyncStatus } from "@/services/offlineQueue";

/**
 * Estado de sincronización offline. Escucha online/offline y vacía la cola
 * cuando hay conexión. Estados: SINCRONIZADO / PENDIENTE / ERROR.
 */
export const useSyncStore = defineStore("sync", {
  state: () => ({
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    pending: 0 as number,
    failed: 0 as number,
    status: "SYNCED" as SyncStatus,
    initialized: false,
  }),
  getters: {
    hasPending: (s) => s.pending > 0,
    hasError: (s) => s.failed > 0,
  },
  actions: {
    async refresh(): Promise<void> {
      this.pending = await pendingCount();
      this.status = this.pending > 0 ? "PENDING" : "SYNCED";
    },
    async flush(): Promise<void> {
      if (!this.online) return;
      const result = await syncPending();
      this.failed = result.failed.length;
      this.pending = await pendingCount();
      this.status = this.pending > 0 ? (this.failed > 0 ? "ERROR" : "PENDING") : "SYNCED";
    },
    init(): void {
      if (this.initialized) return;
      this.initialized = true;
      window.addEventListener("online", () => {
        this.online = true;
        void this.flush();
      });
      window.addEventListener("offline", () => {
        this.online = false;
        this.status = "PENDING";
        void this.refresh();
      });
      void this.refresh();
    },
  },
});
