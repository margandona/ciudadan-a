import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, { id: string; value: unknown }>();

vi.mock("@/lib/idb", () => ({
  idbPut: async ({ id, value }: { id: string; value: unknown }) => {
    store.set(id, { id, value });
  },
  idbGetAll: async () => [...store.values()],
  idbDelete: async (id: string) => {
    store.delete(id);
  },
}));

import { enqueue, listPending, registerKindHandler, setStatus, syncPending } from "./offlineQueue";

describe("offlineQueue", () => {
  beforeEach(() => store.clear());

  it("encola y sincroniza acciones con un handler idempotente", async () => {
    const calls: unknown[] = [];
    registerKindHandler("echo", (p) => {
      calls.push(p);
      return Promise.resolve(p);
    });

    await enqueue("echo", { x: 1 });
    expect(await listPending()).toHaveLength(1);

    const result = await syncPending();
    expect(result.synced).toHaveLength(1);
    expect(result.failed).toHaveLength(0);
    expect(calls).toEqual([{ x: 1 }]);
    expect(await listPending()).toHaveLength(0);
  });

  it("marca ERROR cuando el handler falla y conserva la acción", async () => {
    registerKindHandler("boom", () => Promise.reject(new Error("network")));

    await enqueue("boom", { y: 2 });
    const result = await syncPending();
    expect(result.failed).toHaveLength(1);

    const pending = await listPending();
    expect(pending).toHaveLength(1);
    expect(pending[0]!.status).toBe("ERROR");
    expect(pending[0]!.attempts).toBe(1);
  });

  it("setStatus actualiza estado y reintenta", async () => {
    registerKindHandler("echo", (p) => Promise.resolve(p));
    const item = await enqueue("echo", { z: 3 });
    await setStatus(item.id, "ERROR");
    const pending = await listPending();
    expect(pending[0]!.status).toBe("ERROR");
    await syncPending();
    expect(await listPending()).toHaveLength(0);
  });
});
