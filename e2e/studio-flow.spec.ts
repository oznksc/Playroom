import { test, expect } from "@playwright/test";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { startEditorServer, type EditorServerHandle } from "../packages/cli/src/server.ts";

const repoRoot = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const studioDist = join(repoRoot, "apps/studio/dist");

let server: EditorServerHandle;

test.beforeAll(async () => {
  server = await startEditorServer({
    root: join(repoRoot, "examples/parity-budget"),
    host: "127.0.0.1",
    port: 0,
    editorDist: studioDist,
  });
});

test.afterAll(async () => {
  if (server) await server.close();
});

test("Studio app loads, displays tabs, and renders project command actions", async ({ page }) => {
  await page.goto(server.url, { waitUntil: "networkidle" });

  await expect(page.getByText("GameKit Studio")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Project" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Agent" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "MCP" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Editor" })).toBeVisible();

  // Project panel buttons
  await expect(page.getByRole("button", { name: "Init" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Validate" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Doctor" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Build" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export" })).toBeVisible();
});

test("Studio tabs switch cleanly between Project, Agent, MCP, and Editor", async ({ page }) => {
  await page.goto(server.url, { waitUntil: "networkidle" });

  // Agent tab
  await page.getByRole("tab", { name: "Agent" }).click();
  await expect(page.getByText("Agent — tool audit log")).toBeVisible();

  // MCP tab
  await page.getByRole("tab", { name: "MCP" }).click();
  await expect(page.getByText("MCP tools")).toBeVisible();

  // Project tab
  await page.getByRole("tab", { name: "Project" }).click();
  await expect(page.getByText("CLI — project commands")).toBeVisible();
});
