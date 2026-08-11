import { ROLES, type Student } from "@pclab/shared";
import { assertCourse, assertRole } from "../auth";
import type { AuthContext, StudentRepository } from "../ports";

/** Lista estudiantes de un curso (dashboard). Ordenada por lista/apellido. */
export class ListStudentsUseCase {
  constructor(private deps: { students: StudentRepository }) {}

  async run(courseId: string, actor: AuthContext | null): Promise<Student[]> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    assertCourse(actor, courseId);
    const list = await this.deps.students.findByCourse(courseId);
    return list.sort((a, b) => {
      const la = a.listNumber ?? Number.MAX_SAFE_INTEGER;
      const lb = b.listNumber ?? Number.MAX_SAFE_INTEGER;
      if (la !== lb) return la - lb;
      return a.normalizedSearchName.localeCompare(b.normalizedSearchName);
    });
  }
}

/** Detalle de una estudiante (perfil). */
export class GetStudentOverviewUseCase {
  constructor(private deps: { students: StudentRepository }) {}

  async run(courseId: string, studentId: string, actor: AuthContext | null): Promise<Student> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    assertCourse(actor, courseId);
    const student = await this.deps.students.getById(studentId);
    if (!student) throw new Error("Estudiante no encontrada.");
    if (student.courseId !== courseId) {
      throw new Error("La estudiante no pertenece a este curso.");
    }
    return student;
  }
}

export interface DeactivateStudentInput {
  courseId: string;
  studentId: string;
  active: boolean;
}

/** Soft delete: nunca elimina físicamente; marca activa/inactiva con archivedAt. */
export class DeactivateStudentUseCase {
  constructor(
    private deps: {
      students: StudentRepository;
      audit: AuditRepositoryPort;
    },
  ) {}

  async run(input: DeactivateStudentInput, actor: AuthContext | null): Promise<Student> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    assertCourse(actor, input.courseId);
    const student = await this.deps.students.getById(input.studentId);
    if (!student) throw new Error("Estudiante no encontrada.");
    if (student.courseId !== input.courseId) throw new Error("Curso incorrecto.");

    const updated: Student = {
      ...student,
      active: input.active,
      archivedAt: input.active ? null : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.deps.students.upsertMany([updated]);
    await this.deps.audit.log({
      userId: actor?.uid ?? "server",
      action: input.active ? "STUDENT_UPDATE" : "STUDENT_DEACTIVATE",
      entity: "students",
      entityId: input.studentId,
      courseId: input.courseId,
      timestamp: new Date().toISOString(),
      metadata: { active: input.active },
    });
    return updated;
  }
}

interface AuditRepositoryPort {
  log(entry: {
    userId: string;
    action: string;
    entity: string;
    entityId?: string;
    courseId?: string;
    timestamp: string;
    metadata: Record<string, unknown>;
  }): Promise<void>;
}
