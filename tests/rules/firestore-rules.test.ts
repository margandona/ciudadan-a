import { describe, it, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

const PROJECT_ID = "pclab-rules-test";
const FIRESTORE_PORT = Number(process.env.FIRESTORE_EMULATOR_PORT ?? 8088);

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const rules = fs.readFileSync(path.resolve("firestore.rules"), "utf8");
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules, host: "127.0.0.1", port: FIRESTORE_PORT },
  });

  // Seed con reglas deshabilitadas (datos de prueba ficticios).
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc("courses/course-3med-d-2026").set({ name: "3º Medio D", section: "D", year: 2026, active: true });
    await db.doc("courses/course-3med-e-2026").set({ name: "3º Medio E", section: "E", year: 2026, active: true });
    await db.doc("students/student-d-1").set({ studentId: "studA", displayName: "Ana Demo", courseId: "course-3med-d-2026", active: true });
    await db.doc("students/student-d-2").set({ studentId: "studB", displayName: "Bea Demo", courseId: "course-3med-d-2026", active: true });
    await db.doc("students/student-e-1").set({ studentId: "studE", displayName: "Eli Demo", courseId: "course-3med-e-2026", active: true });
    await db.doc("students/student-d-1/protected/settings").set({ integrationSupport: true });
    await db.doc("quizzes/q1").set({ courseId: "course-3med-d-2026", title: "Quiz" });
    await db.doc("quizzes/q1/questions/q1a").set({ prompt: "¿A o B?", answer: "A" });
    await db.doc("auditLogs/log1").set({ action: "TEST" });
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

function studentCtx(uid: string) {
  return testEnv.authenticatedContext(uid, { role: "ESTUDIANTE", courses: ["course-3med-d-2026"] });
}

function teacherCtx(uid: string) {
  return testEnv.authenticatedContext(uid, { role: "PROFESOR", courses: ["course-3med-d-2026"] });
}

function evaluatorCtx(uid: string) {
  return testEnv.authenticatedContext(uid, { role: "EVALUADOR", courses: [] });
}

