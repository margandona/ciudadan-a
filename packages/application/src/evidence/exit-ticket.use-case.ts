import type { Activity, ExitTicket } from "@pclab/shared";
import { validateExitTicket } from "@pclab/domain";
import { assertCourse, assertRole } from "../auth";
import type { ActivityRepository, AuthContext, ExitTicketRepository } from "../ports";

/** Actividades visibles de una clase (estudiante). */
export class ListActivitiesForClassUseCase {
  constructor(private deps: { activities: ActivityRepository }) {}

  async run(classId: string, actor: AuthContext | null): Promise<Activity[]> {
    assertRole(actor, ["ESTUDIANTE", "PROFESOR", "ADMIN", "MASTER"]);
    return this.deps.activities.listByClass(classId);
  }
}

/** La estudiante entrega su ticket de salida de la clase. */
export class SubmitExitTicketUseCase {
  constructor(
    private deps: {
      tickets: ExitTicketRepository;
      activities: ActivityRepository;
    },
  ) {}

  async run(
    input: {
      classId: string;
      courseId: string;
      studentId: string;
      answers: ExitTicket["answers"];
      difficulty: number;
      now?: string;
    },
    actor: AuthContext | null,
  ): Promise<ExitTicket> {
    assertRole(actor, ["ESTUDIANTE", "MASTER", "ADMIN"]);
    if (actor && !actor.isServer && actor.role === "ESTUDIANTE" && actor.uid !== input.studentId) {
      throw new Error("Solo puedes enviar tu propio ticket.");
    }
    assertCourse(actor, input.courseId);

    const ticket: ExitTicket = {
      classId: input.classId,
      courseId: input.courseId,
      studentId: input.studentId,
      answers: input.answers,
      difficulty: input.difficulty,
      submittedAt: input.now ?? new Date().toISOString(),
    };
    validateExitTicket(ticket);
    return this.deps.tickets.upsert(ticket);
  }
}

/** Lista de tickets de una clase (tendencias para el profesor, filtrada por curso). */
export class ListExitTicketsUseCase {
  constructor(
    private deps: {
      tickets: ExitTicketRepository;
      activities: ActivityRepository;
    },
  ) {}

  async run(courseId: string, classId: string, actor: AuthContext | null): Promise<ExitTicket[]> {
    assertRole(actor, ["PROFESOR", "ADMIN", "MASTER"]);
    assertCourse(actor, courseId);
    return this.deps.tickets.listByClass(courseId, classId);
  }
}
