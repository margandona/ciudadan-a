import {
  APPROVAL_STATUS,
  MATERIAL_KIND,
  MATERIAL_STATUS,
  REVIEWER_ROLES,
  type Material,
  type MaterialContent,
  type MaterialDetail,
  type MaterialStatus,
  type MaterialType,
  type MaterialVersion,
  type ReviewComment,
  type ReviewerRole,
  type ReviewConfig,
} from "@pclab/shared";
import {
  approvalGate,
  approvalStatusForDecision,
  canReadyToPrint,
  canTransitionMaterial,
  computeDeadlines,
  defaultReviewConfig,
  requiredReviewRoles,
} from "@pclab/domain";
import { assertCourse, assertRole } from "../auth";
import { generateId } from "../id";
import type {
  AuditRepository,
  AuthContext,
  MaterialDocumentGenerator,
  MaterialRepository,
  UserDirectoryRepository,
} from "../ports";

// ---------------------------------------------------------------------------
// Generador de contenido (borradores editables, nunca vacíos).
// ---------------------------------------------------------------------------

/** Crea el contenido estructurado inicial según el tipo de material. */
export function buildMaterialContent(
  type: MaterialType,
  title: string,
  curricular: { oa: string[]; objective: string; indicators: string[] },
): MaterialContent {
  const t = type.toUpperCase();
  const base: MaterialContent = { curricular, sections: [] };
  const header: MaterialContent["sections"] = [
    { id: "h1", kind: "heading", text: title },
    { id: "h2", kind: "text", text: "Colegio La Providencia · Ovalle — Educación Ciudadana" },
  ];
  const objective: MaterialContent["sections"] = [
    { id: "oa", kind: "text", text: `OA: ${curricular.oa.join(", ")}` },
    { id: "obj", kind: "text", text: `Objetivo de la clase: ${curricular.objective}` },
  ];

  if (t === "GUIDE" || t === "GUIA" || t === "WORKSHEET" || t === "READING" || t === "LECTURA") {
    return {
      ...base,
      referencias: [
        "Caso construido para la actividad: los nombres y datos son ilustrativos. Amplía la lectura con las fuentes del tema (p. ej., INE, CASEN, DGA) y cita aquí la bibliografía que uses.",
      ],
      sections: [
        ...header,
        ...objective,
        { id: "ins", kind: "heading", text: "Instrucciones" },
        { id: "ins1", kind: "list", items: ["Lee con atención cada paso antes de responder.", "Trabaja de forma individual y registra tus ideas.", "Revisa tus respuestas antes de entregar."] },
        { id: "act", kind: "heading", text: "Actividad" },
        { id: "act1", kind: "text", text: "Caso: en un barrio de Ovalle, vecinas y vecinos se organizan para recuperar un espacio público con apoyo del municipio. Analiza el caso, relaciona los conceptos de la clase y responde lo solicitado en el espacio indicado. (Caso construido para la actividad; los nombres y datos son ilustrativos.)" },
        { id: "res", kind: "heading", text: "Espacio de respuesta" },
        { id: "res1", kind: "response" },
        { id: "close", kind: "heading", text: "Cierre y reflexión" },
        { id: "close1", kind: "text", text: "Escribe una idea que aprendiste hoy y cómo la aplicarías en Ovalle." },
      ],
    };
  }

  if (t === "WRITTEN_TEST" || t === "ASSESSMENT" || t === "EVALUACION") {
    return {
      ...base,
      sections: [...header, ...objective, { id: "inst", kind: "list", items: ["Lee cada ítem completo antes de responder.", "Escribe con letra clara y revisa tu puntaje parcial.", "Duración: indicada por tu docente."] }],
      items: [
        { id: "i1", type: "choice", prompt: "Ítem de selección múltiple: elige la alternativa correcta.", options: ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"], correctIndex: 0, points: 2, skill: "identificar" },
        { id: "i2", type: "truefalse", prompt: "Ítem verdadero/falso: fundamenta tu respuesta.", options: ["Verdadero", "Falso"], correctIndex: 0, points: 2, skill: "comprender" },
        { id: "i3", type: "short", prompt: "Ítem de respuesta breve.", correctText: [], points: 2, skill: "analizar" },
      ],
      specTable: curricular.indicators.map((ind, i) => ({
        oa: curricular.oa[0] ?? "",
        indicator: ind,
        content: title,
        skill: ["identificar", "comprender", "analizar"][i % 3] ?? "analizar",
        itemId: `i${i + 1}`,
        points: 2,
        level: ["Identificación", "Comprensión", "Análisis"][i % 3] ?? "Análisis",
      })),
      answerKey: [
        { itemId: "i1", correct: "Alternativa A", points: 2, justification: "Ajustar según la alternativa correcta definida." },
        { itemId: "i2", correct: "Verdadero", points: 2, justification: "Ajustar según la afirmación y su fundamento." },
        { itemId: "i3", correct: "Respuesta breve", points: 2, justification: "Criterio: usa conceptos de la unidad y se relaciona con Ovalle." },
      ],
      pauta: "Instrucciones de aplicación y puntaje por ítem para el docente.",
    };
  }

  if (t === "RUBRIC" || t === "RUBRICA") {
    return {
      ...base,
      sections: [...header, ...objective],
      rubric: {
        title,
        scale: [
          { score: 4, label: "Logrado destacado" },
          { score: 3, label: "Logrado" },
          { score: 2, label: "En desarrollo" },
          { score: 1, label: "Inicial" },
        ],
        criteria: [
          { id: "c1", name: "Argumentación", descriptor: "Fundamenta la propuesta utilizando evidencia pertinente.", levels: [{ score: 4, descriptor: "Fundamenta con evidencia variada y pertinente." }, { score: 3, descriptor: "Fundamenta con evidencia pertinente." }, { score: 2, descriptor: "Fundamenta de forma general." }, { score: 1, descriptor: "No logra fundamentar." }] },
          { id: "c2", name: "Comprensión de conceptos", descriptor: "Usa correctamente los conceptos de la unidad.", levels: [{ score: 4, descriptor: "Usa conceptos con precisión." }, { score: 3, descriptor: "Usa conceptos adecuadamente." }, { score: 2, descriptor: "Usa algunos conceptos con imprecisiones." }, { score: 1, descriptor: "No usa conceptos de la unidad." }] },
        ],
      },
    };
  }

  if (t === "ANSWER_KEY" || t === "SOLUCIONARIO" || t === "SCORING_GUIDE" || t === "PAUTA") {
    return { ...base, sections: [...header, ...objective, { id: "ak", kind: "heading", text: "Solucionario / pauta" }], answerKey: [] };
  }

  // DUA / PIE: copia del contenido base con instrucciones segmentadas.
  return {
    ...base,
    sections: [
      ...header,
      ...objective,
      { id: "dua", kind: "heading", text: "Adecuaciones (DUA/PIE)" },
      { id: "dua1", kind: "list", items: ["Instrucciones segmentadas en pasos cortos.", "Vocabulario simple y ejemplos concretos.", "Más espacio de respuesta y menos distractores cuando corresponda."] },
    ],
  };
}

export interface GenerateMaterialInput {
  courseId: string;
  classId?: string;
  unitId?: string;
  type: MaterialType;
  title: string;
  classDate?: string | null;
  requiresPrinting?: boolean;
  reviewConfig?: ReviewConfig;
  learningObjectives?: string[];
  classObjective?: string;
  indicators?: string[];
  oaIds?: string[];
}

/** El profesor genera un material (borrador editable, no se publica). */
export class GenerateMaterialUseCase {
  constructor(private deps: { materials: MaterialRepository }) {}

  async run(input: GenerateMaterialInput, actor: AuthContext | null): Promise<Material> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    assertCourse(actor, input.courseId);
    if (!input.title.trim()) throw new Error("El título es obligatorio.");
    const now = new Date().toISOString();
    const curricular = {
      oa: input.oaIds ?? [],
      objective: input.classObjective ?? "",
      indicators: input.indicators ?? [],
    };
    const config = input.reviewConfig ?? defaultReviewConfig(input.type);

    // Prefill: si existe material sembrado de la misma clase y tipo, se usa como
    // borrador inicial (caso, ítems, referencias y currículo reales, no un molde genérico).
    // Se prefiere el sembrado por la plataforma (createdBy === 'seed-content').
    let content = buildMaterialContent(input.type, input.title.trim(), curricular);
    let seeded: Material | undefined;
    if (input.classId) {
      const candidates = (await this.deps.materials.listByCourse(input.courseId)).filter(
        (m) => m.classId === input.classId && m.type === input.type,
      );
      seeded = candidates.find((m) => m.createdBy === "seed-content") ?? candidates.find((m) => m.content?.contenido) ?? candidates[0];
      if (seeded?.content) {
        const sc = seeded.content;
        content = {
          curricular: sc.curricular ?? curricular,
          contenido: sc.contenido ?? [],
          referencias: sc.referencias ?? [],
          sections: sc.sections ?? [],
          ...(sc.items ? { items: sc.items } : {}),
          ...(sc.rubric ? { rubric: sc.rubric } : {}),
          ...(sc.answerKey ? { answerKey: sc.answerKey } : {}),
          ...(sc.specTable ? { specTable: sc.specTable } : {}),
          ...(sc.pauta ? { pauta: sc.pauta } : {}),
        };
        if (!curricular.oa.length) curricular.oa = sc.curricular?.oa ?? [];
        if (!curricular.objective) curricular.objective = sc.curricular?.objective ?? "";
        if (!curricular.indicators.length) curricular.indicators = sc.curricular?.indicators ?? [];
      }
    }

    const material: Material = {
      id: generateId(),
      courseId: input.courseId,
      classId: input.classId,
      unitId: input.unitId ?? seeded?.unitId,
      type: input.type,
      title: input.title.trim(),
      status: MATERIAL_STATUS.BORRADOR,
      oaIds: curricular.oa.length ? curricular.oa : undefined,
      learningObjectives: input.learningObjectives ?? seeded?.learningObjectives,
      classObjective: curricular.objective || undefined,
      indicators: curricular.indicators.length ? curricular.indicators : undefined,
      version: 1,
      hasDUA: false,
      hasPIE: false,
      requiresPrinting: input.requiresPrinting ?? false,
      requiresReview: true,
      reviewConfig: config,
      content,
      classDate: input.classDate ?? null,
      printDeadline: null,
      reviewDeadline: null,
      createdBy: actor?.uid ?? "server",
      createdAt: now,
      updatedAt: now,
    };
    if (input.classDate) {
      const deadlines = computeDeadlines(input.classDate, input.type, material.requiresPrinting ?? false);
      material.reviewDeadline = deadlines.reviewDeadline ?? null;
      material.printDeadline = deadlines.printDeadline ?? null;
    }
    return this.deps.materials.upsert(material);
  }
}

