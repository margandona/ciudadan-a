import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("FLOW 3+4 — profesor crea/versiona/envía material y evaluador aprueba", async ({ page }) => {
  await login(page, "teacher");

  await page.goto("/teacher/materials");
  await page.getByRole("heading", { name: "Materiales" }).waitFor();

  const title = `Evaluación E2E ${Date.now()}`;
  await page.fill('input[placeholder="Título"]', title);
  await page.getByRole("button", { name: "Crear material" }).click();
  await expect(page.getByText(title)).toBeVisible();

  // Versión GENERAL
  const card = page.locator(".material").filter({ hasText: title }).first();
  await card.locator('input[placeholder^="Nombre del archivo"]').fill("eval-e2e.pdf");
  await card.getByRole("button", { name: "+ Versión" }).click();
  await expect(page.getByText("Versión agregada.")).toBeVisible();

  // Enviar a revisión
  await card.locator('input[placeholder^="Correo del evaluador"]').fill("evaluador@demo.cl");
  await card.getByRole("button", { name: "Enviar a revisión" }).click();
  await expect(page.getByText("Enviado a revisión.")).toBeVisible();

  // Evaluador
  const evaluator = await page.context().newPage();
  await login(evaluator, "evaluator");
  await evaluator.getByRole("button", { name: title }).click();
  await evaluator.locator("textarea").fill("Aprobada en E2E");
  await evaluator.getByRole("button", { name: "Registrar revisión" }).click();
  await expect(evaluator.getByText("Revisión registrada.")).toBeVisible();
  await evaluator.close();
});
