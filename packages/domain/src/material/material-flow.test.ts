import { describe, expect, it } from "vitest";
import { MATERIAL_STATUS } from "@pclab/shared";
import { canTransitionMaterial, validateMaterialVersion } from "./material-flow";

describe("canTransitionMaterial", () => {
  it("permite enviar de BORRADOR a EN_REVISION", () => {
    expect(canTransitionMaterial(MATERIAL_STATUS.BORRADOR, MATERIAL_STATUS.EN_REVISION)).toBe(true);
  });

  it("el evaluador puede aprobar/rechazar/observar desde EN_REVISION", () => {
    expect(canTransitionMaterial(MATERIAL_STATUS.EN_REVISION, MATERIAL_STATUS.APROBADO)).toBe(true);
    expect(canTransitionMaterial(MATERIAL_STATUS.EN_REVISION, MATERIAL_STATUS.RECHAZADO)).toBe(true);
    expect(canTransitionMaterial(MATERIAL_STATUS.EN_REVISION, MATERIAL_STATUS.CON_OBSERVACIONES)).toBe(true);
    expect(canTransitionMaterial(MATERIAL_STATUS.EN_REVISION, MATERIAL_STATUS.CORREGIR_Y_REENVIAR)).toBe(true);
  });

  it("corregir reenvía a EN_REVISION; aprobado/rechazado son terminales", () => {
    expect(canTransitionMaterial(MATERIAL_STATUS.CORREGIR_Y_REENVIAR, MATERIAL_STATUS.EN_REVISION)).toBe(true);
    expect(canTransitionMaterial(MATERIAL_STATUS.CON_OBSERVACIONES, MATERIAL_STATUS.EN_REVISION)).toBe(true);
    expect(canTransitionMaterial(MATERIAL_STATUS.APROBADO, MATERIAL_STATUS.EN_REVISION)).toBe(false);
    expect(canTransitionMaterial(MATERIAL_STATUS.RECHAZADO, MATERIAL_STATUS.APROBADO)).toBe(false);
    expect(canTransitionMaterial(MATERIAL_STATUS.BORRADOR, MATERIAL_STATUS.APROBADO)).toBe(false);
  });
});

describe("validateMaterialVersion", () => {
  it("acepta GENERAL/DUA con PDF o DOCX", () => {
    expect(() => validateMaterialVersion({ kind: "GENERAL", fileName: "guia.pdf", mime: "application/pdf" })).not.toThrow();
    expect(() => validateMaterialVersion({ kind: "DUA", fileName: "guia.docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })).not.toThrow();
  });

  it("rechaza tipo, formato o tamaño inválidos", () => {
    expect(() => validateMaterialVersion({ kind: "X", fileName: "a.pdf" })).toThrow();
    expect(() => validateMaterialVersion({ kind: "GENERAL", fileName: "a.exe", mime: "application/x-msdownload" })).toThrow();
    expect(() => validateMaterialVersion({ kind: "GENERAL", fileName: "", mime: "application/pdf" })).toThrow();
    expect(() => validateMaterialVersion({ kind: "GENERAL", fileName: "a.pdf", size: 60 * 1024 * 1024 })).toThrow();
  });
});
