import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { Student } from "@pclab/shared";

/** Convierte ISO a Timestamp de Firestore (null se conserva). */
export function isoToTimestamp(iso: string | null | undefined): Timestamp | null {
  if (!iso) return null;
  return Timestamp.fromDate(new Date(iso));
}

/** Convierte Timestamp/null a ISO (acepta Timestamp, string o duck-typed toDate). */
export function timestampToIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const obj = value as { toDate?: () => Date };
    if (typeof obj.toDate === "function") {
      const d = obj.toDate();
      if (d instanceof Date && !Number.isNaN(d.getTime())) return d.toISOString();
    }
  }
  return null;
}

/** Serializa una entidad Student para Firestore. */
export function studentToRecord(student: Student): Record<string, unknown> {
  return {
    userId: student.userId ?? null,
    firstName: student.firstName ?? null,
    middleName: student.middleName ?? null,
    paternalSurname: student.paternalSurname ?? null,
    maternalSurname: student.maternalSurname ?? null,
    displayName: student.displayName,
    preferredName: student.preferredName ?? null,
    normalizedSearchName: student.normalizedSearchName,
    courseId: student.courseId,
    listNumber: student.listNumber ?? null,
    active: student.active,
    archivedAt: isoToTimestamp(student.archivedAt ?? null),
    createdAt: isoToTimestamp(student.createdAt),
    updatedAt: FieldValue.serverTimestamp(),
    academicProfile: student.academicProfile,
    stats: student.stats ?? null,
  };
}

/** Deserializa un documento Firestore a entidad Student. */
export function recordToStudent(id: string, data: Record<string, unknown>): Student {
  const academicProfile = (data.academicProfile ?? {
    participationTrackingEnabled: true,
    gamificationEnabled: true,
  }) as Student["academicProfile"];

  return {
    id,
    userId: (data.userId as string | null) ?? undefined,
    firstName: (data.firstName as string | null) ?? undefined,
    middleName: (data.middleName as string | null) ?? undefined,
    paternalSurname: (data.paternalSurname as string | null) ?? undefined,
    maternalSurname: (data.maternalSurname as string | null) ?? undefined,
    displayName: (data.displayName as string) ?? "",
    preferredName: (data.preferredName as string | null) ?? undefined,
    normalizedSearchName: (data.normalizedSearchName as string) ?? "",
    courseId: (data.courseId as string) ?? "",
    listNumber: (data.listNumber as number | null) ?? undefined,
    active: (data.active as boolean) ?? true,
    archivedAt: timestampToIso(data.archivedAt as Timestamp | null),
    createdAt: timestampToIso(data.createdAt as Timestamp) ?? new Date().toISOString(),
    updatedAt: timestampToIso(data.updatedAt as Timestamp) ?? new Date().toISOString(),
    academicProfile,
    stats: (data.stats as Student["stats"] | null) ?? undefined,
  };
}
