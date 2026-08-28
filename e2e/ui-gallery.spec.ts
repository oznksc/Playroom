import { test, expect } from "@playwright/test";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { startEditorServer, type EditorServerHandle } from "../packages/cli/src/server.ts";
import AxeBuilder from "@axe-core/playwright";

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

test("UI Gallery: interactive primitives have required ARIA attributes", async ({ page }) => {
  await page.goto(`${server.url}/?view=ui-gallery`, { waitUntil: "networkidle" });

  // All <button> elements should have accessible text (name from content, aria-label, or title)
  const buttons = page.locator("button:visible");
  const buttonCount = await buttons.count();
  for (let i = 0; i < Math.min(buttonCount, 20); i++) {
    const btn = buttons.nth(i);
    const name = await btn.evaluate(
      (el) => el.getAttribute("aria-label") ?? el.getAttribute("title") ?? el.textContent?.trim()
    );
    expect(name, `button[${i}] must have an accessible name`).toBeTruthy();
  }
});

test("UI Gallery: no critical axe accessibility violations", async ({ page }) => {
  await page.goto(`${server.url}/?view=ui-gallery`, { waitUntil: "networkidle" });

  const results = await new AxeBuilder({ page })
    // In showcase gallery, preview snippets use unattached mock labels
    .disableRules(["color-contrast", "aria-valid-attr-value", "label", "button-name"])
    .analyze();

  // Filter to critical + serious violations only
  const blocking = results.violations.filter((v) =>
    ["critical", "serious"].includes(v.impact ?? "")
  );

  if (blocking.length > 0) {
    const summary = blocking
      .map((v) => `  [${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`)
      .join("\n");
    throw new Error(`axe found ${blocking.length} critical/serious violation(s):\n${summary}`);
  }
});

test("UI Gallery: visual regression baseline", async ({ page }) => {
  await page.goto(`${server.url}/?view=ui-gallery`, { waitUntil: "networkidle" });
  // Allow a 2 % pixel difference to accommodate sub-pixel anti-aliasing variance.
  await expect(page).toHaveScreenshot("ui-gallery-full.png", { maxDiffPixelRatio: 0.02 });
});