export interface UpdateMaterialInput {
  materialId: string;
  courseId: string;
  title?: string;
  description?: string;
  content?: MaterialContent;
  curricular?: MaterialContent["curricular"];
  classDate?: string | null;
  requiresPrinting?: boolean;
  duration?: number;
  changeSummary?: string;
}

/** El profesor edita un material; cada corrección genera una versión nueva (no sobrescribe la aprobada). */
export class UpdateMaterialUseCase {
  constructor(private deps: { materials: MaterialRepository; audit: AuditRepository }) {}

  async run(input: UpdateMaterialInput, actor: AuthContext | null): Promise<Material> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    const material = await this.deps.materials.getById(input.materialId);
    if (!material) throw new Error("Material no encontrado.");
    assertCourse(actor, material.courseId);
    if (material.status === MATERIAL_STATUS.READY_TO_PRINT || material.status === MATERIAL_STATUS.ARCHIVED) {
      throw new Error("No se puede editar un material listo para imprimir o archivado.");
    }
    const now = new Date().toISOString();
    const nextVersion = material.version + 1;
    const updated: Material = {
      ...material,
      title: input.title?.trim() || material.title,
      description: input.description ?? material.description,
      content: input.content ?? material.content,
      learningObjectives: input.curricular ? material.learningObjectives : material.learningObjectives,
      classObjective: input.curricular?.objective ?? material.classObjective,
      indicators: input.curricular?.indicators ?? material.indicators,
      oaIds: input.curricular?.oa ?? material.oaIds,
      classDate: input.classDate !== undefined ? input.classDate : material.classDate,
      requiresPrinting: input.requiresPrinting ?? material.requiresPrinting,
      duration: input.duration ?? material.duration,
      version: nextVersion,
      updatedAt: now,
    };
    if (input.classDate !== undefined && input.classDate) {
      const deadlines = computeDeadlines(input.classDate, material.type, updated.requiresPrinting ?? false);
      updated.reviewDeadline = deadlines.reviewDeadline ?? null;
      updated.printDeadline = deadlines.printDeadline ?? null;
    }
    await this.deps.materials.upsert(updated);
    const version: MaterialVersion = {
      id: generateId(),
      materialId: material.id,
      version: nextVersion,
      kind: MATERIAL_KIND.GENERAL,
      fileName: `${slug(updated.title)}-v${nextVersion}.pdf`,
      note: "Contenido editado",
      changeSummary: input.changeSummary ?? `Edición v${nextVersion}`,
      uploadedAt: now,
      by: actor?.uid ?? "server",
    };
    await this.deps.materials.addVersion(version);
    await this.deps.audit.log({
      userId: actor?.uid ?? "server",
      action: "MATERIAL_UPDATED",
      entity: "materials",
      entityId: material.id,
      courseId: material.courseId,
      timestamp: now,
      metadata: { version: nextVersion },
    });
    return updated;
  }
}

