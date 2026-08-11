import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  retries: 0,
  workers: 1, // secuencial: comparte el emulador y evita colisiones
  use: {
    baseURL: "http://localhost:5199",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev:web",
    url: "http://localhost:5199",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
