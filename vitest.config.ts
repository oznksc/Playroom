import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/editor/src"),
      "@gamekit/schema": path.resolve(__dirname, "packages/schema/src/index.ts"),
      "@gamekit/runtime-web": path.resolve(__dirname, "packages/runtime-web/src/index.ts"),
      "@gamekit/runtime/manager": path.resolve(__dirname, "packages/runtime/src/manager.ts"),
      "@gamekit/runtime/scene": path.resolve(__dirname, "packages/runtime/src/scene.ts"),
      "@gamekit/runtime/script": path.resolve(__dirname, "packages/runtime/src/script.ts"),
      "@gamekit/runtime/player": path.resolve(__dirname, "packages/runtime/src/player.ts"),
      "@gamekit/runtime/input-map": path.resolve(__dirname, "packages/runtime/src/input-map.ts"),
      "@gamekit/runtime/gamepad": path.resolve(__dirname, "packages/runtime/src/gamepad.ts"),
      "@gamekit/runtime/collision": path.resolve(__dirname, "packages/runtime/src/collision.ts"),
      "@gamekit/runtime/tween": path.resolve(__dirname, "packages/runtime/src/tween.ts"),
      "@gamekit/runtime/path": path.resolve(__dirname, "packages/runtime/src/path.ts"),
      "@gamekit/runtime/timeline": path.resolve(__dirname, "packages/runtime/src/timeline.ts"),
      "@gamekit/runtime/particles": path.resolve(__dirname, "packages/runtime/src/particles.ts"),
      "@gamekit/runtime/rigid-body": path.resolve(__dirname, "packages/runtime/src/rigid-body.ts"),
      "@gamekit/runtime/rules-engine": path.resolve(__dirname, "packages/runtime/src/rules-engine.ts"),
      "@gamekit/runtime/clone": path.resolve(__dirname, "packages/runtime/src/clone.ts"),
      "@gamekit/runtime/gui": path.resolve(__dirname, "packages/runtime/src/gui.ts"),
      "@gamekit/runtime/gestures": path.resolve(__dirname, "packages/runtime/src/gestures.ts"),
      "@gamekit/runtime/spatial-audio": path.resolve(__dirname, "packages/runtime/src/spatial-audio.ts"),
      "@gamekit/runtime/light": path.resolve(__dirname, "packages/runtime/src/light.ts"),
      "@gamekit/runtime/simulate": path.resolve(__dirname, "packages/runtime/src/simulate.ts"),
      "@gamekit/runtime/rng": path.resolve(__dirname, "packages/runtime/src/rng.ts"),
      "@gamekit/runtime": path.resolve(__dirname, "packages/runtime/src/index.ts"),
    },
  },
  test: {
    environmentMatchGlobs: [
      ["apps/editor/**", "happy-dom"],
    ],
    setupFiles: [
      path.resolve(__dirname, "apps/editor/test/setup.ts"),
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      // Playwright owns these — vitest must not collect *.spec.ts under e2e/.
      "e2e/**",
    ],
  },
});
