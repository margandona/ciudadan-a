import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.setTimeout(120_000);

/**
 * Granja Ciudadana — flujo del estudiante.
 * Requiere emuladores + `pnpm seed:content` + `pnpm seed:students-auth -- --test=3`.
 * Tolerante a estados ya sembrados (cultivos plantados, objetos comprados, quiz aprobado).
 */
test("GRANJA — plantar, tienda, decorar e inventario", async ({ page }) => {
  await login(page, "student");

  // Anuncio en el inicio + navegación a la granja
  await expect(page.getByRole("link", { name: /Entrar a la granja/ })).toBeVisible();
  await page.getByRole("link", { name: /Entrar a la granja/ }).click();
  await expect(page.getByRole("heading", { name: "Cultiva tu bien común" })).toBeVisible();

  // Estadísticas y barra de nivel (tope 100%)
  await expect(page.getByText("monedas", { exact: true })).toBeVisible();
  await expect(page.getByText("semillas", { exact: true })).toBeVisible();
  await expect(page.getByText(/para el próximo nivel/)).toBeVisible();

  // Colapsar/expandir la sección de cultivos (para dejar espacio a los adornos)
  await page.getByRole("button", { name: /Ocultar cultivos/ }).click();
  await expect(page.getByRole("button", { name: /Mostrar cultivos/ })).toBeVisible();
  await page.getByRole("button", { name: /Mostrar cultivos/ }).click();
  await expect(page.getByRole("button", { name: /Ocultar cultivos/ })).toBeVisible();

  // Plantar un cultivo en una casilla vacía (si hay)
  const emptyPlot = page.locator("button.plot", { hasText: "Plantar" }).first();
  if (await emptyPlot.count()) {
    await emptyPlot.click();
    await expect(page.getByRole("heading", { name: "¿Qué plantamos?" })).toBeVisible();
    const wheat = page.locator(".modal .item-card").filter({ hasText: "Trigo" }).first();
    if (await wheat.isEnabled()) await wheat.click();
    else await page.getByRole("button", { name: "Cerrar" }).click();
  }

  // Comprar una decoración en la tienda
  await page.getByRole("button", { name: "Tienda", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Tienda de la granja" })).toBeVisible();
  await page.getByRole("button", { name: /Decoración/ }).click();
  const buyable = page.locator(".item-card:not([disabled])").first();
  if (await buyable.count()) {
    const name = (await buyable.locator("strong").first().textContent())?.trim() ?? "";
    await buyable.click();
    if (name) await expect(page.getByText(new RegExp(`Compraste ${name}`))).toBeVisible({ timeout: 10_000 });
  }
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();

  // Colocar la decoración (arrastrar o tocar)
  const chip = page.locator(".deco-chip").first();
  if (await chip.count()) {
    await chip.click();
    await expect(page.locator(".placed-item").first()).toBeVisible();
  }

  // Entrar a la casa
  await page.getByRole("button", { name: "Entrar a mi casa" }).click();
  await expect(page.getByRole("heading", { name: /Mi casa/ })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();

  // Inventario (con al menos lo comprado)
  await page.getByRole("button", { name: /Inventario/ }).click();
  await expect(page.getByRole("heading", { name: "Mi inventario" })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
});

test("GRANJA — desafío de conceptos por nivel", async ({ page }) => {
  await login(page, "student");
  await page.goto("/student/farm/concept/1");

  await expect(page.getByRole("heading", { name: "Ciudadanía" })).toBeVisible();
  await expect(page.getByText(/XP/)).toBeVisible();

  // Responder todas las preguntas (primera opción de cada una) y enviar
  const questions = page.locator(".question");
  const total = await questions.count();
  expect(total).toBeGreaterThan(0);
  for (let i = 0; i < total; i++) {
    await questions.nth(i).locator(".option").first().click();
  }

  await page.getByRole("button", { name: /Enviar respuestas/ }).click();
  await expect(page.getByText(/\/\s*\d+\s*\(\d+%\)/).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /Ir a mi granja/ })).toBeVisible();
});
