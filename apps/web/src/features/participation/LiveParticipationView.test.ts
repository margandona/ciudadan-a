// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { ParticipationOverview, Student } from "@pclab/shared";

vi.mock("@/infrastructure/appDeps", () => ({
  listStudents: { run: vi.fn() },
}));
vi.mock("@/services/importApi", () => ({
  getParticipationOverview: vi.fn(),
  registerParticipation: vi.fn(),
}));

import LiveParticipationView from "./LiveParticipationView.vue";
import { listStudents } from "@/infrastructure/appDeps";
import { getParticipationOverview, registerParticipation } from "@/services/importApi";
import { useSessionStore } from "@/stores/session";

const student = (id: string, name: string): Student => ({
  id,
  displayName: name,
  normalizedSearchName: name.toLowerCase(),
  courseId: "course-d",
  active: true,
  archivedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  academicProfile: { participationTrackingEnabled: true, gamificationEnabled: true },
});

const overview: ParticipationOverview = {
  bySkill: Object.fromEntries(
    ["intervencionOral", "trabajoGrupal", "argumentacion", "colaboracion", "escucha", "resolucionProblemas", "aporteEvidencia", "liderazgo", "mediacion", "pensamientoCritico"].map((k) => [k, { count: 0, sum: 0, avg: 0 }]),
  ) as never,
  total: 0,
  studentCount: 0,
};

function mountView() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useSessionStore();
  store.$patch({ role: "PROFESOR", courses: ["course-d"] });
  return mount(LiveParticipationView, {
    props: { classId: "class-01" },
    global: { plugins: [pinia], stubs: { RouterLink: true } },
  });
}

describe("LiveParticipationView", () => {
  beforeEach(() => {
    vi.mocked(listStudents.run).mockReset();
    vi.mocked(getParticipationOverview).mockReset();
    vi.mocked(registerParticipation).mockReset();
  });

  it("registra participación en lote para las estudiantes seleccionadas", async () => {
    vi.mocked(listStudents.run).mockResolvedValue([student("s1", "Ana Demo"), student("s2", "Bea Demo")]);
    vi.mocked(getParticipationOverview).mockResolvedValue(overview);
    vi.mocked(registerParticipation).mockResolvedValue(2);

    const wrapper = mountView();
    await flushPromises();

    const quick = wrapper.findAll("button.btn-primary.btn-sm");
    await quick[1]!.trigger("click"); // Argumentó
    await flushPromises();

    expect(registerParticipation).toHaveBeenCalledWith(
      "course-d",
      "class-01",
      expect.arrayContaining([
        expect.objectContaining({ studentId: "s1", skill: "argumentacion", level: 1 }),
        expect.objectContaining({ studentId: "s2", skill: "argumentacion", level: 1 }),
      ]),
    );
    expect(wrapper.text()).toContain("registro(s) guardados");
  });
});
