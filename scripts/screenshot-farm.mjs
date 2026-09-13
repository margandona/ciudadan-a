// Genera una captura de la Granja Ciudadana (requiere emuladores + seeds + web en :5199).
// Uso: node scripts/screenshot-farm.mjs
import { chromium } from "@playwright/test";

const BASE = process.env.WEB_URL ?? "http://localhost:5199";
const STUDENT = { name: "Estudiante Prueba 1 D", password: "111111111" };
const OUT = "docs/assets/granja-ciudadana.png";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 940 }, deviceScaleFactor: 2 });

await page.goto(`${BASE}/login`);
await page.getByRole("tab", { name: "Estudiante" }).click();
await page.locator("#stu-name").selectOption({ label: STUDENT.name });
await page.fill("#stu-password", STUDENT.password);
await page.getByRole("button", { name: "Entrar" }).click();
await page.getByRole("heading", { name: /Hola/ }).first().waitFor({ timeout: 30_000 });

const closeAnnounce = page.getByRole("button", { name: "Cerrar anuncio" });
if (await closeAnnounce.count()) await closeAnnounce.click();

await page.getByRole("link", { name: /Granja/ }).click();
await page.getByRole("heading", { name: "Cultiva tu bien común" }).waitFor({ timeout: 30_000 });
// Espera a que carguen los datos de la granja (aparece la escena con los cultivos).
await page.locator(".scene-field").waitFor({ timeout: 45_000 });
await page.waitForTimeout(1500);

// Coloca todos los objetos disponibles (auto-place en posiciones libres).
for (let i = 0; i < 30; i++) {
  const chip = page.locator(".deco-chip").first();
  if (!(await chip.count())) break;
  await chip.click();
  await page.waitForTimeout(120);
}
await page.locator(".placed-item").first().waitFor({ timeout: 10_000 });
// Espera a que se oculten los toasts para que se vea la casa.
await page.waitForTimeout(7000);

await page.screenshot({ path: OUT, fullPage: true });
console.log(`Captura guardada en ${OUT}`);
await browser.close();
