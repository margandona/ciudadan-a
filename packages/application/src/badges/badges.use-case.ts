import { ROLES, type Badge, type Student, type StudentBadge, type StudentBadgeView, type StudentBadgesOverview } from "@pclab/shared";
import { badgeProgress, pickMessage, qualifyingBadges } from "@pclab/domain";
import { assertCourse, assertRole } from "../auth";
import type {
  ActivityStatsRepository,
  AuditRepository,
  AuthContext,
  BadgeRepository,
  MessagesRepository,
  StudentBadgeRepository,
  StudentRepository,
} from "../ports";

/** Vista de gamificación de la estudiante (catálogo + ganadas + estadísticas). */
export class GetBadgesForStudentUseCase {
  constructor(
    private deps: {
      badges: BadgeRepository;
      studentBadges: StudentBadgeRepository;
      stats: ActivityStatsRepository;
    },
  ) {}

  async run(
    input: { courseId: string; studentId: string },
    actor: AuthContext | null,
  ): Promise<StudentBadgesOverview> {
    if (actor?.role === ROLES.ESTUDIANTE) {
      if (actor.uid !== input.studentId) throw new Error("Solo puedes ver tus propias medallas.");
    } else {
      assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
      assertCourse(actor, input.courseId);
    }

    const [catalog, earned, stats] = await Promise.all([
      this.deps.badges.listAll(),
      this.deps.studentBadges.listForStudent(input.studentId),
      this.deps.stats.getForStudent(input.courseId, input.studentId),
    ]);

    const earnedMap = new Map(earned.map((e) => [e.badgeId, e]));
    const badges: StudentBadgeView[] = catalog
      .sort((a, b) => a.order - b.order)
      .map((badge) => {
        const e = earnedMap.get(badge.id);
        return e
          ? { badge, earned: true, via: e.via, earnedAt: e.earnedAt }
          : { badge, earned: false };
      });

    return {
      badges,
      earnedCount: earned.length,
      totalCount: catalog.length,
      stats,
    };
  }
}

/** Evalúa criterios y otorga medallas automáticamente (idempotente, sin tocar notas). */
export class EvaluateAndAwardBadgesUseCase {
  constructor(
    private deps: {
      badges: BadgeRepository;
      studentBadges: StudentBadgeRepository;
      stats: ActivityStatsRepository;
    },
  ) {}

  async run(
    input: { courseId: string; studentId: string },
    actor: AuthContext | null,
  ): Promise<{ awarded: string[]; overview: StudentBadgesOverview }> {
    if (actor?.role === ROLES.ESTUDIANTE) {
      if (actor.uid !== input.studentId) throw new Error("Solo puedes evaluar tus propias medallas.");
    } else {
      assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
      assertCourse(actor, input.courseId);
    }

    const catalog = await this.deps.badges.listAll();
    const earned = await this.deps.studentBadges.listForStudent(input.studentId);
    const stats = await this.deps.stats.getForStudent(input.courseId, input.studentId);

    const earnedMap = new Map(earned.map((e) => [e.badgeId, e]));
    const awarded: string[] = [];
    const now = new Date().toISOString();
    for (const badge of qualifyingBadges(stats, catalog)) {
      if (earnedMap.has(badge.id)) continue;
      await this.deps.studentBadges.award(input.studentId, badge.id, "auto", now);
      awarded.push(badge.code);
      earnedMap.set(badge.id, { badgeId: badge.id, studentId: input.studentId, earnedAt: now, via: "auto" });
    }

    const badges: StudentBadgeView[] = catalog
      .sort((a, b) => a.order - b.order)
      .map((badge) => {
        const e = earnedMap.get(badge.id);
        return e ? { badge, earned: true, via: e.via, earnedAt: e.earnedAt } : { badge, earned: false };
      });

    return { awarded, overview: { badges, earnedCount: earnedMap.size, totalCount: catalog.length, stats } };
  }
}

export interface AwardBadgeInput {
  courseId: string;
  studentId: string;
  badgeId: string;
}

/** El docente otorga una medalla manualmente (reconocimiento, sin nota). */
export class AwardBadgeUseCase {
  constructor(
    private deps: {
      badges: BadgeRepository;
      studentBadges: StudentBadgeRepository;
      students: StudentRepository;
      audit: AuditRepository;
    },
  ) {}

  async run(input: AwardBadgeInput, actor: AuthContext | null): Promise<StudentBadge> {
    assertRole(actor, [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    assertCourse(actor, input.courseId);

    const badge = (await this.deps.badges.listAll()).find((b) => b.id === input.badgeId);
    if (!badge) throw new Error("Medalla no encontrada.");
    const student: Student | null = await this.deps.students.getById(input.studentId);
    if (!student || student.courseId !== input.courseId) throw new Error("Estudiante no válida para este curso.");

    if (await this.deps.studentBadges.has(input.studentId, badge.id)) {
      throw new Error("La estudiante ya tiene esta medalla.");
    }
    const now = new Date().toISOString();
    await this.deps.studentBadges.award(input.studentId, badge.id, "teacher", now);
    await this.deps.audit.log({
      userId: actor?.uid ?? "server",
      action: "BADGE_AWARDED",
      entity: "studentBadges",
      entityId: badge.id,
      courseId: input.courseId,
      timestamp: now,
      metadata: { studentId: input.studentId, via: "teacher" },
    });
    return { badgeId: badge.id, studentId: input.studentId, earnedAt: now, via: "teacher" };
  }
}

/** Mensaje positivo según contexto (biblioteca configurable). */
export class GetPositiveMessageUseCase {
  constructor(private deps: { messages: MessagesRepository }) {}

  async run(context: string, actor: AuthContext | null): Promise<{ message: string | null; context: string }> {
    assertRole(actor, [ROLES.ESTUDIANTE, ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER]);
    const messages = await this.deps.messages.list();
    return { message: pickMessage(messages, context), context };
  }
}

export type { Badge };
export { badgeProgress };
