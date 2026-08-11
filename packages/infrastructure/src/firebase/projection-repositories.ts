import { FieldValue, Firestore } from "firebase-admin/firestore";
import type { ProjectionToken, SlideDeck, VoteResult } from "@pclab/shared";
import type {
  PresentationRepository,
  ProjectionTokenRepository,
  VoteRepository,
} from "@pclab/application";
import { isoToTimestamp, timestampToIso } from "./converters";

export class FirestorePresentationRepository implements PresentationRepository {
  constructor(private readonly db: Firestore) {}

  async get(classId: string): Promise<SlideDeck | null> {
    const doc = await this.db.collection("presentations").doc(classId).get();
    if (!doc.exists) return null;
    return recordToDeck(classId, doc.data() ?? {});
  }

  async upsert(deck: SlideDeck): Promise<SlideDeck> {
    await this.db.collection("presentations").doc(deck.classId).set(deckToRecord(deck), { merge: true });
    return deck;
  }
}

export class FirestoreProjectionTokenRepository implements ProjectionTokenRepository {
  constructor(private readonly db: Firestore) {}

  async create(token: ProjectionToken): Promise<ProjectionToken> {
    await this.db
      .collection("projectionTokens")
      .doc(token.classId)
      .collection("tokens")
      .doc(token.tokenId)
      .set(tokenToRecord(token), { merge: true });
    return token;
  }

  async findByTokenId(tokenId: string): Promise<ProjectionToken | null> {
    const snap = await this.db.collectionGroup("tokens").where("tokenId", "==", tokenId).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0]!;
    return recordToToken(doc.data() ?? {});
  }
}

export class FirestoreVoteRepository implements VoteRepository {
  constructor(private readonly db: Firestore) {}

  private ref(classId: string, questionId: string) {
    return this.db.collection("projections").doc(classId).collection("votes").doc(questionId);
  }

  async get(classId: string, questionId: string): Promise<VoteResult | null> {
    const doc = await this.ref(classId, questionId).get();
    if (!doc.exists) return null;
    return recordToVote(classId, questionId, doc.data() ?? {});
  }

  async increment(classId: string, questionId: string, option: string): Promise<VoteResult> {
    const ref = this.ref(classId, questionId);
    await ref.set(
      {
        classId,
        questionId,
        counts: { [option]: FieldValue.increment(1) },
        total: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    const snap = await ref.get();
    return recordToVote(classId, questionId, snap.data() ?? {});
  }

  async setManual(classId: string, questionId: string, counts: Record<string, number>): Promise<VoteResult> {
    const ref = this.ref(classId, questionId);
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    await ref.set(
      { classId, questionId, counts, total, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    const snap = await ref.get();
    return recordToVote(classId, questionId, snap.data() ?? {});
  }
}

// ---------------------------------------------------------------- convertidores

function recordToDeck(classId: string, data: Record<string, unknown>): SlideDeck {
  return {
    classId,
    courseId: (data.courseId as string) ?? "",
    version: (data.version as number) ?? 0,
    slides: (data.slides ?? []) as SlideDeck["slides"],
    config: (data.config ?? {}) as SlideDeck["config"],
    updatedAt: timestampToIso(data.updatedAt) ?? new Date().toISOString(),
    updatedBy: (data.updatedBy as string) ?? "",
  };
}

function deckToRecord(deck: SlideDeck): Record<string, unknown> {
  return {
    classId: deck.classId,
    courseId: deck.courseId,
    version: deck.version,
    slides: deck.slides,
    config: deck.config,
    updatedAt: isoToTimestamp(deck.updatedAt),
    updatedBy: deck.updatedBy,
  };
}

function tokenToRecord(t: ProjectionToken): Record<string, unknown> {
  return {
    tokenId: t.tokenId,
    classId: t.classId,
    courseId: t.courseId,
    expiresAt: isoToTimestamp(t.expiresAt),
    createdBy: t.createdBy,
    createdAt: isoToTimestamp(t.createdAt),
  };
}

function recordToToken(data: Record<string, unknown>): ProjectionToken {
  return {
    tokenId: (data.tokenId as string) ?? "",
    classId: (data.classId as string) ?? "",
    courseId: (data.courseId as string) ?? "",
    expiresAt: timestampToIso(data.expiresAt) ?? new Date().toISOString(),
    createdBy: (data.createdBy as string) ?? "",
    createdAt: timestampToIso(data.createdAt) ?? new Date().toISOString(),
  };
}

function recordToVote(classId: string, questionId: string, data: Record<string, unknown>): VoteResult {
  return {
    classId,
    questionId,
    counts: (data.counts ?? {}) as Record<string, number>,
    total: (data.total as number) ?? 0,
    updatedAt: timestampToIso(data.updatedAt) ?? new Date().toISOString(),
  };
}
