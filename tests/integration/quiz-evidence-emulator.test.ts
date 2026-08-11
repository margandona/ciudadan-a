process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8088";
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9098";
process.env.GCLOUD_PROJECT = "pclab-integration";

import { beforeAll, describe, expect, it } from "vitest";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  FirestoreActivityRepository,
  FirestoreExitTicketRepository,
  FirestoreQuizAttemptRepository,
  FirestoreQuizRepository,
  FirestoreSubmissionRepository,
} from "@pclab/infrastructure";
import {
  GetStudentQuizUseCase,
  ReviewSubmissionUseCase,
  SubmitEvidenceUseCase,
  SubmitExitTicketUseCase,
  SubmitQuizAttemptUseCase,
} from "@pclab/application";
import { SUBMISSION_STATUS, type Activity, type Quiz, type QuizQuestion } from "@pclab/shared";

const COURSE = "course-3med-d-2026";
const CLASS = "class-01";
const QUIZ_ID = "quiz-01-demo";
const ACT_ID = "act-01-demo";
const STUDENT_UID = "studQuiz";

const STUDENT = { uid: STUDENT_UID, role: "ESTUDIANTE", courses: [COURSE] };
const TEACHER = { uid: "teachQ", role: "PROFESOR", courses: [COURSE] };

const QUIZ: Quiz = {
  id: QUIZ_ID,
  classId: CLASS,
  courseId: COURSE,
  title: "Quiz demo ciudadanía",
  mode: "INDIVIDUAL",
  config: { timerSeconds: null, points: 1, attempts: 1, immediateFeedback: true, showExplanation: true },
  shuffle: false,
  active: true,
  order: 1,
  questionCount: 2,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const QUESTIONS: QuizQuestion[] = [
  { id: "q1", quizId: QUIZ_ID, type: "choice", prompt: "¿Qué es ser ciudadana?", options: ["Votar", "Participar"], points: 2, order: 1, correctIndex: 1 },
  { id: "q2", quizId: QUIZ_ID, type: "truefalse", prompt: "¿El like siempre es participación?", options: ["Verdadero", "Falso"], points: 1, order: 2, correctIndex: 1 },
];

const ACTIVITY: Activity = {
  id: ACT_ID,
  classId: CLASS,
  courseId: COURSE,
  title: "Dilema ciudadano",
  type: "dilemma",
  description: "Analiza un dilema local",
  instructions: ["Lee", "Responde"],
  evidenceRequired: true,
  evidenceTypes: ["text"],
  order: 1,
  active: true,
};

let db: ReturnType<typeof getFirestore>;

beforeAll(async () => {
  if (getApps().length === 0) initializeApp({ projectId: "pclab-integration" });
  db = getFirestore();
  // Limpieza
  await db.collection("quizzes").doc(QUIZ_ID).delete().catch(() => undefined);
  await db.collection("quizzes").doc(QUIZ_ID).collection("questions").doc("q1").delete().catch(() => undefined);
  await db.collection("quizzes").doc(QUIZ_ID).collection("questions").doc("q2").delete().catch(() => undefined);
  await db.collection("quizAttempts").doc(QUIZ_ID).collection("attempts").doc(STUDENT_UID).delete().catch(() => undefined);
  await db.collection("activities").doc(ACT_ID).delete().catch(() => undefined);
  const subs = await db.collection("submissions").where("activityId", "==", ACT_ID).get();
  await Promise.all(subs.docs.map((d) => d.ref.delete()));
  await db.collection("exitTickets").doc(CLASS).collection("tickets").doc(STUDENT_UID).delete().catch(() => undefined);

  await db.collection("quizzes").doc(QUIZ_ID).set(QUIZ, { merge: true });
  for (const q of QUESTIONS) {
    await db.collection("quizzes").doc(QUIZ_ID).collection("questions").doc(q.id).set(q, { merge: true });
  }
  await db.collection("activities").doc(ACT_ID).set(ACTIVITY, { merge: true });
});

describe("FASE 4 — quiz, evidencia y ticket (integración)", () => {
  it("el quiz se sirve sin respuestas y el intento se corrige server-side", async () => {
    const quizzes = new FirestoreQuizRepository(db);
    const attempts = new FirestoreQuizAttemptRepository(db);

    const getter = new GetStudentQuizUseCase({ quizzes, attempts });
    const studentQuiz = await getter.run({ quizId: QUIZ_ID, studentId: STUDENT_UID }, STUDENT);
    expect(studentQuiz.questions).toHaveLength(2);
    expect(studentQuiz.questions[0]).not.toHaveProperty("correctIndex");
    expect(studentQuiz.questions[1]).not.toHaveProperty("correctIndex");

    const submitter = new SubmitQuizAttemptUseCase({ quizzes, attempts });
    const result = await submitter.run(
      { quizId: QUIZ_ID, studentId: STUDENT_UID, answers: [{ qid: "q1", given: 1 }, { qid: "q2", given: 1 }] },
      STUDENT,
    );
    expect(result.score).toBe(3);
    expect(result.maxScore).toBe(3);
    expect(result.status).toBe("SUBMITTED");
  });

  it("la estudiante entrega evidencia y el profesor la revisa", async () => {
    const submissions = new FirestoreSubmissionRepository(db);
    const activities = new FirestoreActivityRepository(db);
    const submitter = new SubmitEvidenceUseCase({ activities, submissions });
    const submission = await submitter.run(
      { activityId: ACT_ID, studentId: STUDENT_UID, classId: CLASS, courseId: COURSE, content: { text: "Mi análisis del dilema" } },
      STUDENT,
    );
    expect(submission.status).toBe(SUBMISSION_STATUS.ENTREGADO);
    expect(submission.id).toBeTruthy();

    const reviewer = new ReviewSubmissionUseCase({ submissions, audit: { log: async () => undefined } });
    const reviewed = await reviewer.run(
      { submissionId: submission.id, courseId: COURSE, status: SUBMISSION_STATUS.RETROALIMENTADO, score: 5, teacherFeedback: "Buen argumento" },
      TEACHER,
    );
    expect(reviewed.score).toBe(5);
    expect(reviewed.status).toBe(SUBMISSION_STATUS.RETROALIMENTADO);
  });

  it("la estudiante envía su ticket de salida", async () => {
    const tickets = new FirestoreExitTicketRepository(db);
    const activities = new FirestoreActivityRepository(db);
    const submitter = new SubmitExitTicketUseCase({ tickets, activities });
    const ticket = await submitter.run(
      {
        classId: CLASS,
        courseId: COURSE,
        studentId: STUDENT_UID,
        answers: {
          learned: "Aprendí participación",
          evidence: "La lectura",
          concept: "Ciudadanía",
          question: "¿Qué es el bien común?",
          relationOvalle: "Plaza del barrio",
        },
        difficulty: 2,
      },
      STUDENT,
    );
    expect(ticket.studentId).toBe(STUDENT_UID);
    const persisted = await tickets.get(CLASS, STUDENT_UID);
    expect(persisted?.difficulty).toBe(2);
  });
});