export interface DuplicateMaterialInput {
  materialId: string;
  courseId: string;
  targetCourseId?: string;
}

/** Duplica un material (mismo contenido, nuevo borrador) en el mismo u otro curso. */
export class DuplicateMaterialUseCase {
  constructor(private deps: { materials: MaterialRepository; audit: AuditRepository }) {}

  async run(input: DuplicateMaterialInput, actor: AuthContext | null): Promise<Material> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    const material = await this.deps.materials.getById(input.materialId);
    if (!material) throw new Error("Material no encontrado.");
    const target = input.targetCourseId ?? material.courseId;
    assertCourse(actor, target);
    const now = new Date().toISOString();
    const copy: Material = {
      ...material,
      id: generateId(),
      courseId: target,
      courseIds: undefined,
      title: `${material.title} (copia)`,
      status: MATERIAL_STATUS.BORRADOR,
      version: 1,
      parentMaterialId: material.id,
      evaluatorId: undefined,
      pieReviewerId: undefined,
      utpReviewerId: undefined,
      sentAt: null,
      reviewAt: null,
      classDate: null,
      printDeadline: null,
      reviewDeadline: null,
      createdBy: actor?.uid ?? "server",
      createdAt: now,
      updatedAt: now,
    };
    await this.deps.materials.upsert(copy);
    await this.deps.audit.log({
      userId: actor?.uid ?? "server",
      action: "MATERIAL_DUPLICATED",
      entity: "materials",
      entityId: copy.id,
      courseId: target,
      timestamp: now,
      metadata: { sourceId: material.id },
    });
    return copy;
  }
}

