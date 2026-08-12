import { describe, expect, it } from "vitest";
import {
  APPROVAL_STATUS,
  MATERIAL_STATUS,
  MATERIAL_TYPE,
  type AuditLog,
  type Material,
  type MaterialApproval,
  type MaterialVersion,
  type ReviewComment,
  type ReviewRequest,
} from "@pclab/shared";
import type { MaterialRepository, UserDirectoryRepository } from "../ports";
import {
  ApproveMaterialUseCase,
  ArchiveMaterialUseCase,
  CorrectMaterialUseCase,
  DuplicateMaterialUseCase,
  GenerateMaterialUseCase,
  ReadyToPrintUseCase,
  ResubmitMaterialUseCase,
  SendMaterialForReviewV2UseCase,
  UpdateMaterialUseCase,
  buildMaterialContent,
} from "./material-v2.use-case";

class FakeMaterials implements MaterialRepository {
  byId = new Map<string, Material>();
  versions = new Map<string, MaterialVersion[]>();
  comments = new Map<string, ReviewComment[]>();
  requests = new Map<string, ReviewRequest[]>();
  approvals = new Map<string, MaterialApproval[]>();

  async getById(id: string): Promise<Material | null> {
    return this.byId.get(id) ?? null;
  }
  async listByCourse(courseId: string): Promise<Material[]> {
    return [...this.byId.values()].filter((m) => m.courseId === courseId);
  }
  async listByEvaluator(): Promise<Material[]> {
    return [];
  }
  async upsert(m: Material): Promise<Material> {
    this.byId.set(m.id, m);
    return m;
  }
  async addVersion(v: MaterialVersion): Promise<MaterialVersion> {
    const list = this.versions.get(v.materialId) ?? [];
    list.push(v);
    this.versions.set(v.materialId, list);
    return v;
  }
  async listVersions(materialId: string): Promise<MaterialVersion[]> {
    return this.versions.get(materialId) ?? [];
  }
  async addComment(c: ReviewComment): Promise<ReviewComment> {
    const list = this.comments.get(c.materialId) ?? [];
    list.push(c);
    this.comments.set(c.materialId, list);
    return c;
  }
  async listComments(materialId: string): Promise<ReviewComment[]> {
    return this.comments.get(materialId) ?? [];
  }
  async updateComment(): Promise<void> {
    return;
  }
  async addReviewRequest(r: ReviewRequest): Promise<ReviewRequest> {
    const list = this.requests.get(r.materialId) ?? [];
    list.push(r);
    this.requests.set(r.materialId, list);
    return r;
  }
  async listReviewRequests(materialId: string): Promise<ReviewRequest[]> {
    return this.requests.get(materialId) ?? [];
  }
  async respondReviewRequest(): Promise<void> {
    return;
  }
  async listApprovals(materialId: string): Promise<MaterialApproval[]> {
    return this.approvals.get(materialId) ?? [];
  }
  async setApproval(materialId: string, approval: MaterialApproval): Promise<void> {
    const list = this.approvals.get(materialId) ?? [];
    const idx = list.findIndex((a) => a.role === approval.role);
    if (idx >= 0) list[idx] = approval;
    else list.push(approval);
    this.approvals.set(materialId, list);
  }
  async listByReviewer(): Promise<Material[]> {
    return [];
  }
  async listArchived(): Promise<Material[]> {
    return [];
  }
}

class FakeUsers implements UserDirectoryRepository {
  constructor(private map = new Map<string, string>()) {}
  async uidByEmail(email: string): Promise<string | null> {
    return this.map.get(email) ?? null;
  }
}

class FakeAudit {
  logs: AuditLog[] = [];
  async log(entry: AuditLog): Promise<void> {
    this.logs.push(entry);
  }
}

const TEACHER = { uid: "t1", role: "PROFESOR", courses: ["course-d"] };
const EVALUATOR = { uid: "e1", role: "EVALUADOR", courses: [] };
const PIE = { uid: "p1", role: "PIE", courses: [] };
const UTP = { uid: "u1", role: "UTP", courses: [] };
const OTHER_TEACHER = { uid: "t2", role: "PROFESOR", courses: ["course-e"] };

const USERS = new FakeUsers(new Map([["evaluador@demo.cl", "e1"], ["pie@demo.cl", "p1"], ["utp@demo.cl", "u1"]]));

