import { describe, expect, it } from "vitest";
import { APPROVAL_STATUS, MATERIAL_STATUS, MATERIAL_TYPE, type MaterialApproval, type ReviewerRole } from "@pclab/shared";
import { addDays, approvalGate, canReadyToPrint, canTransitionMaterial, computeDeadlines, defaultReviewConfig, requiredReviewRoles } from "./material-review";

describe("material-review — transiciones", () => {
  it("permite el ciclo completo BORRADOR → … → APROBADO_FINAL → READY_TO_PRINT", () => {
    expect(canTransitionMaterial(MATERIAL_STATUS.BORRADOR, MATERIAL_STATUS.LISTO_PARA_REVISION)).toBe(true);
    expect(canTransitionMaterial(MATERIAL_STATUS.LISTO_PARA_REVISION, MATERIAL_STATUS.ENVIADO_A_REVISION)).toBe(true);
    expect(canTransitionMaterial(MATERIAL_STATUS.ENVIADO_A_REVISION, MATERIAL_STATUS.EN_REVISION)).toBe(true);
    expect(canTransitionMaterial(MATERIAL_STATUS.EN_REVISION, MATERIAL_STATUS.REQUIERE_CAMBIOS)).toBe(true);
    expect(canTransitionMaterial(MATERIAL_STATUS.REQUIERE_CAMBIOS, MATERIAL_STATUS.CORREGIDO)).toBe(true);
    expect(canTransitionMaterial(MATERIAL_STATUS.CORREGIDO, MATERIAL_STATUS.REENVIADO)).toBe(true);
    expect(canTransitionMaterial(MATERIAL_STATUS.REENVIADO, MATERIAL_STATUS.EN_REVISION)).toBe(true);
    expect(canTransitionMaterial(MATERIAL_STATUS.EN_REVISION, MATERIAL_STATUS.APROBADO)).toBe(true);
    expect(canTransitionMaterial(MATERIAL_STATUS.APROBADO, MATERIAL_STATUS.APROBADO_FINAL)).toBe(true);
    expect(canTransitionMaterial(MATERIAL_STATUS.APROBADO_FINAL, MATERIAL_STATUS.READY_TO_PRINT)).toBe(true);
    expect(canTransitionMaterial(MATERIAL_STATUS.EN_REVISION, MATERIAL_STATUS.RECHAZADO)).toBe(true);
    expect(canTransitionMaterial(MATERIAL_STATUS.RECHAZADO, MATERIAL_STATUS.BORRADOR)).toBe(true);
  });

  it("no permite saltos inválidos", () => {
    expect(canTransitionMaterial(MATERIAL_STATUS.BORRADOR, MATERIAL_STATUS.APROBADO_FINAL)).toBe(false);
    expect(canTransitionMaterial(MATERIAL_STATUS.BORRADOR, MATERIAL_STATUS.READY_TO_PRINT)).toBe(false);
    expect(canTransitionMaterial(MATERIAL_STATUS.APROBADO_FINAL, MATERIAL_STATUS.BORRADOR)).toBe(false);
    expect(canTransitionMaterial(MATERIAL_STATUS.ARCHIVED, MATERIAL_STATUS.EN_REVISION)).toBe(false);
  });
});

describe("material-review — roles requeridos y gate", () => {
  it("la prueba sumativa requiere evaluadora + PIE + UTP; la guía simple solo evaluadora", () => {
    expect(requiredReviewRoles(defaultReviewConfig(MATERIAL_TYPE.WRITTEN_TEST))).toEqual(["EVALUADOR", "PIE", "UTP"]);
    expect(requiredReviewRoles(defaultReviewConfig(MATERIAL_TYPE.GUIDE))).toEqual(["EVALUADOR"]);
    expect(requiredReviewRoles(defaultReviewConfig(MATERIAL_TYPE.DUA_VERSION))).toEqual(["EVALUADOR", "PIE"]);
  });

  it("el gate exige todas las aprobaciones obligatorias", () => {
    const approvals = (role: ReviewerRole, status = APPROVAL_STATUS.APROBADO): MaterialApproval[] => [{ role, status, by: "x", at: "2026-08-11T00:00:00.000Z" }];
    expect(approvalGate({ reviewConfig: { evaluatorRequired: true, pieRequired: true, utpRequired: true }, type: MATERIAL_TYPE.WRITTEN_TEST }, approvals("EVALUADOR")).ready).toBe(false);
    expect(
      approvalGate({ reviewConfig: { evaluatorRequired: true, pieRequired: true, utpRequired: true }, type: MATERIAL_TYPE.WRITTEN_TEST }, [
        approvals("EVALUADOR")[0]!,
        approvals("PIE")[0]!,
        approvals("UTP")[0]!,
      ]).ready,
    ).toBe(true);
  });

  it("READY_TO_PRINT se bloquea si falta una aprobación obligatoria", () => {
    const material = { reviewConfig: { evaluatorRequired: true, pieRequired: true, utpRequired: false }, type: MATERIAL_TYPE.WRITTEN_TEST, status: MATERIAL_STATUS.APROBADO_FINAL, requiresPrinting: true };
    const gate = canReadyToPrint(material, [{ role: "EVALUADOR", status: APPROVAL_STATUS.APROBADO, by: "x", at: "2026-08-11T00:00:00.000Z" }]);
    expect(gate.ready).toBe(false);
    expect(gate.message).toContain("PIE");
  });
});

describe("material-review — plazos", () => {
  it("prueba: revisión −7 días; guía impresa: impresión −3 días", () => {
    const d = computeDeadlines("2026-08-20T18:00:00.000Z", MATERIAL_TYPE.WRITTEN_TEST, false);
    expect(d.reviewDeadline).toBe("2026-08-13T18:00:00.000Z");
    const g = computeDeadlines("2026-08-20T18:00:00.000Z", MATERIAL_TYPE.GUIDE, true);
    expect(g.printDeadline).toBe("2026-08-17T18:00:00.000Z");
    expect(g.reviewDeadline).toBeUndefined();
  });

  it("addDays suma días en UTC", () => {
    expect(addDays("2026-08-20T18:00:00.000Z", -7)).toBe("2026-08-13T18:00:00.000Z");
  });
});
