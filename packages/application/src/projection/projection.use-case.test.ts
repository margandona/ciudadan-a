import { describe, expect, it } from "vitest";
import { ROLES, type ProjectionToken, type Slide, type SlideDeck, type SlideKind, type VoteResult } from "@pclab/shared";
import type { PresentationRepository, ProjectionTokenRepository, VoteRepository } from "../ports";
import {
  CreateProjectionTokenUseCase,
  GetPresentationUseCase,
  GetVotesUseCase,
  RecordManualVotesUseCase,
  SavePresentationUseCase,
  SubmitVoteUseCase,
} from "./projection.use-case";

const NOW = new Date().toISOString();

function deck(classId = "class-01"): SlideDeck {
  const slides: Slide[] = (["portada", "aprendizaje", "objetivo", "ruta", "activacion", "contenido"] as SlideKind[]).map(
    (kind, i) => ({
      id: `s${i}`,
      kind,
      blocks: [{ id: `b${i}-1`, type: "title" as const, text: kind }, { id: `b${i}-2`, type: "text" as const, text: "ok" }],
    }),
  );
  slides.push({
    id: "s-q",
    kind: "pregunta",
    blocks: [{ id: "bq", type: "question" as const, title: "Q", text: "¿?", options: ["a", "b"], correctIndex: 1 }],
  });
  slides.push({ id: "s-ticket", kind: "ticket", blocks: [{ id: "bt", type: "text", text: "ticket" }] });
  return { classId, courseId: "course-d", version: 1, config: {}, updatedAt: NOW, updatedBy: "t", slides };
}

const DECK = deck();

class FakePresentations implements PresentationRepository {
  byId = new Map<string, SlideDeck>([["class-01", DECK]]);
  async get(classId: string): Promise<SlideDeck | null> {
    return this.byId.get(classId) ?? null;
  }
  async upsert(d: SlideDeck): Promise<SlideDeck> {
    this.byId.set(d.classId, d);
    return d;
  }
}

class FakeTokens implements ProjectionTokenRepository {
  items: ProjectionToken[] = [];
  async create(t: ProjectionToken): Promise<ProjectionToken> {
    this.items.push(t);
    return t;
  }
  async findByTokenId(tokenId: string): Promise<ProjectionToken | null> {
    return this.items.find((t) => t.tokenId === tokenId) ?? null;
  }
}

class FakeVotes implements VoteRepository {
  byKey = new Map<string, VoteResult>();
  async get(classId: string, questionId: string): Promise<VoteResult | null> {
    return this.byKey.get(`${classId}|${questionId}`) ?? null;
  }
  async increment(classId: string, questionId: string, option: string): Promise<VoteResult> {
    const existing = this.byKey.get(`${classId}|${questionId}`) ?? { classId, questionId, counts: {}, total: 0, updatedAt: NOW };
    existing.counts[option] = (existing.counts[option] ?? 0) + 1;
    existing.total += 1;
    this.byKey.set(`${classId}|${questionId}`, existing);
    return existing;
  }
  async setManual(classId: string, questionId: string, counts: Record<string, number>): Promise<VoteResult> {
    const result = { classId, questionId, counts, total: Object.values(counts).reduce((a, b) => a + b, 0), updatedAt: NOW };
    this.byKey.set(`${classId}|${questionId}`, result);
    return result;
  }
}

const TEACHER = { uid: "t1", role: ROLES.PROFESOR, courses: ["course-d"] };
const STUDENT = { uid: "s1", role: ROLES.ESTUDIANTE, courses: ["course-d"] };
const OTHER_TEACHER = { uid: "t2", role: ROLES.PROFESOR, courses: ["course-e"] };

