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
      "@gamekit/runtime-web": path.resolve(__dirname, "../../packages/runtime-web/src/index.ts"),
      // Subpath imports used by runtime-web (avoid RN entry of @gamekit/runtime).
      "@gamekit/runtime/manager": path.resolve(__dirname, "../../packages/runtime/src/manager.ts"),
      "@gamekit/runtime/scene": path.resolve(__dirname, "../../packages/runtime/src/scene.ts"),
      "@gamekit/runtime/script": path.resolve(__dirname, "../../packages/runtime/src/script.ts"),
      "@gamekit/runtime/player": path.resolve(__dirname, "../../packages/runtime/src/player.ts"),
      "@gamekit/runtime/input-map": path.resolve(__dirname, "../../packages/runtime/src/input-map.ts"),
      "@gamekit/runtime/gamepad": path.resolve(__dirname, "../../packages/runtime/src/gamepad.ts"),
      "@gamekit/runtime/collision": path.resolve(__dirname, "../../packages/runtime/src/collision.ts"),
      "@gamekit/runtime/tween": path.resolve(__dirname, "../../packages/runtime/src/tween.ts"),
      "@gamekit/runtime/path": path.resolve(__dirname, "../../packages/runtime/src/path.ts"),
      "@gamekit/runtime/timeline": path.resolve(__dirname, "../../packages/runtime/src/timeline.ts"),
      "@gamekit/runtime/particles": path.resolve(__dirname, "../../packages/runtime/src/particles.ts"),
      "@gamekit/runtime/rules-engine": path.resolve(
        __dirname,
        "../../packages/runtime/src/rules-engine.ts",
      ),
      "@gamekit/runtime/clone": path.resolve(__dirname, "../../packages/runtime/src/clone.ts"),
    },
  },
  // Keep React Native out of the web editor bundle (runtime subpaths only).
  optimizeDeps: {
    exclude: ["react-native", "react-native-safe-area-context", "@shopify/react-native-skia"],
    include: ["phaser"],
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