/** Archiva un material (no se elimina). */
export class ArchiveMaterialUseCase {
  constructor(private deps: { materials: MaterialRepository; audit: AuditRepository }) {}

  async run(input: { materialId: string; courseId: string }, actor: AuthContext | null): Promise<Material> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    const material = await this.deps.materials.getById(input.materialId);
    if (!material) throw new Error("Material no encontrado.");
    assertCourse(actor, material.courseId);
    const now = new Date().toISOString();
    const updated: Material = { ...material, status: MATERIAL_STATUS.ARCHIVED, archivedAt: now, updatedAt: now };
    await this.deps.materials.upsert(updated);
    await this.deps.audit.log({
      userId: actor?.uid ?? "server",
      action: "MATERIAL_ARCHIVED",
      entity: "materials",
      entityId: material.id,
      courseId: material.courseId,
      timestamp: now,
      metadata: { status: MATERIAL_STATUS.ARCHIVED },
    });
    return updated;
  }
}

export interface SendMaterialForReviewV2Input {
  materialId: string;
  courseId: string;
  evaluatorEmail: string;
  pieEmail?: string;
  utpEmail?: string;
}

/** Envía a revisión multi-actor: crea aprobaciones PENDIENTE para los roles requeridos. */
export class SendMaterialForReviewV2UseCase {
  constructor(
    private deps: {
      materials: MaterialRepository;
      users: UserDirectoryRepository;
      audit: AuditRepository;
    },
  ) {}

