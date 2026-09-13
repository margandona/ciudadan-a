import type { Page } from "@playwright/test";

export const USERS = {
  teacher: { email: "profesor@demo.cl", password: "Demo1234" },
  student: { email: "estudiante@demo.cl", password: "Demo1234" },
  evaluator: { email: "evaluador@demo.cl", password: "Demo1234" },
} as const;

/** Estudiante de prueba creado por `pnpm seed:students-auth -- --test=3`. */
export const STUDENT_LOGIN = { name: "Estudiante Prueba 1 D", password: "111111111" } as const;

const LANDING = {
  teacher: /Cursos/,
  student: /Hola/,
  evaluator: /Portal del evaluador/,
} as const;

/**
 * Login según el flujo actual:
 * - estudiante: pestaña "Estudiante" → curso/nombre + clave (RUT sin puntos ni guiones).
 * - staff: pestaña "Docente / equipo" → email + contraseña.
 */
export async function login(page: Page, role: keyof typeof USERS): Promise<void> {
  await page.goto("/login");

  if (role === "student") {
    await page.getByRole("tab", { name: "Estudiante" }).click();
    await page.locator("#stu-name").selectOption({ label: STUDENT_LOGIN.name });
    await page.fill("#stu-password", STUDENT_LOGIN.password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.getByRole("heading", { name: LANDING.student }).first().waitFor({ timeout: 20_000 });
    return;
  }

  await page.getByRole("tab", { name: "Docente / equipo" }).click();
  await page.fill('input[type="email"]', USERS[role].email);
  await page.fill('input[type="password"]', USERS[role].password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("heading", { name: LANDING[role] }).first().waitFor({ timeout: 20_000 });
}
