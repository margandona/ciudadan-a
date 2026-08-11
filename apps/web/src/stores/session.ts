import { defineStore } from "pinia";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebaseApp";
import { ROLES, type Role } from "@pclab/shared";

export interface SessionClaims {
  role: Role | "";
  courses: string[];
}

type InitState = "idle" | "starting" | "ready";

export const useSessionStore = defineStore("session", {
  state: () => ({
    user: null as User | null,
    ready: false,
    role: "" as Role | "",
    courses: [] as string[],
    courseId: "",
    studentId: "",
    error: "",
  }),
  getters: {
    isAuthenticated: (s) => s.user !== null,
    canManageStudents: (s) =>
      s.role === ROLES.MASTER || s.role === ROLES.ADMIN || s.role === ROLES.PROFESOR,
  },
  actions: {
    /** Escucha Auth y resuelve cuando el estado inicial está cargado. Idempotente. */
    init(): Promise<void> {
      const self = this as typeof this & { __init?: InitState; __initPromise?: Promise<void> };
      if (self.__init === "ready") return Promise.resolve();
      if (self.__init === "starting" && self.__initPromise) return self.__initPromise;

      self.__init = "starting";
      self.__initPromise = new Promise<void>((resolve) => {
        onAuthStateChanged(auth, async (user) => {
          this.user = user;
          if (user) {
            const idToken = await user.getIdTokenResult();
            this.role = (idToken.claims.role as Role | undefined) ?? "";
            this.courses = (idToken.claims.courses as string[] | undefined) ?? [];
            this.courseId = (idToken.claims.courseId as string | undefined) ?? "";
            this.studentId = (idToken.claims.studentId as string | undefined) ?? "";
          } else {
            this.role = "";
            this.courses = [];
            this.courseId = "";
            this.studentId = "";
          }
          this.ready = true;
          self.__init = "ready";
          resolve();
        });
      });
      return self.__initPromise;
    },
    async login(email: string, password: string): Promise<void> {
      this.error = "";
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        this.error = (err as Error).message ?? "Error al iniciar sesión.";
        throw err;
      }
    },
    async logout(): Promise<void> {
      await signOut(auth);
    },
  },
});