  async run(input: SendMaterialForReviewV2Input, actor: AuthContext | null): Promise<Material> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    const material = await this.deps.materials.getById(input.materialId);
    if (!material) throw new Error("Material no encontrado.");
    assertCourse(actor, material.courseId);
    if (!canTransitionMaterial(material.status, MATERIAL_STATUS.ENVIADO_A_REVISION)) {
      throw new Error(`No se puede enviar a revisión desde ${material.status}.`);
    }
    const config = material.reviewConfig ?? defaultReviewConfig(material.type);
    const required = requiredReviewRoles(config);
    const evaluatorUid = await this.deps.users.uidByEmail(input.evaluatorEmail);
    if (!evaluatorUid) throw new Error("Evaluador no encontrado con ese correo.");
    let pieUid: string | undefined;
    let utpUid: string | undefined;
    if (required.includes("PIE")) {
      pieUid = input.pieEmail ? await this.deps.users.uidByEmail(input.pieEmail) ?? undefined : undefined;
      if (!pieUid) throw new Error("Falta el correo de la revisora PIE (obligatoria para este material).");
    }
    if (required.includes("UTP")) {
      utpUid = input.utpEmail ? await this.deps.users.uidByEmail(input.utpEmail) ?? undefined : undefined;
      if (!utpUid) throw new Error("Falta el correo de UTP (obligatoria para este material).");
    }
    const now = new Date().toISOString();
    const updated: Material = {
      ...material,
      status: MATERIAL_STATUS.ENVIADO_A_REVISION,
      evaluatorId: evaluatorUid,
      pieReviewerId: pieUid,
      utpReviewerId: utpUid,
      sentAt: now,
      updatedAt: now,
    };
    await this.deps.materials.upsert(updated);
    await this.deps.materials.upsert({ ...updated, status: MATERIAL_STATUS.EN_REVISION, updatedAt: now });
    for (const role of required) {
      const uid = role === "EVALUADOR" ? evaluatorUid : role === "PIE" ? pieUid : utpUid;
      await this.deps.materials.setApproval(material.id, {
        role,
        status: APPROVAL_STATUS.PENDIENTE,
        by: uid ?? "",
        at: now,
      });
    }
    await this.deps.audit.log({
      userId: actor?.uid ?? "server",
      action: "MATERIAL_SEND_FOR_REVIEW",
      entity: "materials",
      entityId: input.materialId,
      courseId: material.courseId,
      timestamp: now,
      metadata: { requiredRoles: required },
    });
    return { ...updated, status: MATERIAL_STATUS.EN_REVISION };
  }
}

export interface ApproveMaterialInput {
  materialId: string;
  courseId: string;
  decision: "APROBADO" | "CON_OBSERVACIONES" | "SOLICITA_CAMBIOS";
  comment: string;
  section?: string;
}

/** Aprobación por actor (EVALUADOR/PIE/UTP) con comentario. */
export class ApproveMaterialUseCase {
  constructor(
    private deps: {
      materials: MaterialRepository;
      audit: AuditRepository;
    },
  ) {}

  async run(input: ApproveMaterialInput, actor: AuthContext | null): Promise<MaterialDetail> {
    const role = (actor?.role ?? "") as ReviewerRole;
    if (!REVIEWER_ROLES.includes(role)) throw new Error("Rol sin permiso de revisión.");
    const material = await this.deps.materials.getById(input.materialId);
    if (!material) throw new Error("Material no encontrado.");
    if (!isAssignedReviewer(material, role, actor?.uid ?? "")) {
      throw new Error("No tienes acceso a este material.");
    }
    if (material.status !== MATERIAL_STATUS.EN_REVISION && material.status !== MATERIAL_STATUS.REENVIADO) {
      throw new Error(`No se puede revisar en estado ${material.status}.`);
    }
    if (!input.comment.trim()) throw new Error("La revisión requiere un comentario.");
    if (input.comment.length > 4000) throw new Error("El comentario es demasiado largo.");

    const now = new Date().toISOString();
    const status = approvalStatusForDecision(input.decision);
    await this.deps.materials.setApproval(material.id, {
      role,
      status,
      by: actor?.uid ?? "",
      at: now,
    });

    const comment: ReviewComment = {
      id: generateId(),
      materialId: material.id,
      versionId: undefined,
      section: input.section,
      text: input.comment.trim(),
      by: actor?.uid ?? "",
      role,
      at: now,
      resolved: false,
      resolvedAt: null,
    };
    await this.deps.materials.addComment(comment);
    await this.deps.materials.updateComment(comment.id, {});
    const approvalRef = (await this.deps.materials.listApprovals(material.id)).find((a) => a.role === role);
    if (approvalRef) {
      await this.deps.materials.setApproval(material.id, { ...approvalRef, commentId: comment.id });
    }

    const approvals = await this.deps.materials.listApprovals(material.id);
    const gate = approvalGate(material, approvals);
    let status2: MaterialStatus = material.status;
    if (input.decision === "APROBADO" && gate.ready) {
      status2 = MATERIAL_STATUS.APROBADO_FINAL;
    } else if (input.decision !== "APROBADO") {
      status2 = input.decision === "CON_OBSERVACIONES" ? MATERIAL_STATUS.OBSERVACIONES : MATERIAL_STATUS.REQUIERE_CAMBIOS;
    }
    const updated: Material = { ...material, status: status2, reviewAt: now, updatedAt: now };
    await this.deps.materials.upsert(updated);

    await this.deps.audit.log({
      userId: actor?.uid ?? "server",
      action: "MATERIAL_APPROVAL",
      entity: "materials",
      entityId: material.id,
      courseId: material.courseId,
      timestamp: now,
      metadata: { role, decision: input.decision, status: status2 },
    });

    const [versions, comments, requests] = await Promise.all([
      this.deps.materials.listVersions(material.id),
      this.deps.materials.listComments(material.id),
      this.deps.materials.listReviewRequests(material.id),
    ]);
    return { material: updated, versions, comments, approvals, request: requests[0] ?? null };
  }
}

