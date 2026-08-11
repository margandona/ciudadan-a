import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("FLOW 5 — proyección: deck con teclado y fullscreen", async ({ page }) => {
  await login(page, "teacher");
  await page.goto("/projection/class-01");
  await expect(page.getByRole("heading", { name: /Misión 01/ }).first()).toBeVisible();
  const slide1 = page.locator(".stage").innerText();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".stage")).not.toHaveText(slide1, { timeout: 5000 });
});

test("FLOW 6 — gamificación: evaluar medallas y galería", async ({ page }) => {
  await login(page, "student");
  await page.getByRole("button", { name: "Evaluar medallas" }).click();
  await expect(page.getByText("Mis medallas")).toBeVisible();
  await expect(page.locator(".badge-card").first()).toBeVisible();
});

test("FLOW 7 — feedback anónimo de estudiante", async ({ page }) => {
  await login(page, "student");
  await page.goto("/student/missions/class-01/feedback");
  await page.fill("#app-open", "Todo bien E2E");
  await page.getByRole("button", { name: "Enviar feedback" }).click();
  await expect(page.getByText("¡Gracias por tu feedback!")).toBeVisible();
});

test("FLOW 8 — offline: respuesta se encola y sincroniza", async ({ page }) => {
  await login(page, "student");

  // Cargar el formulario online primero (la app queda lista para offline).
  await page.goto("/student/missions/class-01/exit-ticket");
  await expect(page.getByText("Ticket de salida")).toBeVisible();

  await page.context().setOffline(true);
  for (const field of ["#learned", "#evidence", "#concept", "#question", "#relation"]) {
    await page.fill(field, "offline E2E");
  }
  await page.getByRole("button", { name: "Enviar ticket" }).click();
  await expect(page.getByText(/Se sincronizará/)).toBeVisible();

  await page.context().setOffline(false);
  // Al reconectar se vacía la cola; el banner desaparece (SINCRONIZADO).
  await expect(page.locator(".banner")).toHaveCount(0, { timeout: 20_000 });
});