describe("GenerateMaterialUseCase", () => {
  it("genera una guía como borrador con contenido real (no vacío)", async () => {
    const repo = new FakeMaterials();
    const m = await new GenerateMaterialUseCase({ materials: repo }).run(
      { courseId: "course-d", classId: "class-02", type: MATERIAL_TYPE.GUIDE, title: "Guía 02 — Consejo Ciudadano", requiresPrinting: true },
      TEACHER,
    );
    expect(m.status).toBe(MATERIAL_STATUS.BORRADOR);
    expect(m.version).toBe(1);
    expect(m.content?.sections.length).toBeGreaterThan(0);
    expect(m.printDeadline).toBeNull();
    expect(m.reviewDeadline).toBeNull();
  });

  it("calcula plazos cuando hay fecha de clase (prueba → −7 revisión; guía impresa → −3 impresión)", async () => {
    const repo = new FakeMaterials();
    const base = { courseId: "course-d", title: "X", classDate: "2026-08-20T18:00:00.000Z" };
    const test = await new GenerateMaterialUseCase({ materials: repo }).run({ ...base, type: MATERIAL_TYPE.WRITTEN_TEST }, TEACHER);
    expect(test.reviewDeadline?.slice(0, 10)).toBe("2026-08-13");
    const guide = await new GenerateMaterialUseCase({ materials: repo }).run({ ...base, type: MATERIAL_TYPE.GUIDE, requiresPrinting: true }, TEACHER);
    expect(guide.printDeadline?.slice(0, 10)).toBe("2026-08-17");
  });
});

describe("UpdateMaterialUseCase + Duplicate + Archive", () => {
  it("edita y versiona sin sobrescribir la versión aprobada", async () => {
    const repo = new FakeMaterials();
    const m = await new GenerateMaterialUseCase({ materials: repo }).run({ courseId: "course-d", type: MATERIAL_TYPE.GUIDE, title: "Guía" }, TEACHER);
    const audit = new FakeAudit();
    const updated = await new UpdateMaterialUseCase({ materials: repo, audit }).run(
      { materialId: m.id, courseId: "course-d", title: "Guía v2", content: buildMaterialContent(MATERIAL_TYPE.GUIDE, "Guía v2", { oa: ["OA6"], objective: "x", indicators: ["i1"] }) },
      TEACHER,
    );
    expect(updated.version).toBe(2);
    expect(updated.title).toBe("Guía v2");
    const versions = await repo.listVersions(m.id);
    expect(versions).toHaveLength(1);
    expect(versions[0]!.version).toBe(2);
  });

  it("duplica como nuevo borrador y archiva", async () => {
    const repo = new FakeMaterials();
    const m = await new GenerateMaterialUseCase({ materials: repo }).run({ courseId: "course-d", type: MATERIAL_TYPE.GUIDE, title: "Guía" }, TEACHER);
    const audit = new FakeAudit();
    const copy = await new DuplicateMaterialUseCase({ materials: repo, audit }).run({ materialId: m.id, courseId: "course-d" }, TEACHER);
    expect(copy.id).not.toBe(m.id);
    expect(copy.status).toBe(MATERIAL_STATUS.BORRADOR);
    expect(copy.title).toContain("(copia)");
    const archived = await new ArchiveMaterialUseCase({ materials: repo, audit }).run({ materialId: m.id, courseId: "course-d" }, TEACHER);
    expect(archived.status).toBe(MATERIAL_STATUS.ARCHIVED);
  });
});

