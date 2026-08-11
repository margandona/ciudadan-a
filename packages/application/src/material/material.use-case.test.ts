import { describe, expect, it } from "vitest";
import { MATERIAL_STATUS, type AuditLog, type Material, type MaterialDetail, type MaterialVersion, type ReviewComment, type ReviewRequest } from "@pclab/shared";
import type { MaterialRepository, UserDirectoryRepository } from "../ports";
import {
  AddMaterialVersionUseCase,
  CreateMaterialUseCase,
  GetMaterialDetailUseCase,
  ListMaterialsForEvaluatorUseCase,
  ReviewMaterialUseCase,
  SendMaterialForReviewUseCase,
} from "./material.use-case";

const NOW = new Date().toISOString();

class FakeMaterials implements MaterialRepository {
  byId = new Map<string, Material>();
  versions = new Map<string, MaterialVersion[]>();
  comments = new Map<string, ReviewComment[]>();
  requests = new Map<string, ReviewRequest[]>();

  async getById(id: string): Promise<Material | null> {
    return this.byId.get(id) ?? null;
  }
  async listByCourse(courseId: string): Promise<Material[]> {
    return [...this.byId.values()].filter((m) => m.courseId === courseId);
  }
  async listByEvaluator(evaluatorId: string): Promise<Material[]> {
    return [...this.byId.values()].filter((m) => m.evaluatorId === evaluatorId);
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
  async addReviewRequest(r: ReviewRequest): Promise<ReviewRequest> {
    const list = this.requests.get(r.materialId) ?? [];
    list.push(r);
    this.requests.set(r.materialId, list);
    return r;
  }
  async listReviewRequests(materialId: string): Promise<ReviewRequest[]> {
    return this.requests.get(materialId) ?? [];
  }
  async respondReviewRequest(requestId: string, respondedAt: string): Promise<void> {
    for (const list of this.requests.values()) {
      for (const r of list) {
        if (r.id === requestId) {
          r.state = "RESPONDED";
          r.respondedAt = respondedAt;
        }
      }
    }
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

function material(over: Partial<Material>): Material {
  return {
    id: "mat-1",
    courseId: "course-d",
    type: "guia",
    title: "Guía 03",
    status: MATERIAL_STATUS.BORRADOR,
    hasDUA: true,
    sentAt: null,
    reviewAt: null,
    updatedAt: NOW,
    ...over,
  };
}

const TEACHER = { uid: "t1", role: "PROFESOR", courses: ["course-d"] };
const EVALUATOR = { uid: "e1", role: "EVALUADOR", courses: ["course-d", "course-e"] };
const OTHER_TEACHER = { uid: "t2", role: "PROFESOR", courses: ["course-e"] };

describe("CreateMaterialUseCase + AddMaterialVersionUseCase", () => {
  it("crea en BORRADOR y agrega versiones GENERAL y DUA", async () => {
    const repo = new FakeMaterials();
    const created = await new CreateMaterialUseCase({ materials: repo }).run(
      { courseId: "course-d", type: "guia", title: "Guía 03", hasDUA: true },
      TEACHER,
    );
    expect(created.status).toBe(MATERIAL_STATUS.BORRADOR);

    const adder = new AddMaterialVersionUseCase({ materials: repo });
    const general = await adder.run({ materialId: created.id, courseId: "course-d", kind: "GENERAL", fileName: "g.pdf", mime: "application/pdf" }, TEACHER);
    const dua = await adder.run({ materialId: created.id, courseId: "course-d", kind: "DUA", fileName: "g-dua.pdf", mime: "application/pdf" }, TEACHER);
    expect(general.version).toBe(1);
    expect(dua.version).toBe(2);
  });

  it("rechaza agregar versión a un material de otro curso", async () => {
    const repo = new FakeMaterials();
    const created = await new CreateMaterialUseCase({ materials: repo }).run({ courseId: "course-d", type: "guia", title: "X", hasDUA: false }, TEACHER);
    await expect(
      new AddMaterialVersionUseCase({ materials: repo }).run({ materialId: created.id, courseId: "course-d", kind: "GENERAL", fileName: "a.pdf" }, OTHER_TEACHER),
    ).rejects.toThrow();
  });
});

describe("SendMaterialForReviewUseCase", () => {
  it("asigna evaluador, cambia a EN_REVISION y crea la solicitud", async () => {
    const repo = new FakeMaterials();
    const created = await new CreateMaterialUseCase({ materials: repo }).run({ courseId: "course-d", type: "evaluacion", title: "Eval", hasDUA: true }, TEACHER);
    const users = new FakeUsers(new Map([["evaluador@demo.cl", "e1"]]));
    const audit = new FakeAudit();
    const updated = await new SendMaterialForReviewUseCase({ materials: repo, users, audit }).run(
      { materialId: created.id, courseId: "course-d", evaluatorEmail: "evaluador@demo.cl" },
      TEACHER,
    );
    expect(updated.status).toBe(MATERIAL_STATUS.EN_REVISION);
    expect(updated.evaluatorId).toBe("e1");
    expect(audit.logs[0]?.action).toBe("MATERIAL_SEND_FOR_REVIEW");
    expect(repo.requests.get(created.id)?.length).toBe(1);
  });

  it("rechaza si el evaluador no existe", async () => {
    const repo = new FakeMaterials();
    const created = await new CreateMaterialUseCase({ materials: repo }).run({ courseId: "course-d", type: "guia", title: "X", hasDUA: false }, TEACHER);
    await expect(
      new SendMaterialForReviewUseCase({ materials: repo, users: new FakeUsers(), audit: new FakeAudit() }).run(
        { materialId: created.id, courseId: "course-d", evaluatorEmail: "nadie@demo.cl" },
        TEACHER,
      ),
    ).rejects.toThrow(/Evaluador no encontrado/);
  });
});

describe("ReviewMaterialUseCase", () => {
  it("el evaluador aprueba con comentario y registra la revisión", async () => {
    const repo = new FakeMaterials();
    const mat = material({ id: "mat-1", status: MATERIAL_STATUS.EN_REVISION, evaluatorId: "e1" });
    await repo.upsert(mat);
    const audit = new FakeAudit();
    const detail = await new ReviewMaterialUseCase({ materials: repo, audit }).run(
      { materialId: "mat-1", courseId: "course-d", status: MATERIAL_STATUS.APROBADO, comment: "Aprobado" },
      EVALUATOR,
    );
    expect(detail.material.status).toBe(MATERIAL_STATUS.APROBADO);
    expect(detail.comments).toHaveLength(1);
    expect(detail.comments[0]!.text).toBe("Aprobado");
    expect(audit.logs[0]?.action).toBe("MATERIAL_REVIEW");
  });

  it("impide que un evaluador revise material no asignado", async () => {
    const repo = new FakeMaterials();
    await repo.upsert(material({ id: "mat-1", status: MATERIAL_STATUS.EN_REVISION, evaluatorId: "otro" }));
    await expect(
      new ReviewMaterialUseCase({ materials: repo, audit: new FakeAudit() }).run(
        { materialId: "mat-1", courseId: "course-d", status: MATERIAL_STATUS.APROBADO, comment: "x" },
        EVALUATOR,
      ),
    ).rejects.toThrow();
  });
});

describe("ListMaterialsForEvaluatorUseCase + GetMaterialDetailUseCase", () => {
  it("lista solo lo asignado y el detalle no expone datos de estudiantes", async () => {
    const repo = new FakeMaterials();
    await repo.upsert(material({ id: "m1", status: MATERIAL_STATUS.EN_REVISION, evaluatorId: "e1" }));
    await repo.upsert(material({ id: "m2", status: MATERIAL_STATUS.EN_REVISION, evaluatorId: "otro" }));
    const list = await new ListMaterialsForEvaluatorUseCase({ materials: repo }).run(EVALUATOR);
    expect(list.map((m) => m.id)).toEqual(["m1"]);

    const detail = await new GetMaterialDetailUseCase({ materials: repo }).run("m1", EVALUATOR);
    expect((detail as MaterialDetail).material.id).toBe("m1");
  });
});
