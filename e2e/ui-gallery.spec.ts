import { test, expect } from "@playwright/test";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { startEditorServer, type EditorServerHandle } from "../packages/cli/src/server.ts";

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

test("UI Gallery renders all canonical design system cards and primitives", async ({ page }) => {
  await page.goto(`${server.url}/?view=ui-gallery`, { waitUntil: "networkidle" });

  await expect(page.getByText("UI Component Gallery")).toBeVisible();
  await expect(page.getByText("Button Variants")).toBeVisible();
  await expect(page.getByText("Button Sizes & States")).toBeVisible();
  await expect(page.getByText("Icon Buttons & Tooltips")).toBeVisible();
  await expect(page.getByText("Button Groups & Toolbar")).toBeVisible();
  await expect(page.getByText("Range Slider & Color Control")).toBeVisible();
  await expect(page.getByText("Selectable Cards")).toBeVisible();
  await expect(page.getByText("Normalized Async States")).toBeVisible();
  await expect(page.getByText("Radix Select & SimpleSelect")).toBeVisible();
  await expect(page.getByText("Radix Accordion & Sections")).toBeVisible();
  await expect(page.getByText("Segmented Controls")).toBeVisible();
  await expect(page.getByText("Radix Tabs Navigation")).toBeVisible();
  await expect(page.getByText("Radix Switch & Checkbox")).toBeVisible();
});
