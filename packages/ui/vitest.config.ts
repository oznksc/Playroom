import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "happy-dom",
    setupFiles: [path.resolve(__dirname, "../../apps/editor/test/setup.ts")],
    globals: true,
  },
});
