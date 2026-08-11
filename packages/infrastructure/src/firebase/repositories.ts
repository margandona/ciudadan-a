import { Firestore } from "firebase-admin/firestore";
import type { Course, Student } from "@pclab/shared";
import type { CourseRepository, StudentRepository } from "@pclab/application";
import { isoToTimestamp, recordToStudent, studentToRecord, timestampToIso } from "./converters";

/** Repositorio de estudiantes (Firestore, admin SDK). Usado por Functions/scripts. */
export class FirestoreStudentRepository implements StudentRepository {
  constructor(private readonly db: Firestore) {}

  private get collection() {
    return this.db.collection("students");
  }

  async findByCourse(courseId: string): Promise<Student[]> {
    const snap = await this.collection.where("courseId", "==", courseId).get();
    return snap.docs.map((doc) => recordToStudent(doc.id, doc.data() ?? {}));
  }

  async getById(id: string): Promise<Student | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return recordToStudent(doc.id, doc.data() ?? {});
  }

  async upsertMany(students: Student[]): Promise<{ createdIds: string[]; updatedIds: string[] }> {
    if (students.length === 0) return { createdIds: [], updatedIds: [] };

    const refs = students.map((s) => this.collection.doc(s.id));
    const snapshots = await this.db.getAll(...refs);
    const batch = this.db.batch();
    const createdIds: string[] = [];
    const updatedIds: string[] = [];

    students.forEach((student, i) => {
      const exists = snapshots[i]?.exists ?? false;
      batch.set(refs[i]!, studentToRecord(student), { merge: false });
      if (exists) updatedIds.push(student.id);
      else createdIds.push(student.id);
    });

    await batch.commit();
    return { createdIds, updatedIds };
  }

  /** Soft delete: active=false + archivedAt. Nunca borra físicamente. */
  async softDelete(courseId: string, studentIds: string[]): Promise<void> {
    if (studentIds.length === 0) return;
    const batch = this.db.batch();
    for (const id of studentIds) {
      const doc = await this.collection.doc(id).get();
      if (!doc.exists) continue;
      if ((doc.data()?.courseId as string) !== courseId) continue;
      batch.update(this.collection.doc(id), {
        active: false,
        archivedAt: isoToTimestamp(new Date().toISOString()),
        updatedAt: isoToTimestamp(new Date().toISOString()),
      });
    }
    await batch.commit();
  }
}

/** Repositorio de cursos (Firestore, admin SDK). */
export class FirestoreCourseRepository implements CourseRepository {
  constructor(private readonly db: Firestore) {}

  private get collection() {
    return this.db.collection("courses");
  }

  async findById(id: string): Promise<Course | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return recordToCourse(doc.id, doc.data() ?? {});
  }

  async findBySectionYear(section: string, year: number): Promise<Course | null> {
    const snap = await this.collection
      .where("section", "==", section)
      .where("year", "==", year)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0]!;
    return recordToCourse(doc.id, doc.data() ?? {});
  }

  async upsert(course: Course): Promise<Course> {
    await this.collection.doc(course.id).set(courseToRecord(course), { merge: true });
    return course;
  }
}

function courseToRecord(course: Course): Record<string, unknown> {
  return {
    name: course.name,
    level: course.level,
    section: course.section,
    subject: course.subject,
    year: course.year,
    teacherId: course.teacherId ?? null,
    active: course.active,
    createdAt: isoToTimestamp(course.createdAt),
    updatedAt: isoToTimestamp(course.updatedAt),
    settings: course.settings ?? null,
  };
}

function recordToCourse(id: string, data: Record<string, unknown>): Course {
  return {
    id,
    name: (data.name as string) ?? "",
    level: (data.level as Course["level"]) ?? "Tercero Medio",
    section: (data.section as string) ?? "",
    subject: (data.subject as string) ?? "Educación Ciudadana",
    year: (data.year as number) ?? 0,
    teacherId: (data.teacherId as string | null) ?? undefined,
    active: (data.active as boolean) ?? true,
    createdAt: timestampToIso(data.createdAt) ?? new Date().toISOString(),
    updatedAt: timestampToIso(data.updatedAt) ?? new Date().toISOString(),
    settings: data.settings as Course["settings"],
  };
}