describe("Firestore rules — aislamiento y permisos", () => {
  it("R1: la estudiante lee su propio perfil", async () => {
    const db = studentCtx("studA").firestore();
    await assertSucceeds(db.doc("students/student-d-1").get());
  });

  it("R2: la estudiante NO lee el perfil de otra", async () => {
    const db = studentCtx("studA").firestore();
    await assertFails(db.doc("students/student-d-2").get());
  });

  it("R3: la estudiante NO lee una estudiante de OTRO curso", async () => {
    const db = studentCtx("studA").firestore();
    await assertFails(db.doc("students/student-e-1").get());
  });

  it("R4: el profesor lee solo estudiantes de sus cursos (D sí, E no)", async () => {
    const db = teacherCtx("teach1").firestore();
    await assertSucceeds(db.doc("students/student-d-1").get());
    await assertFails(db.doc("students/student-e-1").get());
  });

  it("R5: la estudiante NO lee datos protegidos (PIE/integración)", async () => {
    const db = studentCtx("studA").firestore();
    await assertFails(db.doc("students/student-d-1/protected/settings").get());
  });

  it("R6: el profesor del curso SÍ lee los datos protegidos de su estudiante", async () => {
    const db = teacherCtx("teach1").firestore();
    await assertSucceeds(db.doc("students/student-d-1/protected/settings").get());
  });

  it("R7: el evaluador NO accede a perfiles individuales de estudiantes", async () => {
    const db = evaluatorCtx("eval1").firestore();
    await assertFails(db.doc("students/student-d-1").get());
  });

  it("R8: la estudiante NO lee las respuestas (answer) de las preguntas del quiz", async () => {
    const db = studentCtx("studA").firestore();
    await assertFails(db.doc("quizzes/q1/questions/q1a").get());
  });

  it("R9: el profesor programa una clase de su curso vía classSchedules (update limitado)", async () => {
    const db = teacherCtx("teach1").firestore();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .doc("classSchedules/course-3med-d-2026/schedules/class-01")
        .set({ classId: "class-01", courseId: "course-3med-d-2026", status: "DRAFT", availability: { enabled: false } });
    });
    await assertSucceeds(
      db
        .doc("classSchedules/course-3med-d-2026/schedules/class-01")
        .update({ status: "OPEN", availability: { enabled: true, flippedAvailable: true } }),
    );
    // El profesor NO programa clases de un curso que no es suyo
    await assertFails(
      db
        .doc("classSchedules/course-3med-e-2026/schedules/class-01")
        .set({ classId: "class-01", courseId: "course-3med-e-2026", status: "OPEN" }),
    );
  });

  it("R10: la estudiante NO escribe en students (solo servidor)", async () => {
    const db = studentCtx("studA").firestore();
    await assertFails(db.doc("students/student-new").set({ studentId: "studA", courseId: "course-3med-d-2026", active: true }));
  });

  it("R11: nadie desde cliente escribe auditLogs", async () => {
    const db = teacherCtx("teach1").firestore();
    await assertFails(db.doc("auditLogs/hack").set({ action: "X" }));
  });

  it("R12: el profesor escribe material de su curso", async () => {
    const db = teacherCtx("teach1").firestore();
    await assertSucceeds(
      db.doc("materials/m1").set({ courseId: "course-3med-d-2026", title: "Guía", status: "BORRADOR", evaluatorId: null }),
    );
    // Evaluador no autorizado para otro material → el evaluador solo ve material asignado
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc("materials/m2").set({ courseId: "course-3med-d-2026", title: "Eval", status: "EN_REVISION", evaluatorId: "eval1" });
    });
    const evalDb = evaluatorCtx("eval1").firestore();
    await assertSucceeds(evalDb.doc("materials/m2").get());
    await assertFails(evalDb.doc("materials/m1").get());
  });

  it("R13: la estudiante escribe su propio flippedProgress, no el de otra", async () => {
    const db = studentCtx("studA").firestore();
    await assertSucceeds(
      db
        .doc("flippedProgress/class-01/records/studA")
        .set({ classId: "class-01", studentId: "studA", courseId: "course-3med-d-2026", ready: true }),
    );
    await assertFails(
      db
        .doc("flippedProgress/class-01/records/studB")
        .set({ classId: "class-01", studentId: "studB", courseId: "course-3med-d-2026" }),
    );
  });

  it("R14: la estudiante no programa clases ni edita el catálogo global", async () => {
    const db = studentCtx("studA").firestore();
    await assertFails(
      db
        .doc("classSchedules/course-3med-d-2026/schedules/class-01")
        .update({ status: "OPEN" }),
    );
    await assertFails(db.doc("classes/class-01").update({ title: "Hackeado" }));
  });

  it("R15: la estudiante no puede escribir su propio quizAttempt (corrección es server-side)", async () => {
    const db = studentCtx("studA").firestore();
    await assertFails(
      db
        .doc("quizAttempts/quiz-1/attempts/studA")
        .set({ quizId: "quiz-1", studentId: "studA", score: 10, status: "SUBMITTED" }),
    );
  });

  it("R16: la estudiante crea su propia evidencia; el profesor actualiza campos de revisión", async () => {
    const studentDb = studentCtx("studA").firestore();
    const subId = `sub-${Date.now()}`;
    await assertSucceeds(
      studentDb.doc(`submissions/${subId}`).set({
        activityId: "act-1",
        studentId: "studA",
        classId: "class-01",
        courseId: "course-3med-d-2026",
        status: "ENTREGADO",
        content: { text: "Mi evidencia" },
        attachments: [],
      }),
    );
    // La estudiante NO puede escribirse nota/feedback a sí misma
    await assertFails(
      studentDb.doc(`submissions/${subId}`).update({ status: "REVISADO", score: 7, teacherFeedback: "auto" }),
    );
    // El profesor puede retroalimentar y puntuar
    const teacherDb = teacherCtx("teach1").firestore();
    await assertSucceeds(
      teacherDb.doc(`submissions/${subId}`).update({ status: "RETROALIMENTADO", score: 6, teacherFeedback: "Bien" }),
    );
  });

  it("R17: nadie desde cliente escribe auditLogs (solo servidor)", async () => {
    const db = teacherCtx("teach1").firestore();
    await assertFails(db.doc("auditLogs/hack").set({ action: "X" }));
  });

  it("R18: la estudiante no escribe proyectos ni equipos (solo server/docente)", async () => {
    const studentDb = studentCtx("studA").firestore();
    await assertFails(
      studentDb.doc("projects/p1").set({ classId: "class-11", courseId: "course-3med-d-2026", teamId: "t1" }),
    );
    await assertFails(
      studentDb.doc("projectTeams/t1").set({ courseId: "course-3med-d-2026", name: "X", members: ["studA"] }),
    );
  });
});
