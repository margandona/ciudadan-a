import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@pclab/shared/*": fileURLToPath(new URL("../../packages/shared/src/$1", import.meta.url)),
      "@pclab/shared": fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url)),
      "@pclab/domain/*": fileURLToPath(new URL("../../packages/domain/src/$1", import.meta.url)),
      "@pclab/domain": fileURLToPath(new URL("../../packages/domain/src/index.ts", import.meta.url)),
      "@pclab/application/*": fileURLToPath(new URL("../../packages/application/src/$1", import.meta.url)),
      "@pclab/application": fileURLToPath(new URL("../../packages/application/src/index.ts", import.meta.url)),
    },
  },
  server: {
    port: 5199,
    strictPort: true,
    host: true,
  },
});
