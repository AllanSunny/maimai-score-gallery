import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

function escapedPattern(value: string) {
  return [...value]
    .map((character) => "\\^$.*+?()[]{}|".includes(character) ? `\\${character}` : character)
    .join("");
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, ".", "");
  const jacketBaseUrl = environment.VITE_JACKET_BASE_URL?.replace(/\/$/, "");

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: "auto",
        manifest: false,
        workbox: {
          cleanupOutdatedCaches: true,
          globPatterns: ["**/*.{js,css,ico,png,svg,webp,woff,woff2,otf}"],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          navigateFallback: null,
          runtimeCaching: [{
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkOnly" as const,
          }, ...(jacketBaseUrl ? [{
            urlPattern: new RegExp(`^${escapedPattern(jacketBaseUrl)}/`),
            handler: "CacheFirst" as const,
            options: {
              cacheName: "maimai-jackets",
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 90 * 24 * 60 * 60,
                purgeOnQuotaError: true,
              },
            },
          }] : [])],
        },
      }),
    ],
    base: "/maimai-score-gallery/",
    build: {
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => assetInfo.name === "favicon.png"
            ? "assets/favicon.png"
            : "assets/[name]-[hash][extname]",
        },
      },
    },
  };
});
