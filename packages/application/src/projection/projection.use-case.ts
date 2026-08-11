import { ROLES, type ProjectionToken, type SlideDeck, type SlideKind, type VoteResult } from "@pclab/shared";
import { sanitizeSlideBlocks, stripAnswers, validateDeckStructure } from "@pclab/domain";
import { assertCourse, assertRole } from "../auth";
import { generateId } from "../id";
import type {
  AuditRepository,
  AuthContext,
  PresentationRepository,
  ProjectionTokenRepository,
  VoteRepository,
} from "../ports";

const TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas

/** Devuelve la presentación; según rol, con o sin respuestas. */
export class GetPresentationUseCase {
  constructor(
    private deps: {
      presentations: PresentationRepository;
      tokens: ProjectionTokenRepository;
    },
  ) {}

  async run(
    input: { classId: string; tokenId?: string },
    actor: AuthContext | null,
  ): Promise<{ deck: SlideDeck; isProjection: boolean }> {
    const deck = await this.deps.presentations.get(input.classId);
    if (!deck) throw new Error("Presentación no encontrada.");

    const isStaff = actor && (actor.role === ROLES.PROFESOR || actor.role === ROLES.ADMIN || actor.role === ROLES.MASTER);
    if (isStaff) {
      assertCourse(actor, deck.courseId);
      return { deck, isProjection: true };
    }

    // Token de proyección válido (dispositivo en aula, sin cuentas).
    if (input.tokenId) {
      const token = await this.deps.tokens.findByTokenId(input.tokenId);
      if (token && token.classId === input.classId && new Date(token.expiresAt).getTime() > Date.now()) {
        return { deck, isProjection: true };
      }
    }

    if (actor && actor.role === ROLES.ESTUDIANTE) {
      assertCourse(actor, deck.courseId);
      return { deck: stripAnswers(deck), isProjection: false };
    }

    throw new Error("No autorizado para ver esta presentación.");
  }
}

export interface SavePresentationInput {
  classId: string;
  courseId: string;
  slides: { kind: SlideKind; title?: string; blocks: unknown[] }[];
  config?: SlideDeck["config"];
}

/** El profesor guarda el deck (sanitizado y con estructura validada). */
export class SavePresentationUseCase {
  constructor(
    private deps: {
      presentations: PresentationRepository;
      audit: AuditRepository;
    },
  ) {}

  async run(input: SavePresentationInput, actor: AuthContext | null): Promise<SlideDeck> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    assertCourse(actor, input.courseId);

    const slides = input.slides.map((s, i) => ({
      id: s.title ? `slide-${i}-${s.title.slice(0, 8)}` : `slide-${i}`,
      kind: s.kind,
      title: s.title,
      blocks: sanitizeSlideBlocks(s.blocks as SlideDeck["slides"][number]["blocks"]),
    }));
    validateDeckStructure(slides);

    const existing = await this.deps.presentations.get(input.classId);
    const now = new Date().toISOString();
    const deck: SlideDeck = {
      classId: input.classId,
      courseId: input.courseId,
      version: (existing?.version ?? 0) + 1,
      slides,
      config: { timerDefault: input.config?.timerDefault ?? null, theme: input.config?.theme ?? "default", showAnswers: input.config?.showAnswers ?? true },
      updatedAt: now,
      updatedBy: actor?.uid ?? "server",
    };

    await this.deps.presentations.upsert(deck);
    await this.deps.audit.log({
      userId: actor?.uid ?? "server",
      action: "PRESENTATION_SAVE",
      entity: "presentations",
      entityId: input.classId,
      courseId: input.courseId,
      timestamp: now,
      metadata: { version: deck.version, slides: deck.slides.length },
    });
    return deck;
  }
}

/** Genera un token de proyección de corta duración. */
export class CreateProjectionTokenUseCase {
  constructor(private deps: { tokens: ProjectionTokenRepository }) {}

  async run(
    input: { classId: string; courseId: string },
    actor: AuthContext | null,
  ): Promise<ProjectionToken> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    assertCourse(actor, input.courseId);
    const now = new Date();
    const token: ProjectionToken = {
      tokenId: generateId(),
      classId: input.classId,
      courseId: input.courseId,
      expiresAt: new Date(now.getTime() + TOKEN_TTL_MS).toISOString(),
      createdBy: actor?.uid ?? "server",
      createdAt: now.toISOString(),
    };
    return this.deps.tokens.create(token);
  }
}

/** Voto colectivo (estudiante, sin identidad en el resultado). */
export class SubmitVoteUseCase {
  constructor(
    private deps: {
      presentations: PresentationRepository;
      votes: VoteRepository;
    },
  ) {}

  async run(
    input: { classId: string; questionId: string; option: number },
    actor: AuthContext | null,
  ): Promise<VoteResult> {
    assertRole(actor, [ROLES.ESTUDIANTE, ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    const deck = await this.deps.presentations.get(input.classId);
    const question = deck?.slides
      .flatMap((s) => s.blocks)
      .find((b) => b.type === "question" && b.id === input.questionId);
    const options = question?.options ?? [];
    if (!question || input.option < 0 || input.option >= options.length) {
      throw new Error("Pregunta u opción inválida.");
    }
    return this.deps.votes.increment(input.classId, input.questionId, String(input.option));
  }
}

/** Registro manual de votación (modo sin dispositivos). */
export class RecordManualVotesUseCase {
  constructor(
    private deps: {
      presentations: PresentationRepository;
      votes: VoteRepository;
    },
  ) {}

  async run(
    input: { classId: string; questionId: string; counts: Record<string, number> },
    actor: AuthContext | null,
  ): Promise<VoteResult> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    const deck = await this.deps.presentations.get(input.classId);
    const question = deck?.slides
      .flatMap((s) => s.blocks)
      .find((b) => b.type === "question" && b.id === input.questionId);
    const options = question?.options ?? [];
    const clean: Record<string, number> = {};
    for (const [key, value] of Object.entries(input.counts)) {
      const idx = Number(key);
      if (Number.isInteger(idx) && idx >= 0 && idx < options.length && Number.isInteger(value) && value >= 0) {
        clean[key] = value;
      }
    }
    return this.deps.votes.setManual(input.classId, input.questionId, clean);
  }
}

/** Resultados agregados (nunca qué estudiante respondió). */
export class GetVotesUseCase {
  constructor(private deps: { votes: VoteRepository }) {}

  async run(input: { classId: string; questionId: string }, actor: AuthContext | null): Promise<VoteResult | null> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER, ROLES.MODO_PROYECCION]);
    return this.deps.votes.get(input.classId, input.questionId);
  }
}
