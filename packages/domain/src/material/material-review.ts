import {
  APPROVAL_STATUS,
  MATERIAL_STATUS,
  MATERIAL_TYPE,
  REVIEWER_ROLES,
  type ApprovalStatus,
  type Material,
  type MaterialApproval,
  type MaterialStatus,
  type MaterialType,
  type ReviewConfig,
  type ReviewerRole,
} from "@pclab/shared";
/**
 * Máquina de estados del flujo de revisión institucional:
 * PROFESOR → EVALUADORA → PIE → UTP → APROBADO FINAL / READY_TO_PRINT.
 */
export const MATERIAL_TRANSITIONS: Record<MaterialStatus, MaterialStatus[]> = {
  [MATERIAL_STATUS.BORRADOR]: [
    MATERIAL_STATUS.LISTO_PARA_REVISION,
    MATERIAL_STATUS.ENVIADO_A_REVISION,
    MATERIAL_STATUS.EN_REVISION, // atajo legacy FASE 7
    MATERIAL_STATUS.ARCHIVED,
  ],
  [MATERIAL_STATUS.LISTO_PARA_REVISION]: [MATERIAL_STATUS.BORRADOR, MATERIAL_STATUS.ENVIADO_A_REVISION, MATERIAL_STATUS.ARCHIVED],
  [MATERIAL_STATUS.ENVIADO_A_REVISION]: [MATERIAL_STATUS.EN_REVISION],
  [MATERIAL_STATUS.EN_REVISION]: [
    MATERIAL_STATUS.OBSERVACIONES,
    MATERIAL_STATUS.REQUIERE_CAMBIOS,
    MATERIAL_STATUS.APROBADO,
    MATERIAL_STATUS.RECHAZADO,
    // Atajos legacy FASE 7.
    MATERIAL_STATUS.CON_OBSERVACIONES,
    MATERIAL_STATUS.CORREGIR_Y_REENVIAR,
  ],
  [MATERIAL_STATUS.OBSERVACIONES]: [MATERIAL_STATUS.CORREGIDO, MATERIAL_STATUS.RECHAZADO],
  [MATERIAL_STATUS.REQUIERE_CAMBIOS]: [MATERIAL_STATUS.CORREGIDO, MATERIAL_STATUS.RECHAZADO],
  [MATERIAL_STATUS.CORREGIDO]: [MATERIAL_STATUS.REENVIADO, MATERIAL_STATUS.ARCHIVED],
  [MATERIAL_STATUS.REENVIADO]: [MATERIAL_STATUS.EN_REVISION],
  [MATERIAL_STATUS.APROBADO]: [MATERIAL_STATUS.APROBADO_FINAL],
  [MATERIAL_STATUS.APROBADO_FINAL]: [MATERIAL_STATUS.READY_TO_PRINT, MATERIAL_STATUS.EN_REVISION],
  [MATERIAL_STATUS.READY_TO_PRINT]: [MATERIAL_STATUS.EN_REVISION, MATERIAL_STATUS.ARCHIVED],
  [MATERIAL_STATUS.RECHAZADO]: [MATERIAL_STATUS.BORRADOR],
  [MATERIAL_STATUS.ARCHIVED]: [],
  // Compatibilidad FASE 7.
  [MATERIAL_STATUS.CON_OBSERVACIONES]: [MATERIAL_STATUS.EN_REVISION, MATERIAL_STATUS.CORREGIDO],
  [MATERIAL_STATUS.CORREGIR_Y_REENVIAR]: [MATERIAL_STATUS.EN_REVISION, MATERIAL_STATUS.CORREGIDO],
};

export function canTransitionMaterial(current: MaterialStatus, next: MaterialStatus): boolean {
  return MATERIAL_TRANSITIONS[current]?.includes(next) ?? false;
}

/** Roles que deben aprobar según la configuración de revisión. */
export function requiredReviewRoles(config?: ReviewConfig): ReviewerRole[] {
  if (!config) return [REVIEWER_ROLES[0]];
  const roles: ReviewerRole[] = [];
  if (config.evaluatorRequired) roles.push("EVALUADOR");
  if (config.pieRequired) roles.push("PIE");
  if (config.utpRequired) roles.push("UTP");
  return roles.length > 0 ? roles : [REVIEWER_ROLES[0]];
}

