import {
  MATERIAL_STATUS,
  ROLES,
  type Material,
  type MaterialDetail,
  type MaterialStatus,
  type MaterialVersion,
  type ReviewComment,
  type ReviewRequest,
} from "@pclab/shared";
import { canTransitionMaterial, validateMaterialVersion } from "@pclab/domain";
import { assertCourse, assertRole } from "../auth";
import { generateId } from "../id";
import type {
  AuditRepository,
  AuthContext,
  MaterialRepository,
  UserDirectoryRepository,
} from "../ports";

export interface CreateMaterialInput {
  courseId: string;
  type: Material["type"];
  title: string;
  classId?: string;
  hasDUA: boolean;
  oaIds?: string[];
  printDeadline?: string | null;
  reviewDeadline?: string | null;
}

export class CreateMaterialUseCase {
  constructor(private deps: { materials: MaterialRepository }) {}

  async run(input: CreateMaterialInput, actor: AuthContext | null): Promise<Material> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    assertCourse(actor, input.courseId);
    if (!input.title.trim()) throw new Error("El título es obligatorio.");
    const now = new Date().toISOString();
    const material: Material = {
      id: generateId(),
      courseId: input.courseId,
      classId: input.classId,
      type: input.type,
      title: input.title.trim(),
      oaIds: input.oaIds,
      status: MATERIAL_STATUS.BORRADOR,
      hasDUA: input.hasDUA,
      sentAt: null,
      reviewAt: null,
      printDeadline: input.printDeadline ?? null,
      reviewDeadline: input.reviewDeadline ?? null,
      updatedAt: now,
    };
    return this.deps.materials.upsert(material);
  }
}

export interface AddMaterialVersionInput {
  materialId: string;
  courseId: string;
  kind: "GENERAL" | "DUA";
  fileName: string;
  mime?: string;
  size?: number;
  url?: string;
  storagePath?: string;
  note?: string;
}

/** El profesor agrega una versión GENERAL o DUA del material. */
export class AddMaterialVersionUseCase {
  constructor(private deps: { materials: MaterialRepository }) {}

  async run(input: AddMaterialVersionInput, actor: AuthContext | null): Promise<MaterialVersion> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    const material = await this.deps.materials.getById(input.materialId);
    if (!material) throw new Error("Material no encontrado.");
    assertCourse(actor, material.courseId);

    validateMaterialVersion({ kind: input.kind, fileName: input.fileName, mime: input.mime, size: input.size });

    const versions = await this.deps.materials.listVersions(input.materialId);
    const version: MaterialVersion = {
      id: generateId(),
      materialId: input.materialId,
      version: versions.length + 1,
      kind: input.kind,
      fileName: input.fileName.trim(),
      mime: input.mime,
      size: input.size,
      url: input.url,
      storagePath: input.storagePath,
      note: input.note,
      uploadedAt: new Date().toISOString(),
      by: actor?.uid ?? "server",
    };
    await this.deps.materials.addVersion(version);
    await this.deps.materials.upsert({ ...material, updatedAt: new Date().toISOString() });
    return version;
  }
}

export interface SendMaterialForReviewInput {
  materialId: string;
  courseId: string;
  evaluatorEmail: string;
}

/** El profesor envía a revisión; se asigna al evaluador por email y se crea la solicitud. */
export class SendMaterialForReviewUseCase {
  constructor(
    private deps: {
      materials: MaterialRepository;
      users: UserDirectoryRepository;
      audit: AuditRepository;
    },
  ) {}

  async run(input: SendMaterialForReviewInput, actor: AuthContext | null): Promise<Material> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    const material = await this.deps.materials.getById(input.materialId);
    if (!material) throw new Error("Material no encontrado.");
    assertCourse(actor, material.courseId);
    if (!canTransitionMaterial(material.status, MATERIAL_STATUS.EN_REVISION)) {
      throw new Error(`No se puede enviar a revisión desde ${material.status}.`);
    }

    const evaluatorUid = await this.deps.users.uidByEmail(input.evaluatorEmail);
    if (!evaluatorUid) throw new Error("Evaluador no encontrado con ese correo.");

    const now = new Date().toISOString();
    const updated: Material = { ...material, status: MATERIAL_STATUS.EN_REVISION, evaluatorId: evaluatorUid, sentAt: now, updatedAt: now };
    await this.deps.materials.upsert(updated);

