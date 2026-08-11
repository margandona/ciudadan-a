// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import type { ImportPreview } from "@pclab/shared";

vi.mock("@/services/importApi", () => ({
  previewStudents: vi.fn(),
  importStudents: vi.fn(),
  arrayBufferToBase64: vi.fn(() => "base64-mock"),
}));
vi.mock("@/lib/read-file", () => ({
  readAsArrayBuffer: vi.fn(async () => new ArrayBuffer(0)),
}));

import StudentImportView from "./StudentImportView.vue";
import { importStudents, previewStudents } from "@/services/importApi";

const preview = (): ImportPreview => ({
  summary: {
    fileName: "curso-d.xlsx",
    courseDetected: "3º Medio D",
    courseNotDetermined: false,
    totalRows: 2,
    newStudents: 2,
    duplicateConfirmed: 0,
    possibleDuplicate: 0,
    withWarnings: 0,
    blocked: 0,
    readyToImport: 2,
    sensitiveFieldsDetected: 1,
  },
  rows: [
    {
      rowIndex: 6,
      originalName: "Ana Demo Uno",
      displayName: "Ana Demo Uno",
      normalizedSearchName: "ana demo uno",
      courseId: "course-3med-d-2026",
      courseName: "3º Medio D",
      listNumber: 1,
      active: true,
      duplicateKind: "NEW",
      issues: [],
      editable: { displayName: "Ana Demo Uno", active: true },
    },
    {
      rowIndex: 7,
      originalName: "ANA  DEMO DOS",
      displayName: "ANA  DEMO DOS",
      normalizedSearchName: "ana demo dos",
      courseId: "course-3med-d-2026",
      courseName: "3º Medio D",
      listNumber: 2,
      active: true,
      duplicateKind: "NEW",
      issues: [{ code: "DOUBLE_SPACE", level: "WARNING", message: "Doble espacio detectado en el nombre." }],
      editable: { displayName: "ANA  DEMO DOS", active: true },
    },
  ],
  issues: [
    { code: "SENSITIVE_FIELD_DETECTED", level: "INFO", message: "Columna RUN sensible." },
  ],
});

function mountView() {
  return mount(StudentImportView, {
    global: { stubs: { RouterLink: true } },
  });
}

async function selectFile(wrapper: ReturnType<typeof mountView>, name = "curso-d.xlsx") {
  const input = wrapper.find('input[data-testid="roster-input"]');
  const file = new File(["fake"], name);
  Object.defineProperty(input.element, "files", { value: [file], configurable: true });
  await input.trigger("change");
  await flushPromises();
}

describe("StudentImportView", () => {
  beforeEach(() => {
    vi.mocked(previewStudents).mockReset();
    vi.mocked(importStudents).mockReset();
  });

  it("muestra estado vacío inicial", () => {
    const wrapper = mountView();
    expect(wrapper.text()).toContain("Selecciona un archivo de nómina para comenzar");
  });

  it("muestra preview con resumen, tabla editable y advertencias", async () => {
    vi.mocked(previewStudents).mockResolvedValue(preview());
    const wrapper = mountView();
    await selectFile(wrapper);

    expect(wrapper.text()).toContain("3º Medio D");
    expect(wrapper.text()).toContain("Estudiantes");
    expect(wrapper.text()).toContain("Ana Demo Uno");
    // nombre original intacto (no corregido silenciosamente)
    expect(wrapper.text()).toContain("ANA  DEMO DOS");
    expect(wrapper.text()).toContain("Doble espacio");
  });

  it("permite editar el nombre en la vista previa sin tocar el original", async () => {
    vi.mocked(previewStudents).mockResolvedValue(preview());
    const wrapper = mountView();
    await selectFile(wrapper);

    const edits = wrapper.findAll('input[aria-label^="Nombre interpretado"]');
    await edits[0]!.setValue("Ana Renata Demo Uno");
    // La columna "nombre original" conserva el valor del Excel
    expect(wrapper.findAll("td")[1]!.text()).toBe("Ana Demo Uno");
    // El campo editable refleja la corrección
    expect((edits[0]!.element as HTMLInputElement).value).toBe("Ana Renata Demo Uno");
  });

  it("importa las filas seleccionadas y muestra el resultado", async () => {
    vi.mocked(previewStudents).mockResolvedValue(preview());
    vi.mocked(importStudents).mockResolvedValue({
      imported: 2,
      updated: 0,
      deactivated: 0,
      skippedDuplicates: 0,
      courseIds: ["course-3med-d-2026"],
    });

    const wrapper = mountView();
    await selectFile(wrapper);
    const importButton = wrapper.findAll("button").find((b) => b.text().includes("Importar"))!;
    await importButton.trigger("click");
    await flushPromises();

    expect(importStudents).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain("Importación completada");
    expect(wrapper.text()).toContain("course-3med-d-2026");
  });
});
