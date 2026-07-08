# Playroom — Detailed Testing Strategy and QA Guide

This document defines the testing standards and quality assurance procedures for the Playroom monorepo, ensuring project integrity, regression safety, and cross-platform rendering parity.

---

## 1. Testing Pyramid and Strategy Overview

Playroom employs a tiered testing strategy tailored to package layers and dependencies.

| Test Tier | Scope | Tooling | Run Frequency |
| --- | --- | --- | --- |
| **Unit Testing** | Zod schemas, CLI reading/writing operations, isolated MCP tool logic, utility functions. | `vitest` | Every commit / locally and CI |
| **Integration Testing** | Physics timestep determinism, camera bounds, animation state transitions, MCP stdio clients. | `vitest` | PR creation and CI |
| **End-to-End (E2E) UI** | Editor workspace views, drag-and-drop actions, inspector input fields, Play-in-Editor cycles. | `Playwright` | CI / Nightly |
| **Visual Parity Regression**| Pixel-by-pixel comparisons between Expo/Skia and Phaser rendering engines. | `pixelmatch` + `Playwright` | Pre-release / Nightly |
| **Load & Performance** | 1000+ moving entity stress scenes, frame rate drop tracking, Garbage Collection leaks. | Custom Profiler CLI | Pre-release |

---

## 2. Unit Testing Standards & Mock Examples

Unit tests target isolated logical parts of `@gamekit/schema`, `@gamekit/mcp`, and `@gamekit/cli`.

### Schema Validation Golden Test Template (`@gamekit/schema`)
Any changes to schema structures must verify backward compatibility. Zod validator testing structure:

```typescript
// packages/schema/test/golden-schema.test.ts
import { describe, expect, it } from "vitest";
import { validateScene, createEmptyScene } from "../src/index.js";

describe("Golden Scene Schema Tests", () => {
  it("should validate default empty scene structure", () => {
    const scene = createEmptyScene("Golden Level");
    const result = validateScene(scene);
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.schemaVersion).toBe(1);
      expect(result.value.entities).toEqual([]);
    }
  });

  it("should fail validation for invalid properties", () => {
    const brokenScene = {
      schemaVersion: "invalid-version", // cannot be string
      id: "broken-level",
      viewport: { width: -100, height: 844 } // width cannot be negative
    };
    
    const result = validateScene(brokenScene as any);
    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors).toContain("viewport.width must be a positive number");
  });
});
```

---

## 3. Integration Testing

Integration tests verify interactions between several modules, such as physics ticking against step updates.

### Physics Determinism Test
Verify that physics computations yield identical coordinates across different frame rate ticks (substepping):

```typescript
// packages/runtime/test/physics-integration.test.ts
import { describe, expect, it } from "vitest";
import { PhysicsWorld } from "../src/collision/world.js";

describe("Physics Integration", () => {
  it("should integrate with fixed dt (1/60) deterministically", () => {
    const worldA = new PhysicsWorld({ gravity: { x: 0, y: 9.8 } });
    const worldB = new PhysicsWorld({ gravity: { x: 0, y: 9.8 } });

    // World A: simulate 1 tick at 60 FPS
    worldA.step(1 / 60);

    // World B: simulate 2 sub-ticks at 120 FPS
    worldB.step(1 / 120);
    worldB.step(1 / 120);

    // The final positions of bodies in both worlds must match exactly
    expect(worldA.getBodyPosition("test-id")).toBeCloseTo(worldB.getBodyPosition("test-id"), 5);
  });
});
```

---

## 4. End-to-End (E2E) UI Testing with Playwright

E2E tests check live communication between the Vite editor front-end and the local Node CLI on port 4177.

### Playwright Config (`apps/editor/playwright.config.ts`)
```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "pnpm dev:editor",
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm gamekit editor --port 4177",
      port: 4177,
      reuseExistingServer: !process.env.CI,
    }
  ],
});
```

### Sample E2E UI Test Case (`apps/editor/e2e/editor-flow.spec.ts`)
```typescript
import { test, expect } from "@playwright/test";

test.describe("Playroom Editor UI Flow", () => {
  test("should load workspace and add a new entity", async ({ page }) => {
    // 1. Visit Editor Panel
    await page.goto("/");
    await expect(page.locator("canvas")).toBeVisible();

    // 2. Click 'Add Entity' in sidebar drawer
    const addEntityBtn = page.locator("#add-entity-btn");
    await addEntityBtn.click();

    // 3. Fill details
    const nameInput = page.locator("#entity-name-input");
    await nameInput.fill("Test Player");
    await page.keyboard.press("Enter");

    // 4. Verify inspector updates
    const inspectorTitle = page.locator("#inspector-entity-title");
    await expect(inspectorTitle).toHaveValue("Test Player");

    // 5. Query local CLI API to assert write operations worked
    const response = await page.request.get("http://localhost:4177/api/scene/main.scene.json");
    const sceneData = await response.json();
    const playerExists = sceneData.entities.some((e: any) => e.name === "Test Player");
    expect(playerExists).toBe(true);
  });
});
```

---

## 5. Visual Regression & Cross-Platform Parity

Compare Expo/Skia (Mobile) and Phaser (Web) canvas render outputs side-by-side to guarantee visual parity.

```
       [ Scene JSON ]
         /        \
        v          v
   [Expo/Skia]   [Phaser/Web]
        |          |
    (Screenshot) (Screenshot)
        \          /
         v        v
     [ pixelmatch (Diff) ] ---> Success/Failure Report
```

### Pixel Diff Comparison Helper Code
```typescript
import fs from "fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

export function compareScreenshots(img1Path: string, img2Path: string, diffPath: string): number {
  const img1 = PNG.sync.read(fs.readFileSync(img1Path));
  const img2 = PNG.sync.read(fs.readFileSync(img2Path));
  const { width, height } = img1;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 }
  );

  fs.writeFileSync(diffPath, PNG.sync.write(diff));
  return numDiffPixels; // returns total mismatched pixel count
}
```

---

## 6. Performance & Load Budget Thresholds

Verify frame rate stability on resource-heavy scenes.

- **Metric Budgets:**
  - **1000 Entity Run:** Spawning 1000 active bodies with AABB collision loops must complete updates in under **16.6ms** (60 FPS).
  - **GC Memory Leak test:** Running the simulation (PIE) continuously for 10 minutes must not exceed a 15% increase in total JS heap allocation.

---

## 7. CI/CD Pipeline (GitHub Actions Workflows)

Trigger automated quality controls on every Pull Request or push target branch:

```yaml
name: Playroom CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  quality-assurance:
    runs-on: macos-latest # Chosen for Expo/iOS environment compatibility

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 11.3.0

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: TypeScript Typecheck
        run: pnpm typecheck

      - name: Run Unit & Integration Tests
        run: pnpm test

      - name: Install Playwright Browsers
        run: pnpm exec playwright install --with-deps

      - name: Run E2E UI Tests
        run: pnpm exec playwright test
```

---

## 8. QA & Pre-release Checklist

Confirm the following before tag publishing or release builds:

- [ ] **Tests are Green:** All Vitest unit/integration tests and Playwright E2E suites pass.
- [ ] **Golden Schemas match:** Zod validations confirm forward-compatibility of sample scene JSON files.
- [ ] **CLI Doctor passes:** Running `gamekit doctor` displays clean dependency/asset statuses.
- [ ] **MCP schemas aligned:** Model prompt inputs match Playroom's 34 actual MCP tools.
- [ ] **Platform parity check:** Skia and Phaser canvas render comparisons show 0 pixel mismatches.
