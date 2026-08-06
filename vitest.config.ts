import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
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