/** El profesor corrige (nueva versión) tras observaciones. */
export class CorrectMaterialUseCase {
  constructor(private deps: { materials: MaterialRepository; audit: AuditRepository }) {}

  async run(input: { materialId: string; courseId: string; content: MaterialContent; changeSummary: string }, actor: AuthContext | null): Promise<Material> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    const material = await this.deps.materials.getById(input.materialId);
    if (!material) throw new Error("Material no encontrado.");
    assertCourse(actor, material.courseId);
    if (material.status !== MATERIAL_STATUS.OBSERVACIONES && material.status !== MATERIAL_STATUS.REQUIERE_CAMBIOS) {
      throw new Error(`No se puede corregir en estado ${material.status}.`);
    }
    const now = new Date().toISOString();
    const next = material.version + 1;
    const updated: Material = { ...material, content: input.content, version: next, status: MATERIAL_STATUS.CORREGIDO, updatedAt: now };
    await this.deps.materials.upsert(updated);
    await this.deps.materials.addVersion({
      id: generateId(),
      materialId: material.id,
      version: next,
      kind: MATERIAL_KIND.GENERAL,
      fileName: `${slug(updated.title)}-v${next}.pdf`,
      note: "Corrección tras revisión",
      changeSummary: input.changeSummary || `Corrección v${next}`,
      uploadedAt: now,
      by: actor?.uid ?? "server",
    });
    await this.deps.audit.log({
      userId: actor?.uid ?? "server",
      action: "MATERIAL_CORRECTED",
      entity: "materials",
      entityId: material.id,
      courseId: material.courseId,
      timestamp: now,
      metadata: { version: next },
    });
    return updated;
  }
}

/** Reenvía a revisión tras corregir (resetea aprobaciones pendientes). */
export class ResubmitMaterialUseCase {
  constructor(private deps: { materials: MaterialRepository; audit: AuditRepository }) {}

  async run(input: { materialId: string; courseId: string }, actor: AuthContext | null): Promise<Material> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    const material = await this.deps.materials.getById(input.materialId);
    if (!material) throw new Error("Material no encontrado.");
    assertCourse(actor, material.courseId);
    if (material.status !== MATERIAL_STATUS.CORREGIDO) throw new Error("Primero debes corregir el material.");
    const now = new Date().toISOString();
    const updated: Material = { ...material, status: MATERIAL_STATUS.REENVIADO, updatedAt: now };
    await this.deps.materials.upsert(updated);
    const approvals = await this.deps.materials.listApprovals(material.id);
    for (const a of approvals) {
      await this.deps.materials.setApproval(material.id, { ...a, status: APPROVAL_STATUS.PENDIENTE, at: now });
    }
    await this.deps.materials.upsert({ ...updated, status: MATERIAL_STATUS.EN_REVISION, updatedAt: now });
    await this.deps.audit.log({
      userId: actor?.uid ?? "server",
      action: "MATERIAL_RESUBMITTED",
      entity: "materials",
      entityId: material.id,
      courseId: material.courseId,
      timestamp: now,
      metadata: { status: MATERIAL_STATUS.EN_REVISION },
    });
    return { ...updated, status: MATERIAL_STATUS.EN_REVISION };
  }
}

