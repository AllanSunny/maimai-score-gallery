import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(() => {
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
          globPatterns: ["**/*.{js,css,ico,png,svg,webp,woff,woff2}"],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          navigateFallback: null,
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
