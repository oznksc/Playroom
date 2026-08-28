import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@gamekit/ui": path.resolve(__dirname, "../../packages/ui/src/index.ts"),
      "@gamekit/ui/*": path.resolve(__dirname, "../../packages/ui/src/*"),
      "@gamekit/schema": path.resolve(__dirname, "../../packages/schema/src/index.ts"),
      "@gamekit/mcp": path.resolve(__dirname, "../../packages/mcp/src/index.ts"),
    },
  },
  test: {
    environment: "happy-dom",
    setupFiles: [path.resolve(__dirname, "../editor/test/setup.ts")],
    globals: true,
  },
});
