import { test, expect } from "@playwright/test";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { startEditorServer, type EditorServerHandle } from "../packages/cli/src/server.ts";

/**
 * Parity budget smoke: the editor Phaser play host must mount the shared
 * parity-lab reference scene without page errors. See docs/guide/parity-budget.md.
 * The scene intentionally includes probes for every schema component so a
 * regression in a divergent component shows up here before a game ships.
 */
const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const editorDist = join(repoRoot, "apps/editor/dist");

let server: EditorServerHandle;

test.beforeAll(async () => {
  server = await startEditorServer({
    root: join(repoRoot, "examples/parity-budget"),
    host: "127.0.0.1",
    port: 0,
    editorDist,
  });
});

test.afterAll(async () => {
  if (server) await server.close();
});

test("parity-lab scene is API-healthy", async ({ request }) => {
  const res = await request.get(`${server.url}/api/doctor`);
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { ok: boolean; summary: { errors: number } };
  expect(body.ok).toBe(true);
  expect(body.summary.errors).toBe(0);

  const proj = await request.get(`${server.url}/api/project`);
  expect(proj.ok()).toBeTruthy();
  const snap = (await proj.json()) as { scenes: string[] };
  expect(snap.scenes).toContain("parity-lab.scene.json");
});

test("Phaser play host mounts parity-lab without page errors", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().startsWith("Failed to load resource")) {
      pageErrors.push(msg.text());
    }
  });
  page.on("response", (res) => {
    // Editor hot-reload poll can fire once before the project loads with an empty file param;
    // the editor treats that 404 as a no-op. Any other 404 (e.g. a missing asset) is a parity signal.
    if (res.status() >= 400) {
      if (res.status() === 404 && res.url().includes("/api/scene/meta?file=")) return;
      pageErrors.push(`${res.status()} ${res.url()}`);
    }
  });

  await page.goto(server.url, { waitUntil: "networkidle" });

  const playToggle = page.getByTestId("play-toggle");
  await expect(playToggle).toBeVisible({ timeout: 45_000 });

  await expect
    .poll(
      async () => {
        return page.evaluate(async () => (await fetch("/api/project")).ok);
      },
      { timeout: 15_000 },
    )
    .toBeTruthy();

  await page.waitForTimeout(500);
  await playToggle.click();

  const host = page.getByTestId("play-runtime-host");
  try {
    await expect(host).toBeVisible({ timeout: 45_000 });
  } catch (err) {
    throw new Error(
      `Play host did not mount for parity-lab.\nPage errors:\n${pageErrors.join("\n") || "(none)"}\nOriginal: ${err}`,
    );
  }

  await expect(host.getByText(/Phaser/i)).toBeVisible();
  await expect(host.locator("canvas").first()).toBeVisible({ timeout: 20_000 });

  await page.waitForTimeout(1000);
  expect(pageErrors).toEqual([]);

  await page.getByTestId("play-stop").click();
  await expect(host).toHaveCount(0, { timeout: 15_000 });
});
