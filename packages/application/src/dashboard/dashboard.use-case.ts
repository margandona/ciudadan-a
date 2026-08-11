import {
  CALENDAR_STATUS,
  type CalendarAlert,
  type ClassDashboard,
  type CourseDashboard,
} from "@pclab/shared";
import { averageDifficulty, calendarStatus, percent } from "@pclab/domain";
import { assertCourse, assertRole } from "../auth";
import type {
  AuthContext,
  ClassRepository,
  ExitTicketRepository,
  FlippedProgressRepository,
  MaterialRepository,
  ParticipationRepository,
  StudentRepository,
  SubmissionRepository,
} from "../ports";

const PRINT_LEAD_DAYS = 3;
const REVIEW_LEAD_DAYS = 7;

/** Dashboard de curso: agregados sobre flipped, evidencias, tickets y participación. */
export class GetCourseDashboardUseCase {
  constructor(
    private deps: {
      students: StudentRepository;
      classes: ClassRepository;
      flipped: FlippedProgressRepository;
      submissions: SubmissionRepository;
      exitTickets: ExitTicketRepository;
      participation: ParticipationRepository;
    },
  ) {}

  async run(courseId: string, actor: AuthContext | null): Promise<CourseDashboard> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    assertCourse(actor, courseId);

    const students = (await this.deps.students.findByCourse(courseId)).filter((s) => s.active);
    const classes = await this.deps.classes.listAll();

    const classResults = await Promise.all(
      classes.map(async (cls) => {
        const [flipped, submissions, tickets, participation] = await Promise.all([
          this.deps.flipped.listByClass(courseId, cls.id),
          this.deps.submissions.listByClass(courseId, cls.id),
          this.deps.exitTickets.listByClass(courseId, cls.id),
          this.deps.participation.listByClass(courseId, cls.id),
        ]);
        return {
          flippedReady: flipped.filter((f) => f.ready).length,
          flippedTotal: flipped.length,
          submissions: submissions.length,
          pending: submissions.filter((s) => s.status === "ENTREGADO").length,
          tickets,
          participation: participation.reduce((acc, r) => acc + r.total, 0),
        };
      }),
    );

    const flippedCompleted = classResults.reduce((acc, c) => acc + c.flippedReady, 0);
    const flippedTotal = classResults.reduce((acc, c) => acc + c.flippedTotal, 0);
    const difficulties = classResults.flatMap((c) => c.tickets.map((t) => t.difficulty));

    return {
      courseId,
      totalStudents: students.length,
      activeStudents: students.length,
      flippedTotal,
      flippedCompleted,
      flippedPercent: percent(flippedCompleted, flippedTotal),
      submissions: classResults.reduce((acc, c) => acc + c.submissions, 0),
      pendingEvidences: classResults.reduce((acc, c) => acc + c.pending, 0),
      exitTickets: classResults.reduce((acc, c) => acc + c.tickets.length, 0),
      participation: classResults.reduce((acc, c) => acc + c.participation, 0),
      avgDifficulty: averageDifficulty(difficulties),
    };
  }
}

/** Dashboard de una clase concreta. */
export class GetClassDashboardUseCase {
  constructor(
    private deps: {
      flipped: FlippedProgressRepository;
      submissions: SubmissionRepository;
      exitTickets: ExitTicketRepository;
      participation: ParticipationRepository;
    },
  ) {}

  async run(courseId: string, classId: string, actor: AuthContext | null): Promise<ClassDashboard> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    assertCourse(actor, courseId);

    const [flipped, submissions, tickets, participation] = await Promise.all([
      this.deps.flipped.listByClass(courseId, classId),
      this.deps.submissions.listByClass(courseId, classId),
      this.deps.exitTickets.listByClass(courseId, classId),
      this.deps.participation.listByClass(courseId, classId),
    ]);

    return {
      classId,
      flippedTotal: flipped.length,
      flippedCompleted: flipped.filter((f) => f.ready).length,
      flippedPercent: percent(flipped.filter((f) => f.ready).length, flipped.length),
      submissions: submissions.length,
      exitTickets: tickets.length,
      participation: participation.reduce((acc, r) => acc + r.total, 0),
      avgDifficulty: averageDifficulty(tickets.map((t) => t.difficulty)),
    };
  }
}

/** Calendario administrativo: guías (impresión −3d) y evaluaciones (revisión −7d). */
export class GetCalendarAlertsUseCase {
  constructor(private deps: { materials: MaterialRepository }) {}

  async run(courseId: string, actor: AuthContext | null, nowIso?: string): Promise<CalendarAlert[]> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    assertCourse(actor, courseId);
    const now = nowIso ?? new Date().toISOString();

    const materials = await this.deps.materials.listByCourse(courseId);
    const alerts: CalendarAlert[] = [];

    for (const material of materials) {
      if (material.type === "guia" && material.printDeadline) {
        const { daysLeft: dl, status } = calendarStatus(material.printDeadline, now, PRINT_LEAD_DAYS);
        alerts.push({
          materialId: material.id,
          title: material.title,
          kind: "print",
          deadline: material.printDeadline,
          daysLeft: dl,
          status,
          message: status === CALENDAR_STATUS.RED
            ? `La guía "${material.title}" debe solicitarse a impresión: plazo vencido (${material.printDeadline.slice(0, 10)}).`
            : `La guía "${material.title}" debe solicitarse a impresión antes del ${material.printDeadline.slice(0, 10)}.`,
        });
      }
      if ((material.type === "evaluacion" || material.type === "guia") && material.reviewDeadline) {
        const { daysLeft: dl, status } = calendarStatus(material.reviewDeadline, now, REVIEW_LEAD_DAYS);
        alerts.push({
          materialId: material.id,
          title: material.title,
          kind: "review",
          deadline: material.reviewDeadline,
          daysLeft: dl,
          status,
          message: status === CALENDAR_STATUS.RED
            ? `"${material.title}" debe enviarse al evaluador: plazo vencido (${material.reviewDeadline.slice(0, 10)}).`
            : `"${material.title}" debe enviarse al evaluador antes del ${material.reviewDeadline.slice(0, 10)}.`,
        });
      }
    }

    return alerts.sort((a, b) => a.deadline.localeCompare(b.deadline));
  }
}
