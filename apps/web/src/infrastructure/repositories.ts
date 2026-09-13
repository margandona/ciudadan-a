import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import type {
  Activity,
  ClassEntity,
  ClassSchedule,
  Course,
  ExitTicket,
  FlippedLesson,
  FlippedProgress,
  Quiz,
  QuizAttempt,
  QuizQuestion,
  Student,
  Submission,
} from "@pclab/shared";
import type {
  ActivityRepository,
  ClassRepository,
  ClassScheduleRepository,
  CourseRepository,
  ExitTicketRepository,
  FlippedLessonRepository,
  FlippedProgressRepository,
  QuizAttemptRepository,
  QuizRepository,
  StudentRepository,
  SubmissionRepository,
} from "@pclab/application";
import {
  activityFromDoc,
  attemptFromDoc,
  classFromDoc,
  courseFromDoc,
  exitTicketFromDoc,
  flippedLessonFromDoc,
  progressFromDoc,
  progressToRecord,
  quizFromDoc,
  scheduleFromDoc,
  studentFromDoc,
  submissionFromDoc,
} from "./converters";

const NOT_ALLOWED = "Operación no permitida desde el cliente; usar las Cloud Functions.";

/** Repositorio de lectura de estudiantes (cliente). Las escrituras van por Functions. */
export class WebStudentRepository implements StudentRepository {
  constructor(private readonly db: Firestore) {}

  async findByCourse(courseId: string): Promise<Student[]> {
    const snap = await getDocs(
      query(collection(this.db, "students"), where("courseId", "==", courseId)),
    );
    return snap.docs.map((d) => studentFromDoc(d.id, d.data()));
  }

  async getById(id: string): Promise<Student | null> {
    const d = await getDoc(doc(this.db, "students", id));
    if (!d.exists()) return null;
    return studentFromDoc(d.id, d.data());
  }

  upsertMany(): Promise<{ createdIds: string[]; updatedIds: string[] }> {
    throw new Error(NOT_ALLOWED);
  }

  softDelete(): Promise<void> {
    throw new Error(NOT_ALLOWED);
  }
}

/** Repositorio de lectura de cursos (cliente). */
export class WebCourseRepository implements CourseRepository {
  constructor(
    private readonly db: Firestore,
    private readonly getCourses?: () => string[],
  ) {}

  async findById(id: string): Promise<Course | null> {
    const d = await getDoc(doc(this.db, "courses", id));
    if (!d.exists()) return null;
    return courseFromDoc(d.id, d.data());
  }

  async findBySectionYear(section: string, year: number): Promise<Course | null> {
    // Regla "rules are not filters": la query debe filtrar por courseId (el campo
    // que leen las reglas), o Firestore la rechaza. Filtramos por membresía y
    // resolvemos section/year en memoria.
    const courses = this.getCourses?.() ?? [];
    if (courses.length === 0) return null;
    const snap = await getDocs(
      query(collection(this.db, "courses"), where("courseId", "in", courses)),
    );
    const match = snap.docs
      .map((d) => courseFromDoc(d.id, d.data()))
      .find((c) => c.section === section && c.year === year);
    return match ?? null;
  }

  async upsert(_course: Course): Promise<Course> {
    throw new Error(NOT_ALLOWED);
  }
}

/** Repositorio de lectura del catálogo de clases (cliente). */
export class WebClassRepository implements ClassRepository {
  constructor(private readonly db: Firestore) {}

  async listAll(): Promise<ClassEntity[]> {
    const snap = await getDocs(query(collection(this.db, "classes")));
    return snap.docs.map((d) => classFromDoc(d.id, d.data()));
  }

  async getById(id: string): Promise<ClassEntity | null> {
    const d = await getDoc(doc(this.db, "classes", id));
    if (!d.exists()) return null;
    return classFromDoc(d.id, d.data());
  }
}

/** Repositorio de horarios por curso (cliente). Las escrituras van por Functions. */
export class WebClassScheduleRepository implements ClassScheduleRepository {
  constructor(private readonly db: Firestore) {}

  private ref(courseId: string, classId: string) {
    return doc(this.db, "classSchedules", courseId, "schedules", classId);
  }

  async get(courseId: string, classId: string): Promise<ClassSchedule | null> {
    const d = await getDoc(this.ref(courseId, classId));
    if (!d.exists()) return null;
    return scheduleFromDoc(courseId, classId, d.data());
  }

  async listByCourse(courseId: string): Promise<ClassSchedule[]> {
    const snap = await getDocs(collection(this.db, "classSchedules", courseId, "schedules"));
    return snap.docs.map((d) => scheduleFromDoc(courseId, d.id, d.data()));
  }

  async upsert(_schedule: ClassSchedule): Promise<ClassSchedule> {
    throw new Error(NOT_ALLOWED);
  }
}

/** Repositorio de aulas invertidas (cliente). */
export class WebFlippedLessonRepository implements FlippedLessonRepository {
  constructor(private readonly db: Firestore) {}

  async get(classId: string): Promise<FlippedLesson | null> {
    const d = await getDoc(doc(this.db, "flippedLesson", classId));
    if (!d.exists()) return null;
    return flippedLessonFromDoc(classId, d.data());
  }
}

/** Repositorio de progreso flipped (cliente). La estudiante escribe su propio progreso. */
export class WebFlippedProgressRepository implements FlippedProgressRepository {
  constructor(private readonly db: Firestore) {}

  private ref(classId: string, studentId: string) {
    return doc(this.db, "flippedProgress", classId, "records", studentId);
  }

  async get(classId: string, studentId: string): Promise<FlippedProgress | null> {
    const d = await getDoc(this.ref(classId, studentId));
    if (!d.exists()) return null;
    return progressFromDoc(classId, studentId, d.data());
  }

