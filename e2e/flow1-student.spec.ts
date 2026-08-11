import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("FLOW 1 — estudiante: aula invertida, quiz, evidencia y ticket", async ({ page }) => {
  await login(page, "student");
  await expect(page.getByRole("heading", { name: /Hola/ })).toBeVisible();

  // Aula invertida
  await page.goto("/student/missions/class-01/flipped");
  await expect(page.getByRole("heading", { name: "Misión 01 — ¿Qué significa ser ciudadana?" })).toBeVisible();

  // Quiz individual (tolerante si ya se usaron los intentos o el quiz aún carga)
  await page.goto("/student/quizzes/quiz-class-01-ciudadania");
  await expect(page.getByRole("heading", { name: /Quiz 01/ })).toBeVisible();
  const option = page.locator("button.option").first();
  await option.click({ timeout: 10_000 });
  await page.getByRole("button", { name: /Enviar respuestas/ }).click();
  await expect(page.getByText(/Resultado:|Ya usaste todos tus intentos/).first()).toBeVisible();

  // Evidencia (tolerante si ya está entregada)
  await page.goto("/student/missions/class-01/activities");
  await expect(page.getByRole("heading", { name: "Actividades y evidencias" })).toBeVisible();
  const submitBtn = page.getByRole("button", { name: "Entregar evidencia" });
  if (await submitBtn.count()) {
    await page.locator("textarea").first().fill("Mi evidencia E2E");
    await submitBtn.click();
  }
  await expect(page.getByText(/ENTREGADO|PENDIENTE_DE_SINCRONIZAR/).first()).toBeVisible();

  // Ticket de salida
  await page.goto("/student/missions/class-01/exit-ticket");
  for (const field of ["#learned", "#evidence", "#concept", "#question", "#relation"]) {
    await page.fill(field, "respuesta E2E");
  }
  await page.getByRole("button", { name: "Enviar ticket" }).click();
  await expect(page.getByText("¡Ticket enviado!")).toBeVisible();
});