    const request: ReviewRequest = {
      id: generateId(),
      materialId: input.materialId,
      courseId: material.courseId,
      requestedBy: actor?.uid ?? "server",
      evaluatorId: evaluatorUid,
      state: "PENDING",
      requestedAt: now,
      respondedAt: null,
    };
    await this.deps.materials.addReviewRequest(request);

    await this.deps.audit.log({
      userId: actor?.uid ?? "server",
      action: "MATERIAL_SEND_FOR_REVIEW",
      entity: "materials",
      entityId: input.materialId,
      courseId: material.courseId,
      timestamp: now,
      metadata: { evaluatorId: evaluatorUid },
    });
    return updated;
  }
}

export class ListMaterialsForTeacherUseCase {
  constructor(private deps: { materials: MaterialRepository }) {}

  async run(courseId: string, actor: AuthContext | null): Promise<Material[]> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    assertCourse(actor, courseId);
    return this.deps.materials.listByCourse(courseId);
  }
}

export class ListMaterialsForEvaluatorUseCase {
  constructor(private deps: { materials: MaterialRepository }) {}

  async run(actor: AuthContext | null): Promise<Material[]> {
    assertRole(actor, [ROLES.EVALUADOR, ROLES.ADMIN, ROLES.MASTER]);
    return this.deps.materials.listByEvaluator(actor?.uid ?? "");
  }
}

export class GetMaterialDetailUseCase {
  constructor(private deps: { materials: MaterialRepository }) {}

  async run(materialId: string, actor: AuthContext | null): Promise<MaterialDetail> {
    const material = await this.deps.materials.getById(materialId);
    if (!material) throw new Error("Material no encontrado.");

    if (actor?.role === ROLES.EVALUADOR) {
      if (material.evaluatorId !== actor.uid) throw new Error("No tienes acceso a este material.");
    } else {
      assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
      assertCourse(actor, material.courseId);
    }

    const [versions, comments, requests] = await Promise.all([
      this.deps.materials.listVersions(materialId),
      this.deps.materials.listComments(materialId),
      this.deps.materials.listReviewRequests(materialId),
    ]);
    return { material, versions, comments, request: requests[0] ?? null };
  }
}

export interface ReviewMaterialInput {
  materialId: string;
  courseId: string;
  status: Extract<MaterialStatus, "APROBADO" | "RECHAZADO" | "CON_OBSERVACIONES" | "CORREGIR_Y_REENVIAR">;
  comment: string;
}

/** El evaluador comenta y mueve el material (aprobado/rechazado/observaciones/corregir). */
export class ReviewMaterialUseCase {
  constructor(
    private deps: {
      materials: MaterialRepository;
      audit: AuditRepository;
    },
  ) {}

  async run(input: ReviewMaterialInput, actor: AuthContext | null): Promise<MaterialDetail> {
    assertRole(actor, [ROLES.EVALUADOR, ROLES.ADMIN, ROLES.MASTER]);
    const material = await this.deps.materials.getById(input.materialId);
    if (!material) throw new Error("Material no encontrado.");
    if (material.evaluatorId !== actor?.uid && actor?.role !== ROLES.ADMIN && actor?.role !== ROLES.MASTER) {
      throw new Error("No tienes acceso a este material.");
    }
    if (!canTransitionMaterial(material.status, input.status)) {
      throw new Error(`Transición inválida: ${material.status} → ${input.status}`);
    }
    if (!input.comment.trim()) throw new Error("La revisión requiere un comentario.");

    const now = new Date().toISOString();
    const updated: Material = { ...material, status: input.status, reviewAt: now, updatedAt: now };
    await this.deps.materials.upsert(updated);

    const comment: ReviewComment = {
      id: generateId(),
      materialId: input.materialId,
      text: input.comment.trim(),
      by: actor?.uid ?? "server",
      role: "EVALUADOR",
      at: now,
    };
    await this.deps.materials.addComment(comment);

    const requests = await this.deps.materials.listReviewRequests(input.materialId);
    if (requests[0]) await this.deps.materials.respondReviewRequest(requests[0].id, now);

    await this.deps.audit.log({
      userId: actor?.uid ?? "server",
      action: "MATERIAL_REVIEW",
      entity: "materials",
      entityId: input.materialId,
      courseId: material.courseId,
      timestamp: now,
      metadata: { status: input.status },
    });

    const [versions, comments, requestsAfter] = await Promise.all([
      this.deps.materials.listVersions(input.materialId),
      this.deps.materials.listComments(input.materialId),
      this.deps.materials.listReviewRequests(input.materialId),
    ]);
    return { material: updated, versions, comments, request: requestsAfter[0] ?? null };
  }
}