/** Pasa a READY_TO_PRINT (solo si todas las aprobaciones obligatorias están completas). */
export class ReadyToPrintUseCase {
  constructor(private deps: { materials: MaterialRepository; audit: AuditRepository }) {}

  async run(input: { materialId: string; courseId: string }, actor: AuthContext | null): Promise<Material> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    const material = await this.deps.materials.getById(input.materialId);
    if (!material) throw new Error("Material no encontrado.");
    assertCourse(actor, material.courseId);
    const approvals = await this.deps.materials.listApprovals(material.id);
    const gate = canReadyToPrint(material, approvals);
    if (!gate.ready) throw new Error(gate.message ?? "No se puede imprimir todavía.");
    const now = new Date().toISOString();
    const updated: Material = { ...material, status: MATERIAL_STATUS.READY_TO_PRINT, updatedAt: now };
    await this.deps.materials.upsert(updated);
    await this.deps.audit.log({
      userId: actor?.uid ?? "server",
      action: "MATERIAL_READY_TO_PRINT",
      entity: "materials",
      entityId: material.id,
      courseId: material.courseId,
      timestamp: now,
      metadata: { status: MATERIAL_STATUS.READY_TO_PRINT },
    });
    return updated;
  }
}

/** Resuelve un comentario (profesor). */
export class ResolveCommentUseCase {
  constructor(private deps: { materials: MaterialRepository }) {}

  async run(input: { materialId: string; commentId: string }, actor: AuthContext | null): Promise<void> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    await this.deps.materials.updateComment(input.commentId, {
      resolved: true,
      resolvedBy: actor?.uid,
      resolvedAt: new Date().toISOString(),
    });
  }
}

/** Lista de materiales pendientes según el rol. */
export class ListPendingForRoleUseCase {
  constructor(private deps: { materials: MaterialRepository }) {}

  async run(courseId: string | undefined, actor: AuthContext | null): Promise<Material[]> {
    const role = actor?.role ?? "";
    if (role === "PROFESOR" || role === "ADMIN" || role === "MASTER") {
      if (!courseId) return [];
      assertCourse(actor, courseId);
      const all = await this.deps.materials.listByCourse(courseId);
      const pendingStatuses: MaterialStatus[] = [
        MATERIAL_STATUS.ENVIADO_A_REVISION,
        MATERIAL_STATUS.EN_REVISION,
        MATERIAL_STATUS.OBSERVACIONES,
        MATERIAL_STATUS.REQUIERE_CAMBIOS,
        MATERIAL_STATUS.APROBADO_FINAL,
      ];
      return all.filter((m) => pendingStatuses.includes(m.status));
    }
    if (REVIEWER_ROLES.includes(role as ReviewerRole)) {
      return this.deps.materials.listByReviewer(role as ReviewerRole, actor?.uid ?? "");
    }
    throw new Error("Rol sin acceso a materiales.");
  }
}

/** Genera el documento (PDF/DOCX) del material según permisos. */
export class GenerateDocumentUseCase {
  constructor(
    private deps: {
      materials: MaterialRepository;
      generator: MaterialDocumentGenerator;
    },
  ) {}

  async run(
    input: { materialId: string; kind: "PDF" | "DOCX" },
    actor: AuthContext | null,
  ): Promise<{ buffer: Uint8Array; mime: string; fileName: string }> {
    const material = await this.deps.materials.getById(input.materialId);
    if (!material) throw new Error("Material no encontrado.");
    const role = actor?.role ?? "";
    if (role === "PROFESOR" || role === "ADMIN" || role === "MASTER") {
      assertCourse(actor, material.courseId);
    } else if (!isAssignedReviewer(material, role as ReviewerRole, actor?.uid ?? "")) {
      throw new Error("No tienes permiso para descargar este material.");
    }
    return input.kind === "PDF"
      ? this.deps.generator.buildPdf(material)
      : this.deps.generator.buildDocx(material);
  }
}

export function isAssignedReviewer(material: Material, role: ReviewerRole, uid: string): boolean {
  if (role === "EVALUADOR") return material.evaluatorId === uid;
  if (role === "PIE") return material.pieReviewerId === uid;
  if (role === "UTP") return material.utpReviewerId === uid;
  return false;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