describe("GetPresentationUseCase", () => {
  it("profesor recibe el deck completo", async () => {
    const uc = new GetPresentationUseCase({ presentations: new FakePresentations(), tokens: new FakeTokens() });
    const { deck, isProjection } = await uc.run({ classId: "class-01" }, TEACHER);
    expect(isProjection).toBe(true);
    expect(deck.slides.some((s) => s.blocks.some((b) => "correctIndex" in b))).toBe(true);
  });

  it("estudiante recibe el deck sin respuestas", async () => {
    const uc = new GetPresentationUseCase({ presentations: new FakePresentations(), tokens: new FakeTokens() });
    const { deck, isProjection } = await uc.run({ classId: "class-01" }, STUDENT);
    expect(isProjection).toBe(false);
    for (const s of deck.slides) {
      for (const b of s.blocks) expect(b).not.toHaveProperty("correctIndex");
    }
  });

  it("token válido permite ver el deck (modo proyección sin cuenta)", async () => {
    const tokens = new FakeTokens();
    await tokens.create({ tokenId: "tok", classId: "class-01", courseId: "course-d", expiresAt: new Date(Date.now() + 60000).toISOString(), createdBy: "t1", createdAt: NOW });
    const uc = new GetPresentationUseCase({ presentations: new FakePresentations(), tokens });
    const { isProjection } = await uc.run({ classId: "class-01", tokenId: "tok" }, null);
    expect(isProjection).toBe(true);
  });

  it("token expirado se rechaza", async () => {
    const tokens = new FakeTokens();
    await tokens.create({ tokenId: "tok", classId: "class-01", courseId: "course-d", expiresAt: new Date(Date.now() - 60000).toISOString(), createdBy: "t1", createdAt: NOW });
    const uc = new GetPresentationUseCase({ presentations: new FakePresentations(), tokens });
    await expect(uc.run({ classId: "class-01", tokenId: "tok" }, null)).rejects.toThrow();
  });
});

describe("SavePresentationUseCase", () => {
  it("guarda tras sanitizar y validar la estructura; incrementa versión", async () => {
    const presentations = new FakePresentations();
    const audit = { log: async () => undefined };
    const uc = new SavePresentationUseCase({ presentations, audit });
    const saved = await uc.run({ classId: "class-01", courseId: "course-d", slides: DECK.slides }, TEACHER);
    expect(saved.version).toBe(2);
    expect(saved.slides[saved.slides.length - 1]!.kind).toBe("ticket");
  });

  it("rechaza una estructura incompleta", async () => {
    const uc = new SavePresentationUseCase({ presentations: new FakePresentations(), audit: { log: async () => undefined } });
    const bad = DECK.slides.filter((s) => s.kind !== "objetivo");
    await expect(uc.run({ classId: "class-01", courseId: "course-d", slides: bad }, TEACHER)).rejects.toThrow(/obligatoria/);
  });
});

describe("CreateProjectionTokenUseCase", () => {
  it("genera un token con expiración futura", async () => {
    const tokens = new FakeTokens();
    const uc = new CreateProjectionTokenUseCase({ tokens });
    const token = await uc.run({ classId: "class-01", courseId: "course-d" }, TEACHER);
    expect(token.tokenId).toBeTruthy();
    expect(new Date(token.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("rechaza crear token para un curso ajeno", async () => {
    const uc = new CreateProjectionTokenUseCase({ tokens: new FakeTokens() });
    await expect(uc.run({ classId: "class-01", courseId: "course-d" }, OTHER_TEACHER)).rejects.toThrow();
  });
});

describe("SubmitVoteUseCase y RecordManualVotesUseCase", () => {
  it("registra un voto agregado dentro del rango de opciones", async () => {
    const votes = new FakeVotes();
    const uc = new SubmitVoteUseCase({ presentations: new FakePresentations(), votes });
    const result = await uc.run({ classId: "class-01", questionId: "bq", option: 0 }, STUDENT);
    expect(result.total).toBe(1);
    expect(result.counts["0"]).toBe(1);
  });

  it("rechaza una opción fuera de rango", async () => {
    const uc = new SubmitVoteUseCase({ presentations: new FakePresentations(), votes: new FakeVotes() });
    await expect(uc.run({ classId: "class-01", questionId: "bq", option: 9 }, STUDENT)).rejects.toThrow();
  });

  it("el profesor puede registrar conteos manuales (modo sin dispositivos)", async () => {
    const votes = new FakeVotes();
    const uc = new RecordManualVotesUseCase({ presentations: new FakePresentations(), votes });
    const result = await uc.run({ classId: "class-01", questionId: "bq", counts: { "0": 8, "1": 5 } }, TEACHER);
    expect(result.total).toBe(13);
  });

  it("GetVotesUseCase devuelve solo agregados", async () => {
    const votes = new FakeVotes();
    await votes.increment("class-01", "q", "0");
    const uc = new GetVotesUseCase({ votes });
    const result = await uc.run({ classId: "class-01", questionId: "q" }, TEACHER);
    expect(result?.total).toBe(1);
    expect(result).not.toHaveProperty("voters");
  });
});
