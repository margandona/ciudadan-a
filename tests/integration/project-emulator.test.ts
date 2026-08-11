process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8088";
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9098";
process.env.GCLOUD_PROJECT = "pclab-integration";

import { beforeAll, describe, expect, it } from "vitest";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  FirestoreProjectAssessmentRepository,
  FirestoreProjectRepository,
  FirestoreProjectTeamRepository,
  FirestoreRubricRepository,
} from "@pclab/infrastructure";
import { AssessProjectUseCase, CreateTeamUseCase, GetProjectDetailUseCase, SaveProjectUseCase } from "@pclab/application";
import { PROJECT_STATUS, ROLES } from "@pclab/shared";
import type { ProjectFields, Rubric } from "@pclab/shared";

const COURSE = "course-project-2026";

const TEACHER = { uid: "teachP", role: ROLES.PROFESOR, courses: [COURSE] };
const STUDENT_1 = { uid: "s1", role: ROLES.ESTUDIANTE, courses: [COURSE] };

const FIELDS: ProjectFields = {
  problem: "Basura en el canal", evidence: "Fotos", territory: "Sector norte", affectedPopulation: "Vecinas",
  citizenParticipation: "Jornadas", publicAgency: "Municipio", privateActor: "Recicladora", resources: "Contenedores",
  socialImpact: "Calidad de vida", environmentalImpact: "Menos basura", proposal: "Puntos de reciclaje",
};

const RUBRIC: Rubric = {
  id: "rubric-proyecto",
  title: "Proyecto",
  criteria: [
    { id: "problema", name: "Problema", maxPoints: 4, descriptor: "" },
    { id: "propuesta", name: "Propuesta", maxPoints: 4, descriptor: "" },
  ],
};

let db: ReturnType<typeof getFirestore>;

beforeAll(async () => {
  if (getApps().length === 0) initializeApp({ projectId: "pclab-integration" });
  db = getFirestore();

  const teams = await db.collection("projectTeams").where("courseId", "==", COURSE).get();
  for (const d of teams.docs) await d.ref.delete();
  const projects = await db.collection("projects").where("courseId", "==", COURSE).get();
  for (const d of projects.docs) {
    await d.ref.collection("assessments").get().then((s) => Promise.all(s.docs.map((x) => x.ref.delete())));
    await d.ref.delete();
  }
  await db.collection("rubrics").doc(RUBRIC.id).set(RUBRIC, { merge: true });
  await db.collection("students").doc("s1").set({ id: "s1", displayName: "Pro Uno", normalizedSearchName: "pro uno", courseId: COURSE, active: true, createdAt: new Date(), updatedAt: new Date(), academicProfile: { participationTrackingEnabled: true, gamificationEnabled: true } }, { merge: true });
  await db.collection("students").doc("s2").set({ id: "s2", displayName: "Pro Dos", normalizedSearchName: "pro dos", courseId: COURSE, active: true, createdAt: new Date(), updatedAt: new Date(), academicProfile: { participationTrackingEnabled: true, gamificationEnabled: true } }, { merge: true });
});

describe("FASE 10 — proyecto y equipos (integración)", () => {
  it("crea equipo, el equipo entrega el proyecto y el docente evalúa con rúbrica", async () => {
    const teams = new FirestoreProjectTeamRepository(db);
    const projects = new FirestoreProjectRepository(db);
    const assessments = new FirestoreProjectAssessmentRepository(db);
    const rubrics = new FirestoreRubricRepository(db);
    const students = {
      findByCourse: async () => [{ id: "s1", courseId: COURSE, active: true }],
      getById: async () => null,
      upsertMany: async () => ({ createdIds: [], updatedIds: [] }),
      softDelete: async () => undefined,
    } as never;

    const team = await new CreateTeamUseCase({ teams, students }).run({ courseId: COURSE, name: "Equipo Ovalle", memberIds: ["s1"] }, TEACHER);
    expect(team.members).toEqual(["s1"]);

    const saved = await new SaveProjectUseCase({ teams, projects }).run(
      { teamId: team.id, courseId: COURSE, classId: "class-11", fields: FIELDS, submit: true },
      STUDENT_1,
    );
    expect(saved.status).toBe(PROJECT_STATUS.ENTREGADO);

    const assessment = await new AssessProjectUseCase({ projects, assessments, rubrics, audit: { log: async () => undefined } }).run(
      { projectId: saved.id, courseId: COURSE, rubricId: RUBRIC.id, scores: { problema: 4, propuesta: 3 }, feedback: "Buen proyecto" },
      TEACHER,
    );
    expect(Object.values(assessment.scores).reduce((a, b) => a + b, 0)).toBe(7);

    const detail = await new GetProjectDetailUseCase({ teams, projects, assessments }).run(saved.id, COURSE, TEACHER);
    expect(detail.team.members).toContain("s1");
    expect(detail.assessments.teacher?.feedback).toBe("Buen proyecto");
    expect(detail.project.fields.proposal).toBe("Puntos de reciclaje");
  });
});
