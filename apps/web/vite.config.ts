import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Providencia Ciudadanía Lab",
        short_name: "Ciudadanía Lab",
        description: "Observatorio Ciudadano — Ovalle 2035",
        lang: "es",
        theme_color: "#123a5f",
        background_color: "#123a5f",
        display: "standalone",
        start_url: "/",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,ico,png,woff2}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname === "127.0.0.1" || url.protocol === "https:",
            handler: "NetworkFirst",
            options: { cacheName: "pclab-network", networkTimeoutSeconds: 5 },
          },
        ],
      },
    }),
  ],
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
