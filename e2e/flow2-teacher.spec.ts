import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("FLOW 2 — profesor: habilita clase, revisa perfil y registra participación", async ({ page }) => {
  await login(page, "teacher");
  await expect(page.getByRole("heading", { name: "Cursos" })).toBeVisible();

  // Habilitar clase (class-01 → OPEN)
  await page.goto("/teacher/classes");
  await page.getByRole("heading", { name: "Clases" }).waitFor();
  const row = page.locator("tr").filter({ hasText: "Misión 01" }).first();
  await row.locator("select").first().selectOption("OPEN");
  await row.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Guardado: Misión 01")).toBeVisible();

  // Perfil de estudiante
  await page.goto("/teacher/courses/course-3med-d-2026");
  await page.getByRole("link", { name: "Perfil" }).first().click();
  await expect(page.getByText("Datos generales")).toBeVisible();

  // Participación en vivo
  await page.goto("/teacher/live/class-01");
  await page.getByRole("button", { name: "+ Participó" }).click();
  await expect(page.getByText(/registro\(s\) guardados/)).toBeVisible();
});
