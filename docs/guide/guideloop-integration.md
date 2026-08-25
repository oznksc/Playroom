# GuideLoop Integration Guide for Playroom

This document records the integration requirements and the fixes needed to make `@guideloop/react` installable, buildable, testable, and reliable in the Playroom editor.

## Current integration

- Package: `@guideloop/react`
- Version currently locked: `2.0.3`
- Consumer: `apps/editor/src/components/EditorTour.tsx`
- Package declaration: `apps/editor/package.json`
- Runtime: React 18, Vite, and the Tauri desktop shell
- Test environment: Vitest with `happy-dom`

GuideLoop is an editor-only dependency. It must remain in the editor workspace and must not be added to the runtime, schema, CLI, or MCP packages.

## Installation requirements

Install from the repository root with the repository's pinned package manager:

```bash
corepack enable
pnpm install --frozen-lockfile
```

Do not install the package with `npm install` or `yarn` inside `apps/editor`. That creates a second dependency tree and can produce different React peer-dependency resolution from the workspace lockfile.

The editor package must declare the dependency explicitly:

```json
{
  "dependencies": {
    "@guideloop/react": "^2.0.3"
  }
}
```

After changing the version, regenerate and commit `pnpm-lock.yaml` from the repository root. CI should use `pnpm install --frozen-lockfile` so an accidental lockfile drift fails early.

## React peer-dependency compatibility

GuideLoop, React, and React DOM must resolve to one compatible React 18 installation. Verify the result with:

```bash
pnpm --filter @gamekit/editor why @guideloop/react
pnpm --filter @gamekit/editor list react react-dom @guideloop/react
```

If more than one React version is installed, align the editor's React and React DOM versions first. Do not solve this by suppressing peer-dependency warnings; duplicate React copies can cause invalid-hook-call errors at runtime.

## Target contract

Every `target` and every `additionalTargets` selector must exist while the tour is open. The current implementation uses `#tour-canvas-tour-anchor` as the primary target and the real UI elements as additional targets. The test must mirror that contract.

The preferred test fixture is:

```ts
const anchor = document.createElement("div");
anchor.id = "tour-canvas-tour-anchor";
document.body.appendChild(anchor);
```

Do not test against `#tour-canvas-stage` as the primary target unless the production step definition is changed to use that selector. A mismatch makes the test pass or fail for the wrong reason and hides missing-target behavior.

Production code should keep stable, semantic tour IDs on the relevant editor controls. Avoid generated IDs, CSS class selectors, or selectors tied to layout implementation details.

## Mounting and browser-only APIs

`GuideLoop` is mounted only after the editor DOM has rendered. The existing `useEditorTour` delay helps with first render, but it is not a substitute for target validation. Before opening the tour, verify that the first target exists, especially when the editor is restored from a project or rendered inside Tauri.

The tour must not access `window`, `document`, or `localStorage` during module evaluation. Browser-only work belongs in event handlers or `useEffect`. The current `try/catch` around `localStorage` access should be retained because private browsing, disabled storage, and some embedded webviews can throw.

For server-side or non-browser consumers, export the tour component only from the editor application and do not import it from shared runtime packages.

## CSS and stacking behavior

GuideLoop's overlay must render above the canvas, floating sheets, top bar, and Tauri webview content. Keep the configured `zIndex` higher than the editor chrome and document any future z-index changes in the editor style tokens.

The spotlight can be clipped or appear offset when an ancestor uses `transform`, `filter`, `contain`, or an unexpected stacking context. If that happens:

1. Inspect the nearest transformed ancestor of the target.
2. Prefer rendering the overlay through a document-level portal.
3. Remove the unnecessary stacking context or raise the portal layer.
4. Verify the result at the minimum supported viewport size and in the Tauri shell.

Do not fix clipping by adding arbitrary z-index values to individual canvas children.

## Test setup

Tests must provide a DOM environment and create the selector required by the step under test. A minimal regression test should cover:

- closed tour renders no tour UI;
- open tour renders without throwing when the target exists;
- missing target is handled without crashing the editor;
- skip, close, and complete all persist `playroom_tour_completed` consistently;
- reopening the tour works after the completion key is cleared.

Run the focused test and the normal project checks:

```bash
pnpm --filter @gamekit/editor test -- EditorTour.test.tsx
pnpm typecheck
pnpm build
```

If the GuideLoop package assumes browser APIs during tests, add a focused mock in the editor test setup rather than globally mocking the package for all tests. Global mocks can hide real integration failures.

## Recommended upstream improvements

The GuideLoop package should make the following guarantees explicit and enforce them in its own test suite:

1. Missing targets must produce a controlled fallback, warning, or skipped step—not an exception that unmounts the application.
2. `additionalTargets` must be optional and ignored safely when one selector is absent.
3. Overlay and tooltip rendering must be portal-based by default, with a documented container override for embedded webviews.
4. The package must be safe to import in non-browser environments; browser API access should happen after mount.
5. React peer dependencies should be declared as a compatible range, with React and React DOM treated consistently.
6. The package should publish complete ESM type declarations and document the exact `Step`, theme, and callback contracts used by the React entry point.
7. Close, skip, and complete callbacks should be distinct events. Consumers should not need to infer the reason from a generic close callback.
8. The package should expose a documented way to refresh target geometry after layout changes, viewport resize, scroll, or canvas zoom.

## Release checklist for the GuideLoop developer

Before publishing a release, validate the package in a clean React 18 + Vite workspace and in a DOM test runner:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
```

Also verify a tour with a missing target, a target inside a transformed container, a narrow viewport, keyboard navigation, and browser storage disabled. Publish a changelog entry for any change to target lookup, portal behavior, peer dependencies, or callback semantics because each can affect existing editor integrations.

## Playroom maintainer checklist

- Keep `@guideloop/react` in `apps/editor/package.json` only.
- Update `pnpm-lock.yaml` with pnpm 11 after dependency changes.
- Keep production selectors and test fixtures synchronized.
- Build schema and runtime before running the repository-wide checks, as required by the root scripts.
- Test both Vite development mode and the built editor/Tauri path before upgrading GuideLoop.

