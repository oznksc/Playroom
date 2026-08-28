import { defineConfig, devices } from "@playwright/test";

/**
 * Browser E2E for the editor play host.
 * Prerequisites: `pnpm build` (schema, cli, editor dist) + `pnpm exec playwright install chromium`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 20_000,
    // Store visual regression snapshots alongside the spec files.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  snapshotDir: "./e2e/snapshots",
  // Auto-generate missing baselines on first run; on CI set UPDATE_SNAPSHOTS=all to refresh.
  updateSnapshots: "missing",
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    ...devices["Desktop Chrome"],
    headless: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