/** Configuración de revisión por defecto según tipo de material. */
export function defaultReviewConfig(type: MaterialType): ReviewConfig {
  const t = type.toUpperCase();
  // Pruebas sumativas requieren evaluadora + PIE + UTP.
  if (t === MATERIAL_TYPE.WRITTEN_TEST || t === MATERIAL_TYPE.ASSESSMENT) {
    return { evaluatorRequired: true, pieRequired: true, utpRequired: true };
  }
  // Material DUA/PIE requiere al menos evaluadora + PIE.
  if (t === MATERIAL_TYPE.DUA_VERSION || t === MATERIAL_TYPE.PIE_VERSION) {
    return { evaluatorRequired: true, pieRequired: true, utpRequired: false };
  }
  // Guías simples, pautas, rúbricas y solucionarios: solo evaluadora.
  return { evaluatorRequired: true, pieRequired: false, utpRequired: false };
}

/** Gate de aprobación: ¿todas las aprobaciones obligatorias están en APROBADO? */
export function approvalGate(
  material: Pick<Material, "reviewConfig" | "type">,
  approvals: MaterialApproval[],
): { ready: boolean; missing: ReviewerRole[]; blocked: ReviewerRole[] } {
  const required = requiredReviewRoles(material.reviewConfig ?? defaultReviewConfig(material.type));
  const byRole = new Map(approvals.map((a) => [a.role, a]));
  const missing: ReviewerRole[] = [];
  const blocked: ReviewerRole[] = [];
  for (const role of required) {
    const approval = byRole.get(role);
    if (!approval || approval.status === APPROVAL_STATUS.PENDIENTE) missing.push(role);
    else if (approval.status === APPROVAL_STATUS.CON_OBSERVACIONES || approval.status === APPROVAL_STATUS.SOLICITA_CAMBIOS) {
      blocked.push(role);
    }
  }
  return { ready: missing.length === 0 && blocked.length === 0, missing, blocked };
}

/** ¿Puede pasar a READY_TO_PRINT? (aprobaciones completas + sin cambios solicitados). */
export function canReadyToPrint(
  material: Pick<Material, "reviewConfig" | "type" | "status" | "requiresPrinting">,
  approvals: MaterialApproval[],
): { ready: boolean; message?: string } {
  if (material.status !== MATERIAL_STATUS.APROBADO_FINAL) {
    return { ready: false, message: "El material debe estar en APROBADO FINAL antes de imprimir." };
  }
  const gate = approvalGate(material, approvals);
  if (!gate.ready) {
    const roles = [...gate.missing, ...gate.blocked];
    const labels: Record<string, string> = { EVALUADOR: "Evaluadora", PIE: "PIE", UTP: "UTP" };
    return {
      ready: false,
      message: `Falta aprobación ${roles.map((r) => labels[r] ?? r).join(" / ")}.`,
    };
  }
  return { ready: true };
}

/**
 * Plazos institucionales:
 * - Evaluaciones: revisión al menos 7 días antes de la clase.
 * - Guías impresas: impresión al menos 3 días antes de la clase.
 */
export const REVIEW_LEAD_DAYS = 7;
export const PRINT_LEAD_DAYS = 3;

export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

export function computeDeadlines(
  classDateIso: string,
  type: MaterialType,
  requiresPrinting: boolean,
): { reviewDeadline?: string; printDeadline?: string } {
  const out: { reviewDeadline?: string; printDeadline?: string } = {};
  const t = type.toUpperCase();
  if (t === MATERIAL_TYPE.WRITTEN_TEST || t === MATERIAL_TYPE.ASSESSMENT || t === MATERIAL_TYPE.EVALUACION) {
    out.reviewDeadline = addDays(classDateIso, -REVIEW_LEAD_DAYS);
  }
  if (requiresPrinting || t === MATERIAL_TYPE.GUIDE || t === MATERIAL_TYPE.GUIA) {
    out.printDeadline = addDays(classDateIso, -PRINT_LEAD_DAYS);
  }
  return out;
}

/** Mapa de estado de aprobación según la decisión de un revisor. */
export function approvalStatusForDecision(decision: "APROBADO" | "CON_OBSERVACIONES" | "SOLICITA_CAMBIOS"): ApprovalStatus {
  switch (decision) {
    case "APROBADO":
      return APPROVAL_STATUS.APROBADO;
    case "CON_OBSERVACIONES":
      return APPROVAL_STATUS.CON_OBSERVACIONES;
    default:
      return APPROVAL_STATUS.SOLICITA_CAMBIOS;
  }
}
