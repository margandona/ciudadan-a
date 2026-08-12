import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, password: string, heading: RegExp): Promise<void> {
  await page.goto("/login");
  await page.waitForTimeout(500);
  // Si ya hay sesión, cierra antes de cambiar de usuario.
  const salir = page.getByRole("button", { name: /Salir/ });
  if (await salir.count()) {
    await salir.click();
    await page.waitForTimeout(800);
  }
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("heading", { name: heading }).first().waitFor({ timeout: 25_000 });
}

test.describe("Material pedagógico — flujo institucional (FLOW 1 + 2)", () => {
  test.describe.configure({ retries: 1 });

  test("el profesor genera una guía, la envía a revisión y la evaluadora la aprueba (READY_TO_PRINT)", async ({ page }) => {
    test.setTimeout(150_000);
    const title = `Guía E2E ${Date.now()}`;

    // --- Profesor: generar guía ---
    await login(page, "profesor@demo.cl", "Demo1234", /Cursos/);
    await page.goto("/teacher/materials");
    await page.getByLabel("Tipo de material", { exact: true }).selectOption("GUIDE");
    await page.fill('input[placeholder*="Título"]', title);
    await page.getByLabel("Clase", { exact: true }).selectOption("class-02");
    await page.getByRole("button", { name: "Generar", exact: true }).click();
    // Redirige al editor del nuevo borrador
    await page.waitForURL(/\/teacher\/materials\/.+\/edit/, { timeout: 15_000 });
    await page.getByRole("heading", { name: /Editar material/ }).waitFor({ timeout: 15_000 });
    // Guardar (crea v2)
    await page.getByRole("button", { name: /Guardar \(v2\)/ }).click();
    await page.getByText("Guardado (nueva versión creada).").waitFor({ timeout: 15_000 });
    // Volver a la lista y enviar a revisión
    await page.goto("/teacher/materials");
    const card = page.locator(".material", { hasText: title }).first();
    await card.waitFor({ timeout: 15_000 });
    await card.getByLabel("Correo de la evaluadora").fill("evaluador@demo.cl");
    await card.getByRole("button", { name: "Enviar a revisión" }).click();
    // El estado de la tarjeta cambia a «En revisión» (el aviso se limpia al recargar la lista).
    await card.getByText("En revisión").first().waitFor({ timeout: 25_000 });

    // --- Evaluadora: aprobar la guía (solo requiere evaluadora) ---
    await login(page, "evaluador@demo.cl", "Demo1234", /Portal del evaluador/);
    const item = page.getByRole("button", { name: new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) });
    await item.waitFor({ timeout: 20_000 });
    await item.click();
    await page.getByRole("heading", { name: title }).first().waitFor({ timeout: 15_000 });
    await page.fill("#review-comment", "Aprobada: cumple con OA y estructura.");
    await page.selectOption("#review-decision", "APROBADO");
    await page.getByRole("button", { name: "Registrar revisión" }).click();
    await page.getByText("Aprobado final").first().waitFor({ timeout: 30_000 });

    // --- Profesor: marcar listo para imprimir ---
    await login(page, "profesor@demo.cl", "Demo1234", /Cursos/);
    await page.goto("/teacher/materials");
    const card2 = page.locator(".material", { hasText: title }).first();
    await card2.waitFor({ timeout: 15_000 });
    await card2.getByText("Aprobado final").waitFor({ timeout: 10_000 });
    await card2.getByRole("button", { name: "Listo para imprimir" }).click();
    await card2.getByText("Listo para imprimir").first().waitFor({ timeout: 20_000 });
  });

  test("FLOW 2: generar guía con fecha calcula plazos y se puede descargar PDF", async ({ page }) => {
    test.setTimeout(120_000);
    const title = `Guía E2E Plazos ${Date.now()}`;
    await login(page, "profesor@demo.cl", "Demo1234", /Cursos/);
    await page.goto("/teacher/materials");
    await page.getByLabel("Tipo de material", { exact: true }).selectOption("GUIDE");
    await page.fill('input[placeholder*="Título"]', title);
    await page.getByLabel("Clase", { exact: true }).selectOption("class-04");
    await page.getByLabel(/Fecha de clase/).fill("2026-08-20");
    await page.getByRole("button", { name: "Generar", exact: true }).click();
    await page.waitForURL(/\/teacher\/materials\/.+\/edit/, { timeout: 15_000 });
    await page.goto("/teacher/materials");
    const card = page.locator(".material", { hasText: title }).first();
    await card.waitFor({ timeout: 15_000 });
    // La guía impresa calcula el plazo de impresión −3 días (2026-08-17)
    await expect(card.getByText(/impresión límite 2026-08-17/)).toBeVisible({ timeout: 10_000 });
    // Descarga PDF
    const downloadPromise = page.waitForEvent("download", { timeout: 40_000 });
    await card.getByRole("button", { name: "PDF", exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(".pdf");
  });
});
