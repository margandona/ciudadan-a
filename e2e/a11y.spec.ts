import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login } from "./helpers";

test("a11y — login sin errores críticos", async ({ page }) => {
  await page.goto("/login");
  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  expect(critical).toEqual([]);
});

test("a11y — home de estudiante sin errores críticos", async ({ page }) => {
  await login(page, "student");
  await page.waitForURL("**/student");
  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  expect(critical).toEqual([]);
});
