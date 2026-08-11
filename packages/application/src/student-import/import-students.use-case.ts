import {
  AUDIT_ACTIONS,
  DUPLICATE_KIND,
  ROLES,
  type CandidateStudent,
  type Course,
  type DuplicateKind,
  type ImportResult,
  type Student,
} from "@pclab/shared";
import {
  classifyDuplicate,
  createStudent,
  markSeenInFile,
  suggestNameParts,
  type ExistingStudentRef,
} from "@pclab/domain";
import { generateId } from "../id";
import { assertCourse, assertRole } from "../auth";
import { deriveCourseId, parseCourseName } from "../courses";
import type { AuditRepository, AuthContext, CourseRepository, StudentRepository } from "../ports";

export interface ImportStudentsInput {
  /** Filas confirmadas en el preview (pueden tener ediciones del profesor). */
  rows: CandidateStudent[];
  fileName?: string;
  year?: number;
}

const DEFAULT_YEAR = 2026;

export class ImportStudentsUseCase {
  constructor(
    private deps: {
      students: StudentRepository;
      courses: CourseRepository;
      audit: AuditRepository;
    },
  ) {}

  async run(input: ImportStudentsInput, actor: AuthContext | null): Promise<ImportResult> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    if (!input.rows.length) {
      return { imported: 0, updated: 0, deactivated: 0, skippedDuplicates: 0, courseIds: [] };
    }

    const year = input.year ?? DEFAULT_YEAR;
    const now = new Date().toISOString();

    const courseIds = [...new Set(input.rows.map((r) => r.courseId).filter(Boolean))];
    for (const courseId of courseIds) assertCourse(actor, courseId);

    // Población existente por curso (una consulta por curso) e índice por id.
    const existingByCourse = new Map<string, ExistingStudentRef[]>();
    const studentById = new Map<string, Student>();
    for (const courseId of courseIds) {
      const list = await this.deps.students.findByCourse(courseId);
      existingByCourse.set(
        courseId,
        list.map((s) => ({ id: s.id, normalizedSearchName: s.normalizedSearchName, courseId: s.courseId, active: s.active })),
      );
      for (const s of list) studentById.set(s.id, s);
    }

    const toWrite: Student[] = [];
    // Duplicados dentro del mismo lote → actualizar la ya creada.
    const seenKinds = new Map<string, DuplicateKind>();
    const createdThisRun = new Map<string, string>(); // matchKey -> studentId

    let imported = 0;
    let updated = 0;
    let deactivated = 0;
    let skippedDuplicates = 0;

    for (const row of input.rows) {
      if (!row.courseId) continue;

      const displayName = row.editable.displayName.replace(/\s+/g, " ").trim();
      if (!displayName) continue; // bloqueada en preview

      const normalized = displayName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

      const matchKey = `${row.courseId}|${normalized}`;
      const parts = suggestNameParts(displayName);
      const active = row.editable.active;

      const upsert = (id: string, prev?: Student): void => {
        const student = createStudent({
          id,
          displayName,
          firstName: parts.firstName,
          middleName: parts.middleName,
          paternalSurname: parts.paternalSurname,
          maternalSurname: parts.maternalSurname,
          listNumber: row.listNumber,
          courseId: row.courseId,
          active,
          archivedAt: active ? null : now,
          now,
        });
        toWrite.push(student);
        studentById.set(id, student);

        const wasActive = prev?.active ?? true;
        if (!active && wasActive) deactivated++;
        else if (active && !wasActive) updated++; // reactivada
        else if (prev) updated++;
        else imported++;
      };

      // 1) ¿Ya creada/actualizada en este mismo lote?
      const existingRunId = createdThisRun.get(matchKey);
      if (existingRunId) {
        upsert(existingRunId, studentById.get(existingRunId));
        continue;
      }

      // 2) Clasificación autoritativa contra la base actual.
      const existing = existingByCourse.get(row.courseId) ?? [];
      const classification = classifyDuplicate(
        { normalizedSearchName: normalized, firstName: parts.firstName, paternalSurname: parts.paternalSurname, courseId: row.courseId },
        existing,
        seenKinds,
      );

      if (classification.kind === DUPLICATE_KIND.POSSIBLE_DUPLICATE) {
        skippedDuplicates++;
        continue;
      }

      if (classification.kind === DUPLICATE_KIND.DUPLICATE_CONFIRMED) {
        const ref = existing.find((e) => e.normalizedSearchName === normalized && e.courseId === row.courseId);
        const prev = ref ? studentById.get(ref.id) : undefined;
        if (prev) {
          upsert(prev.id, prev);
          createdThisRun.set(matchKey, prev.id);
          continue;
        }
      }

      // 3) Nueva estudiante: UUID propio (nunca RUT/correo/nombre).
      const id = generateId();
      upsert(id);
      markSeenInFile(seenKinds, normalized, row.courseId);
      createdThisRun.set(matchKey, id);
    }

    // Asegurar que los cursos existan (id determinístico, no se duplica el documento).
    const courseNameByCourseId = new Map<string, string>();
    for (const row of input.rows) {
      if (row.courseId && row.courseName) courseNameByCourseId.set(row.courseId, row.courseName);
    }
    for (const courseId of courseIds) {
      const course = await this.deps.courses.findById(courseId);
      if (!course) {
        const parsed = parseCourseName(courseNameByCourseId.get(courseId) ?? null);
        const section = parsed?.section ?? "";
        const nowTs = now;
        const record: Course = {
          id: courseId,
          name: courseNameByCourseId.get(courseId) ?? `3º Medio ${section}`,
          level: "Tercero Medio",
          section,
          subject: "Educación Ciudadana",
          year,
          active: true,
          createdAt: nowTs,
          updatedAt: nowTs,
          settings: { participationScale: [0, 1, 2, 3], feedbackAnonymous: false },
        };
        await this.deps.courses.upsert(record);
      }
    }

    await this.deps.students.upsertMany(toWrite);

    await this.deps.audit.log({
      userId: actor?.uid ?? "server",
      action: AUDIT_ACTIONS.STUDENT_IMPORT,
      entity: "students",
      timestamp: now,
      courseId: courseIds[0],
      metadata: {
        fileName: input.fileName ?? null,
        rows: input.rows.length,
        imported,
        updated,
        deactivated,
        skippedDuplicates,
        courseIds,
      },
    });

    return { imported, updated, deactivated, skippedDuplicates, courseIds };
  }
}

/** Id determinístico ya usado en preview/import. */
export { deriveCourseId };
