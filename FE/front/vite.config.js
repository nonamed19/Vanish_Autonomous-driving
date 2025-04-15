import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { patchCssModules } from "vite-css-modules";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Vanish",
        short_name: "Vanish",
        icons: [
          {
            src: "/public/vanish_192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/public/vanish_512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
        start_url: "/",
        display: "standalone",
        background_color: "#FCFCFC",
        theme_color: "#012D5E",
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 3000000,
      },
    }),
    patchCssModules(),
  ],
  // define: {
  //   global: "window",
  // },
  assetsInclude: ["**/*.glb", "**/*.gltf"],
  optimizeDeps: {
    include: ["sockjs-client"],
  },

  build: {
    rollupOptions: {
      external: ["stompjs"], // ✅ stompjs는 외부 모듈로 처리
    },
  },
});
