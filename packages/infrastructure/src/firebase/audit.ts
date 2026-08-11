import { FieldValue, Firestore } from "firebase-admin/firestore";
import type { AuditLog } from "@pclab/shared";
import type { AuditRepository } from "@pclab/application";

/** Auditoría en Firestore. Los logs nunca contienen valores sensibles completos. */
export class FirestoreAuditRepository implements AuditRepository {
  constructor(private readonly db: Firestore) {}

  async log(entry: AuditLog): Promise<void> {
    await this.db.collection("auditLogs").add({
      userId: entry.userId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      courseId: entry.courseId ?? null,
      timestamp: FieldValue.serverTimestamp(),
      metadata: entry.metadata ?? {},
    });
  }
}
