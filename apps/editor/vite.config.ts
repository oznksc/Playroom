import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Prefer live schema source so touchControl (fire/action) stays in sync during dev.
      "@gamekit/schema": path.resolve(__dirname, "../../packages/schema/src/index.ts"),
    },
  },
  // Keep React Native out of the web editor bundle (runtime subpaths only).
  optimizeDeps: {
    exclude: ["react-native", "react-native-safe-area-context", "@shopify/react-native-skia"],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:4177",
      "/gamekit": "http://127.0.0.1:4177",
    },
  },
});