describe("Flujo institucional multi-actor", () => {
  async function readyPrueba(): Promise<{ repo: FakeMaterials; m: Material }> {
    const repo = new FakeMaterials();
    const m = await new GenerateMaterialUseCase({ materials: repo }).run(
      { courseId: "course-d", type: MATERIAL_TYPE.WRITTEN_TEST, title: "Prueba U3", classDate: "2026-08-20T18:00:00.000Z" },
      TEACHER,
    );
    return { repo, m };
  }

  it("envía a revisión multi-rol (evaluadora + PIE + UTP) y crea aprobaciones PENDIENTE", async () => {
    const { repo, m } = await readyPrueba();
    const audit = new FakeAudit();
    const sent = await new SendMaterialForReviewV2UseCase({ materials: repo, users: USERS, audit }).run(
      { materialId: m.id, courseId: "course-d", evaluatorEmail: "evaluador@demo.cl", pieEmail: "pie@demo.cl", utpEmail: "utp@demo.cl" },
      TEACHER,
    );
    expect(sent.status).toBe(MATERIAL_STATUS.EN_REVISION);
    expect(repo.approvals.get(m.id)).toHaveLength(3);
    for (const a of repo.approvals.get(m.id)!) expect(a.status).toBe(APPROVAL_STATUS.PENDIENTE);
  });

  it("solo con todas las aprobaciones pasa a APROBADO_FINAL", async () => {
    const { repo, m } = await readyPrueba();
    const audit = new FakeAudit();
    const send = new SendMaterialForReviewV2UseCase({ materials: repo, users: USERS, audit });
    await send.run({ materialId: m.id, courseId: "course-d", evaluatorEmail: "evaluador@demo.cl", pieEmail: "pie@demo.cl", utpEmail: "utp@demo.cl" }, TEACHER);
    const approve = new ApproveMaterialUseCase({ materials: repo, audit });

    await approve.run({ materialId: m.id, courseId: "course-d", decision: "APROBADO", comment: "OK" }, EVALUATOR);
    let current = await repo.getById(m.id);
    expect(current?.status).toBe(MATERIAL_STATUS.EN_REVISION); // faltan PIE y UTP

    await approve.run({ materialId: m.id, courseId: "course-d", decision: "APROBADO", comment: "DUA bien" }, PIE);
    current = await repo.getById(m.id);
    expect(current?.status).toBe(MATERIAL_STATUS.EN_REVISION); // falta UTP

    await approve.run({ materialId: m.id, courseId: "course-d", decision: "APROBADO", comment: "Validado" }, UTP);
    current = await repo.getById(m.id);
    expect(current?.status).toBe(MATERIAL_STATUS.APROBADO_FINAL);
  });

  it("SOLICITA_CAMBIOS de PIE bloquea READY_TO_PRINT", async () => {
    const { repo, m } = await readyPrueba();
    const audit = new FakeAudit();
    const send = new SendMaterialForReviewV2UseCase({ materials: repo, users: USERS, audit });
    await send.run({ materialId: m.id, courseId: "course-d", evaluatorEmail: "evaluador@demo.cl", pieEmail: "pie@demo.cl", utpEmail: "utp@demo.cl" }, TEACHER);
    const approve = new ApproveMaterialUseCase({ materials: repo, audit });
    await approve.run({ materialId: m.id, courseId: "course-d", decision: "APROBADO", comment: "OK" }, EVALUATOR);
    await approve.run({ materialId: m.id, courseId: "course-d", decision: "SOLICITA_CAMBIOS", comment: "Segmenta las instrucciones" }, PIE);
    const current = await repo.getById(m.id);
    expect(current?.status).toBe(MATERIAL_STATUS.REQUIERE_CAMBIOS);

    const ready = new ReadyToPrintUseCase({ materials: repo, audit });
    await expect(ready.run({ materialId: m.id, courseId: "course-d" }, TEACHER)).rejects.toThrow();
  });

  it("corrige, reenvía y aprueba (FLOW 1)", async () => {
    const { repo, m } = await readyPrueba();
    const audit = new FakeAudit();
    const send = new SendMaterialForReviewV2UseCase({ materials: repo, users: USERS, audit });
    await send.run({ materialId: m.id, courseId: "course-d", evaluatorEmail: "evaluador@demo.cl", pieEmail: "pie@demo.cl", utpEmail: "utp@demo.cl" }, TEACHER);
    const approve = new ApproveMaterialUseCase({ materials: repo, audit });
    await approve.run({ materialId: m.id, courseId: "course-d", decision: "SOLICITA_CAMBIOS", comment: "Revisa el ítem 2" }, EVALUATOR);

    const correct = new CorrectMaterialUseCase({ materials: repo, audit });
    const corrected = await correct.run({ materialId: m.id, courseId: "course-d", content: buildMaterialContent(MATERIAL_TYPE.WRITTEN_TEST, "Prueba U3", { oa: ["OA6"], objective: "x", indicators: ["i1"] }), changeSummary: "Corregí ítem 2" }, TEACHER);
    expect(corrected.status).toBe(MATERIAL_STATUS.CORREGIDO);
    expect(corrected.version).toBe(2);

    const resubmit = new ResubmitMaterialUseCase({ materials: repo, audit });
    const resent = await resubmit.run({ materialId: m.id, courseId: "course-d" }, TEACHER);
    expect(resent.status).toBe(MATERIAL_STATUS.EN_REVISION);

    for (const actor of [EVALUATOR, PIE, UTP]) {
      await approve.run({ materialId: m.id, courseId: "course-d", decision: "APROBADO", comment: "OK" }, actor);
    }
    const final = await repo.getById(m.id);
    expect(final?.status).toBe(MATERIAL_STATUS.APROBADO_FINAL);

    const ready = new ReadyToPrintUseCase({ materials: repo, audit });
    const printable = await ready.run({ materialId: m.id, courseId: "course-d" }, TEACHER);
    expect(printable.status).toBe(MATERIAL_STATUS.READY_TO_PRINT);
  });

  it("niega la revisión a un rol sin acceso", async () => {
    const { repo, m } = await readyPrueba();
    const audit = new FakeAudit();
    const send = new SendMaterialForReviewV2UseCase({ materials: repo, users: USERS, audit });
    await send.run({ materialId: m.id, courseId: "course-d", evaluatorEmail: "evaluador@demo.cl", pieEmail: "pie@demo.cl", utpEmail: "utp@demo.cl" }, TEACHER);
    const approve = new ApproveMaterialUseCase({ materials: repo, audit });
    await expect(approve.run({ materialId: m.id, courseId: "course-d", decision: "APROBADO", comment: "x" }, OTHER_TEACHER)).rejects.toThrow();
  });
});
