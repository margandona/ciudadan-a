// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";

const sessionMock = { error: "", login: vi.fn().mockResolvedValue(undefined) };

vi.mock("@/stores/session", () => ({
  useSessionStore: () => sessionMock,
}));
vi.mock("vue-router", () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/services/importApi", () => ({
  listStudentLoginOptions: vi.fn().mockResolvedValue({ courses: [], students: [] }),
}));

import LoginView from "@/views/LoginView.vue";

describe("LoginView", () => {
  it("inicia sesión con credenciales (modo docente/equipo)", async () => {
    const wrapper = mount(LoginView);
    await flushPromises();
    await wrapper.find("button.tab").trigger("click"); // primer tab = Estudiante
    const staffTab = wrapper.findAll("button.tab")[1]!;
    await staffTab.trigger("click");
    await wrapper.find('input[type="email"]').setValue("profesora@demo.cl");
    await wrapper.find('input[type="password"]').setValue("Demo1234");
    await wrapper.find("form").trigger("submit.prevent");

    expect(sessionMock.login).toHaveBeenCalledWith("profesora@demo.cl", "Demo1234");
  });
});
