import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./apps/web/src", import.meta.url)),
      "@pclab/shared/*": fileURLToPath(new URL("./packages/shared/src/$1", import.meta.url)),
      "@pclab/shared": fileURLToPath(new URL("./packages/shared/src/index.ts", import.meta.url)),
      "@pclab/domain/*": fileURLToPath(new URL("./packages/domain/src/$1", import.meta.url)),
      "@pclab/domain": fileURLToPath(new URL("./packages/domain/src/index.ts", import.meta.url)),
      "@pclab/application/*": fileURLToPath(new URL("./packages/application/src/$1", import.meta.url)),
      "@pclab/application": fileURLToPath(new URL("./packages/application/src/index.ts", import.meta.url)),
      "@pclab/infrastructure/*": fileURLToPath(new URL("./packages/infrastructure/src/$1", import.meta.url)),
      "@pclab/infrastructure": fileURLToPath(new URL("./packages/infrastructure/src/index.ts", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/web/src/**/*.test.ts", "tests/rules/**/*.test.ts", "tests/integration/**/*.test.ts"],
    testTimeout: 20000,
    hookTimeout: 60000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["packages/domain/src/**/*.ts", "packages/application/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/test-fixtures.ts", "**/index.ts"],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
      },
    },
  },
});
