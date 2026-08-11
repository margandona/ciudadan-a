import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { ROLES } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";

const routes: RouteRecordRaw[] = [
  { path: "/login", name: "login", component: () => import("@/views/LoginView.vue"), meta: { public: true } },
  {
    path: "/",
    component: () => import("@/views/HomeView.vue"),
    children: [
      { path: "", name: "home", redirect: "/teacher" },
      {
        path: "teacher",
        name: "teacher-courses",
        component: () => import("@/features/courses/CourseListView.vue"),
        meta: { roles: [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER] },
      },
      {
        path: "teacher/courses/:courseId",
        name: "course-dashboard",
        component: () => import("@/features/courses/CourseDashboardView.vue"),
        meta: { roles: [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER] },
        props: true,
      },
      {
        path: "teacher/courses/:courseId/students/:studentId",
        name: "student-profile",
        component: () => import("@/features/students/StudentProfileView.vue"),
        meta: { roles: [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER] },
        props: true,
      },
      {
        path: "teacher/students/import",
        name: "student-import",
        component: () => import("@/features/student-import/StudentImportView.vue"),
        meta: { roles: [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER] },
      },
      {
        path: "teacher/materials",
        name: "teacher-materials",
        component: () => import("@/features/materials/TeacherMaterialsView.vue"),
        meta: { roles: [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER] },
      },
      {
        path: "evaluator",
        name: "evaluator-portal",
        component: () => import("@/features/evaluation/EvaluatorPortal.vue"),
        meta: { roles: [ROLES.EVALUADOR, ROLES.ADMIN, ROLES.MASTER] },
      },
      {
        path: "teacher/classes",
        name: "teacher-classes",
        component: () => import("@/features/classes/ClassesView.vue"),
        meta: { roles: [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER] },
      },
      {
        path: "teacher/calendar",
        name: "teacher-calendar",
        component: () => import("@/features/calendar/CalendarView.vue"),
        meta: { roles: [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER] },
      },
      {
        path: "teacher/feedback",
        name: "teacher-feedback",
        component: () => import("@/features/feedback/FeedbackTendenciesView.vue"),
        meta: { roles: [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER] },
      },
      {
        path: "teacher/analytics",
        name: "teacher-analytics",
        component: () => import("@/features/feedback/AnalyticsView.vue"),
        meta: { roles: [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER] },
      },
      {
        path: "teacher/teams",
        name: "teacher-teams",
        component: () => import("@/features/projects/TeamsView.vue"),
        meta: { roles: [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER] },
      },
      {
        path: "teacher/projects",
        name: "teacher-projects",
        component: () => import("@/features/projects/ProjectsReviewView.vue"),
        meta: { roles: [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER] },
      },
      {
        path: "teacher/fair",
        name: "teacher-fair",
        component: () => import("@/features/projects/FairView.vue"),
        meta: { roles: [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER] },
      },
      {
        path: "teacher/live/:classId",
        name: "teacher-live",
        component: () => import("@/features/participation/LiveParticipationView.vue"),
        meta: { roles: [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER] },
        props: true,
      },
      {
        path: "teacher/classes/:classId/dashboard",
        name: "teacher-class-dashboard",
        component: () => import("@/features/classes/ClassDashboardView.vue"),
        meta: { roles: [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER] },
        props: true,
      },
      {
        path: "teacher/classes/:classId/presentation",
        name: "teacher-presentation",
        component: () => import("@/features/projection/PresentationEditor.vue"),
        meta: { roles: [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER] },
        props: true,
      },
      {
        path: "teacher/classes/:classId/flipped",
        name: "teacher-flipped-overview",
        component: () => import("@/features/classes/FlippedOverviewView.vue"),
        meta: { roles: [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER] },
        props: true,
      },
      {
        path: "teacher/classes/:classId/submissions",
        name: "teacher-submissions",
        component: () => import("@/features/submissions/SubmissionsReviewView.vue"),
        meta: { roles: [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER] },
        props: true,
      },
      {
        path: "teacher/classes/:classId/quizzes",
        name: "teacher-quiz-results",
        component: () => import("@/features/submissions/QuizResultsView.vue"),
        meta: { roles: [ROLES.PROFESOR, ROLES.ADMIN, ROLES.MASTER] },
        props: true,
      },
      {
        path: "student",
        name: "student-home",
        component: () => import("@/features/students/StudentHomeView.vue"),
        meta: { roles: [ROLES.ESTUDIANTE] },
      },
      {
        path: "student/missions/:classId/flipped",
        name: "student-flipped",
        component: () => import("@/features/flipped/FlippedLessonView.vue"),
        meta: { roles: [ROLES.ESTUDIANTE] },
        props: true,
      },
      {
        path: "student/missions/:classId/activities",
        name: "student-activities",
        component: () => import("@/features/activities/StudentActivitiesView.vue"),
        meta: { roles: [ROLES.ESTUDIANTE] },
        props: true,
      },
      {
        path: "student/missions/:classId/exit-ticket",
        name: "student-exit-ticket",
        component: () => import("@/features/activities/ExitTicketView.vue"),
        meta: { roles: [ROLES.ESTUDIANTE] },
        props: true,
      },
      {
        path: "student/missions/:classId/feedback",
        name: "student-feedback",
        component: () => import("@/features/feedback/FeedbackView.vue"),
        meta: { roles: [ROLES.ESTUDIANTE] },
        props: true,
      },
      {
        path: "student/missions/:classId/project",
        name: "student-project",
        component: () => import("@/features/projects/ProjectWizard.vue"),
        meta: { roles: [ROLES.ESTUDIANTE] },
        props: true,
      },
      {
        path: "student/quizzes/:quizId",
        name: "student-quiz",
        component: () => import("@/features/quizzes/StudentQuizView.vue"),
        meta: { roles: [ROLES.ESTUDIANTE] },
        props: true,
      },
      {
        path: "projection/:classId",
        name: "projection",
        // Pública: el acceso se valida con token de proyección en getPresentation.
        component: () => import("@/features/projection/ProjectionView.vue"),
        meta: { public: true },
        props: true,
      },
    ],
  },
  { path: "/403", name: "forbidden", component: () => import("@/views/ForbiddenView.vue"), meta: { public: true } },
  { path: "/:pathMatch(.*)*", name: "not-found", component: () => import("@/views/NotFoundView.vue"), meta: { public: true } },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const session = useSessionStore();
  await session.init();

  if (to.meta.public) return true;

  if (!session.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }

  const roles = to.meta.roles as string[] | undefined;
  if (roles && !roles.includes(session.role)) {
    return { name: "forbidden" };
  }
  return true;
});
