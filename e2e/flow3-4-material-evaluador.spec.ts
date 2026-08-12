import { test } from "@playwright/test";
import { login } from "./helpers";

test("FLOW 3+4 — dashboards de revisión institucional (evaluadora / PIE / UTP)", async ({ page, context }) => {
  // Genera un material pendiente de revisión desde el profesor
  await login(page, "teacher");
  await page.goto("/teacher/materials");
  const title = `Eval Rev E2E ${Date.now()}`;
  await page.getByLabel("Tipo de material", { exact: true }).selectOption("WRITTEN_TEST");
  await page.fill('input[placeholder*="Título"]', title);
  await page.getByLabel("Clase", { exact: true }).selectOption("class-06");
  await page.getByRole("button", { name: "Generar", exact: true }).click();
  await page.waitForURL(/\/teacher\/materials\/.+\/edit/, { timeout: 15_000 });
  await page.goto("/teacher/materials");
  const card = page.locator(".material", { hasText: title }).first();
  await card.waitFor({ timeout: 15_000 });
  await card.getByLabel("Correo de la evaluadora").fill("evaluador@demo.cl");
  await card.getByLabel("Correo PIE").fill("pie@demo.cl");
  await card.getByLabel("Correo UTP").fill("utp@demo.cl");
  await card.getByRole("button", { name: "Enviar a revisión" }).click();
  await card.getByText("En revisión").first().waitFor({ timeout: 25_000 });

  // Evaluadora: ve el material en su portal y abre el detalle (revisiones por actor)
  const evaluator = await context.newPage();
  await login(evaluator, "evaluator");
  const item = evaluator.getByRole("button", { name: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) });
  await item.waitFor({ timeout: 25_000 });
  await item.click();
  await evaluator.getByText("Revisiones").waitFor({ timeout: 15_000 });
  await evaluator.getByText("EVALUADOR").first().waitFor({ timeout: 10_000 });
  await evaluator.getByText("PIE").first().waitFor({ timeout: 10_000 });
  await evaluator.getByText("UTP").first().waitFor({ timeout: 10_000 });

  // PIE: dashboard de pendientes
  const pie = await context.newPage();
  await login(pie, "evaluator"); // el helper solo soporta teacher/student/evaluator
  await pie.goto("/login");
  await pie.fill('input[type="email"]', "pie@demo.cl");
  await pie.fill('input[type="password"]', "Demo1234");
  await pie.getByRole("button", { name: "Entrar" }).click();
  await pie.getByRole("heading", { name: /Material pendiente de revisión — PIE/ }).waitFor({ timeout: 25_000 });
  await pie.getByText(new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).first().waitFor({ timeout: 15_000 });
  await pie.close();
  await evaluator.close();
});
