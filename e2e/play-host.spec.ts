import { test, expect } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createGameFromSkill } from "../packages/cli/src/project.ts";
import { startEditorServer, type EditorServerHandle } from "../packages/cli/src/server.ts";

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const editorDist = join(repoRoot, "apps/editor/dist");

let projectRoot: string;
let server: EditorServerHandle;

test.beforeAll(async () => {
  projectRoot = await mkdtemp(join(tmpdir(), "playroom-e2e-"));
  await createGameFromSkill(projectRoot, "platformer", {
    name: "Playwright Demo",
    platform: "web",
  });
  server = await startEditorServer({
    root: projectRoot,
    host: "127.0.0.1",
    port: 0,
    editorDist,
  });
});

test.afterAll(async () => {
  if (server) await server.close();
  if (projectRoot) await rm(projectRoot, { recursive: true, force: true });
});

test("API doctor is healthy for create platformer project", async ({ request }) => {
  const res = await request.get(`${server.url}/api/doctor`);
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { ok: boolean; summary: { errors: number } };
  expect(body.ok).toBe(true);
  expect(body.summary.errors).toBe(0);
});

test("API project snapshot includes menu + platformer scenes", async ({ request }) => {
  const res = await request.get(`${server.url}/api/project`);
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { scenes: string[]; project: { activeScene?: string } };
  expect(body.scenes).toEqual(
    expect.arrayContaining(["menu.scene.json", "platformer.scene.json"]),
  );
  expect(body.project.activeScene).toBe("menu.scene.json");
});

test("editor loads and Phaser play host mounts / stops", async ({ page }) => {
  // Capture page errors for debugging failed CI runs
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") pageErrors.push(msg.text());
  });

  await page.goto(server.url, { waitUntil: "networkidle" });

  const playToggle = page.getByTestId("play-toggle");
  await expect(playToggle).toBeVisible({ timeout: 45_000 });

  // Wait until the active scene is loaded via API-backed refresh (project GET succeeds).
  await expect
    .poll(async () => {
      return page.evaluate(async () => {
        try {
          const r = await fetch("/api/project");
          return r.ok;
        } catch {
          return false;
        }
      });
    }, { timeout: 15_000 })
    .toBeTruthy();

  // Give React a beat to hydrate scene state after first fetch
  await page.waitForTimeout(500);

  await playToggle.click();

  const host = page.getByTestId("play-runtime-host");
  try {
    await expect(host).toBeVisible({ timeout: 45_000 });
  } catch (err) {
    throw new Error(
      `Play host did not mount.\nPage errors:\n${pageErrors.join("\n") || "(none)"}\nOriginal: ${err}`,
    );
  }

  await expect(host.getByText(/Phaser/i)).toBeVisible();
  await expect(host.locator("canvas").first()).toBeVisible({ timeout: 20_000 });

  await page.getByTestId("play-stop").click();
  await expect(host).toHaveCount(0, { timeout: 15_000 });
});
