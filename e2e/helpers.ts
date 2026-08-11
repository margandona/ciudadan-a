import type { Page } from "@playwright/test";

export const USERS = {
  teacher: { email: "profesor@demo.cl", password: "Demo1234" },
  student: { email: "estudiante@demo.cl", password: "Demo1234" },
  evaluator: { email: "evaluador@demo.cl", password: "Demo1234" },
} as const;

const LANDING = {
  teacher: { heading: /Cursos/ },
  student: { heading: /Hola/ },
  evaluator: { heading: /Portal del evaluador/ },
} as const;

/** Login y espera de la pantalla del rol (más robusto que el patrón de URL). */
export async function login(page: Page, role: keyof typeof USERS): Promise<void> {
  const user = USERS[role];
  await page.goto("/login");
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.getByRole("heading", { name: LANDING[role].heading }).first().waitFor({ timeout: 20_000 });
}

