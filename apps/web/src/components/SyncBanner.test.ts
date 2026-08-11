// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import SyncBanner from "./SyncBanner.vue";
import { useSyncStore } from "@/stores/sync";
import { SYNC_STATUS } from "@/services/offlineQueue";

function mountBanner(state: Partial<ReturnType<typeof useSyncStore>>) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useSyncStore();
  store.$patch({ online: true, pending: 0, failed: 0, status: SYNC_STATUS.SYNCED, ...state });
  return mount(SyncBanner, { global: { plugins: [pinia] } });
}

describe("SyncBanner", () => {
  it("no se muestra cuando está sincronizado y en línea", () => {
    const wrapper = mountBanner({ status: SYNC_STATUS.SYNCED, pending: 0, failed: 0 });
    expect(wrapper.find(".banner").exists()).toBe(false);
  });

  it("muestra PENDIENTE DE SINCRONIZAR", () => {
    const wrapper = mountBanner({ status: SYNC_STATUS.PENDING, pending: 3, failed: 0 });
    expect(wrapper.text()).toContain("PENDIENTE DE SINCRONIZAR (3)");
  });

  it("muestra ERROR DE SINCRONIZACIÓN y SIN CONEXIÓN", () => {
    const error = mountBanner({ status: SYNC_STATUS.ERROR, pending: 1, failed: 1 });
    expect(error.text()).toContain("ERROR DE SINCRONIZACIÓN");
    const offline = mountBanner({ online: false, status: SYNC_STATUS.PENDING, pending: 1, failed: 0 });
    expect(offline.text()).toContain("SIN CONEXIÓN");
  });
});
