import { db } from "@/lib/firebase";
import {
  WebActivityRepository,
  WebClassRepository,
  WebClassScheduleRepository,
  WebCourseRepository,
  WebExitTicketRepository,
  WebFlippedLessonRepository,
  WebFlippedProgressRepository,
  WebQuizAttemptRepository,
  WebQuizRepository,
  WebStudentRepository,
  WebSubmissionRepository,
} from "@/infrastructure/repositories";
import {
  GetFlippedLessonForStudentUseCase,
  GetStudentOverviewUseCase,
  ListActivitiesForClassUseCase,
  ListClassesForTeacherUseCase,
  ListMissionsForStudentUseCase,
  ListQuizResultsUseCase,
  ListStudentsUseCase,
  ListSubmissionsUseCase,
  TrackFlippedProgressUseCase,
} from "@pclab/application";
import { useSessionStore } from "@/stores/session";

export function currentActor(): { uid: string; role: string; courses: string[] } {
  const session = useSessionStore();
  return { uid: session.user?.uid ?? "", role: session.role, courses: session.courses };
}

export const studentRepo = new WebStudentRepository(db);
export const courseRepo = new WebCourseRepository(db, () => useSessionStore().courses);
export const classRepo = new WebClassRepository(db);
export const scheduleRepo = new WebClassScheduleRepository(db);
export const lessonRepo = new WebFlippedLessonRepository(db);
export const progressRepo = new WebFlippedProgressRepository(db);
export const quizRepo = new WebQuizRepository(db);
export const quizAttemptRepo = new WebQuizAttemptRepository(db);
export const activityRepo = new WebActivityRepository(db);
export const submissionRepo = new WebSubmissionRepository(db);
export const exitTicketRepo = new WebExitTicketRepository(db);

export const listStudents = new ListStudentsUseCase({ students: studentRepo });
export const getStudentOverview = new GetStudentOverviewUseCase({ students: studentRepo });
export const listMissions = new ListMissionsForStudentUseCase({
  classes: classRepo,
  schedules: scheduleRepo,
  progress: progressRepo,
  submissions: submissionRepo,
});
export const getFlippedLesson = new GetFlippedLessonForStudentUseCase({
  schedules: scheduleRepo,
  lessons: lessonRepo,
  progress: progressRepo,
});
export const trackFlippedProgress = new TrackFlippedProgressUseCase({
  schedules: scheduleRepo,
  lessons: lessonRepo,
  progress: progressRepo,
});
export const listTeacherClasses = new ListClassesForTeacherUseCase({
  classes: classRepo,
  schedules: scheduleRepo,
});
export const listActivities = new ListActivitiesForClassUseCase({ activities: activityRepo });
export const listSubmissions = new ListSubmissionsUseCase({ submissions: submissionRepo });
export const listQuizResults = new ListQuizResultsUseCase({ attempts: quizAttemptRepo });