  async upsert(progress: FlippedProgress): Promise<FlippedProgress> {
    await setDoc(this.ref(progress.classId, progress.studentId), progressToRecord(progress), { merge: true });
    return progress;
  }

  async listByClass(_courseId: string, _classId: string): Promise<FlippedProgress[]> {
    throw new Error("Usa la Cloud Function getFlippedOverview para el resumen del curso.");
  }
}

/** Repositorio de quizzes (lectura). Las preguntas con respuesta se sirven por Functions. */
export class WebQuizRepository implements QuizRepository {
  constructor(private readonly db: Firestore) {}

  async getById(id: string): Promise<Quiz | null> {
    const d = await getDoc(doc(this.db, "quizzes", id));
    if (!d.exists()) return null;
    return quizFromDoc(d.id, d.data());
  }

  async listByClass(classId: string): Promise<Quiz[]> {
    const snap = await getDocs(query(collection(this.db, "quizzes"), where("classId", "==", classId)));
    return snap.docs.map((d) => quizFromDoc(d.id, d.data()));
  }

  getQuestions(): Promise<QuizQuestion[]> {
    throw new Error("Las preguntas del quiz se sirven por la Cloud Function getQuizForStudent.");
  }
}

/** Repositorio de intentos de quiz (lectura para profesor/estudiante). */
export class WebQuizAttemptRepository implements QuizAttemptRepository {
  constructor(private readonly db: Firestore) {}

  async get(quizId: string, studentId: string): Promise<QuizAttempt | null> {
    const d = await getDoc(doc(this.db, "quizAttempts", quizId, "attempts", studentId));
    if (!d.exists()) return null;
    return attemptFromDoc(quizId, studentId, d.data());
  }

  async listByQuiz(quizId: string): Promise<QuizAttempt[]> {
    const snap = await getDocs(collection(this.db, "quizAttempts", quizId, "attempts"));
    return snap.docs.map((d) => attemptFromDoc(quizId, d.id, d.data()));
  }

  upsert(): Promise<QuizAttempt> {
    throw new Error("Los intentos de quiz se envían por la Cloud Function submitQuizAttempt.");
  }
}

/** Repositorio de actividades (lectura). */
export class WebActivityRepository implements ActivityRepository {
  constructor(private readonly db: Firestore) {}

  async getById(id: string): Promise<Activity | null> {
    const d = await getDoc(doc(this.db, "activities", id));
    if (!d.exists()) return null;
    return activityFromDoc(d.id, d.data());
  }

  async listByClass(classId: string): Promise<Activity[]> {
    const snap = await getDocs(query(collection(this.db, "activities"), where("classId", "==", classId)));
    return snap.docs.map((d) => activityFromDoc(d.id, d.data()));
  }
}

/** Repositorio de evidencias (lectura). Las escrituras van por submitEvidence/reviewSubmission. */
export class WebSubmissionRepository implements SubmissionRepository {
  constructor(private readonly db: Firestore) {}

  async getById(id: string): Promise<Submission | null> {
    const d = await getDoc(doc(this.db, "submissions", id));
    if (!d.exists()) return null;
    return submissionFromDoc(d.id, d.data());
  }

  async findByStudentAndActivity(studentId: string, activityId: string): Promise<Submission | null> {
    const snap = await getDocs(
      query(collection(this.db, "submissions"), where("studentId", "==", studentId), where("activityId", "==", activityId)),
    );
    if (snap.empty) return null;
    const d = snap.docs[0]!;
    return submissionFromDoc(d.id, d.data());
  }

  /** Evidencias de una estudiante en una clase (query consistente con la regla ESTUDIANTE). */
  async findByStudentAndClass(studentId: string, classId: string): Promise<Submission[]> {
    const snap = await getDocs(
      query(collection(this.db, "submissions"), where("studentId", "==", studentId), where("classId", "==", classId)),
    );
    return snap.docs.map((d) => submissionFromDoc(d.id, d.data()));
  }

  /** Entregas propias de la estudiante (consistente con la regla: uid == studentId). */
  async findByStudent(studentId: string): Promise<Submission[]> {
    const snap = await getDocs(query(collection(this.db, "submissions"), where("studentId", "==", studentId)));
    return snap.docs.map((d) => submissionFromDoc(d.id, d.data()));
  }

  async listByClass(courseId: string, classId: string): Promise<Submission[]> {
    const snap = await getDocs(
      query(collection(this.db, "submissions"), where("courseId", "==", courseId), where("classId", "==", classId)),
    );
    return snap.docs.map((d) => submissionFromDoc(d.id, d.data()));
  }

  upsert(): Promise<Submission> {
    throw new Error("Las evidencias se envían por la Cloud Function submitEvidence.");
  }
}

/** Repositorio de tickets de salida (lectura). Las escrituras van por submitExitTicket. */
export class WebExitTicketRepository implements ExitTicketRepository {
  constructor(private readonly db: Firestore) {}

  async get(classId: string, studentId: string): Promise<ExitTicket | null> {
    const d = await getDoc(doc(this.db, "exitTickets", classId, "tickets", studentId));
    if (!d.exists()) return null;
    return exitTicketFromDoc(classId, studentId, d.data());
  }

  async listByClass(courseId: string, classId: string): Promise<ExitTicket[]> {
    const snap = await getDocs(
      query(collection(this.db, "exitTickets", classId, "tickets"), where("courseId", "==", courseId)),
    );
    return snap.docs.map((d) => exitTicketFromDoc(classId, d.id, d.data()));
  }

  upsert(): Promise<ExitTicket> {
    throw new Error("Los tickets se envían por la Cloud Function submitExitTicket.");
  }
}
