# GameKit — Agent Guide

GameKit is a pnpm monorepo for a 2D game editor/runtime. The Node CLI owns
project files on disk; a browser-based editor (`apps/editor`) and an MCP
server (`packages/mcp`) talk to it. Two runtimes consume the produced JSON:
`@gamekit/runtime` for Expo/Skia, `@gamekit/runtime-web` for Phaser.

## Layout

- `packages/schema` — Types, `parseScene` / `validateScene` / `validateProject`,
  `createEmptyScene` / `createProject` / `createId` / `slugify` / `*ToJson`.
  Every other package depends on this; build it first.
- `packages/runtime` — React Native + Skia runtime. `GameKitGame` (loop,
  controllers, collisions, animations, timeline) and `GameKitView` (renderer).
  Sub-paths exposed: `./collision`, `./camera`, `./player`, `./animate`,
  `./timeline`, `./scene`, `./manager`.
- `packages/runtime-web` — Phaser runtime. Exports `createGameKitGame`.
- `packages/cli` — `gamekit` binary. Subcommands: `init`, `import <file>`,
  `remove <id>`, `generate [--platform web|mobile]`, `editor [--port]`,
  `export [path] [--platform web|mobile]`, `mcp [project-path]`,
  `skills list|apply <name>`. Source is TS, run via `tsx src/index.ts` in
  dev (the `gamekit` script); the bin resolves to `dist/index.js` after build.
- `packages/mcp` — `@modelcontextprotocol/sdk` server, 34 tools grouped by
  scenes/entities/assets/project/skills/gui/gui-components, plus resources
  and prompts. Skill templates live in `packages/mcp/skills/*.json`
  (platformer, topdown, puzzle).
- `apps/editor` — Vite/React (port 5173). Has a Tauri shell under
  `src-tauri/` that spawns `node packages/cli/dist/index.js editor` against
  the chosen project folder. `lib/api.ts` resolves endpoints to
  `http://127.0.0.1:4177` when running inside Tauri, otherwise uses same-origin
  paths proxied by Vite (see `vite.config.ts`).
- `templates/expo-game`, `templates/web-game` — Starter projects copied by
  `gamekit export`. Each carries a `gamekit/` folder with a sample
  `project.json` + `scenes/` + `assets/`.

A user project lives in `./gamekit/` (relative to its own root):
`gamekit/project.json`, `gamekit/scenes/*.scene.json`,
`gamekit/assets/<file>`, `gamekit/generated/assets.ts` (gitignored, regenerated).

## Commands

All commands run from the repo root. `pnpm` is the package manager
(`packageManager: pnpm@11.3.0` in `package.json`).

```bash
pnpm install                       # workspace install
pnpm build                         # build packages/* then apps/editor
pnpm test                          # build schema+runtime, then vitest run
pnpm typecheck                     # build schema, then tsc --noEmit across packages+apps
pnpm dev:editor                    # vite dev server for apps/editor (port 5173)
pnpm gamekit <subcommand>          # runs @gamekit/cli via tsx
```

Order matters for `pnpm test` and `pnpm typecheck`: the root scripts chain
`@gamekit/schema build` first because downstream packages import from its
`dist/`. The editor server (`pnpm gamekit editor`, default
`http://127.0.0.1:4177`) and the Vite dev server (`pnpm dev:editor`)
communicate via `/api/*` and `/gamekit/assets/*` (Vite proxies both to 4177).

Tauri dev (`apps/editor/src-tauri`): the Tauri lib expects
`packages/cli/dist/index.js` to exist before launching. Always `pnpm build`
first if you intend to use the desktop shell.

## Conventions

- TypeScript strict, `module: NodeNext` for packages, `Bundler` for the
  editor. JSX uses `react-jsx`. Path aliases in `tsconfig.base.json` point
  `@gamekit/schema`, `@gamekit/runtime`, `@gamekit/runtime-web` at
  `packages/<name>/src/index.ts` — for source consumers (e.g. the editor).
  Built packages resolve via `workspace:*` deps.
- All packages use composite TypeScript projects with `declaration` /
  `declarationMap`; sub-path exports in `package.json` point into `dist/`.
- Schema is the contract. The CLI's `writeScene` / `writeProject` reject
  invalid data with actionable errors; the editor's `/api/scene` POST
  returns `{ errors: [...] }` on 400. Don't bypass validation.
- Component type strings are the join key: `Transform`, `Sprite`,
  `AabbCollider`, `PlayerController`, `CameraFollow`, `Animation`. New
  components need additions in `packages/schema/src/index.ts` (types,
  `GameKitComponent` union, validator) and consumers (runtime, editor
  inspector, MCP tools/schemas).
- Asset IDs are kebab-case slugs derived from the file name. The CLI
  regenerates `gamekit/generated/assets.ts` after every import/remove
  (mobile: `require()`, web: `new URL(...).href`). Only image kinds
  (`.png .jpg .jpeg .webp .svg`) are supported in MVP 0.1.
- Editor styling tokens live in `apps/editor/src/styles/_variables.scss`
  (Cyber Cyan `#00f0ff`, Engine Violet `#8b5cf6`, dark base `#06090e`).
  Component partials are imported via `styles.scss` — keep new SCSS in
  that folder and import it from the partial, not from individual
  components.

## Where to look

- Entrypoints: `packages/cli/src/index.ts`, `packages/runtime/src/index.ts`,
  `apps/editor/src/main.tsx` → `App.tsx`, `packages/mcp/src/server.ts`.
- Project file I/O: `packages/cli/src/project.ts` (and `server.ts` for
  HTTP).
- Scene/game loop wiring: `packages/runtime/src/game.tsx`,
  `packages/runtime/src/manager.ts`.
- Editor canvas + selection: `apps/editor/src/components/SceneCanvas.tsx`,
  `apps/editor/src/lib/canvas.ts`.
- MCP tool surface: `packages/mcp/src/tools/*.ts`; matching zod schemas in
  `packages/mcp/src/schemas/`.

## Gotchas

- `pnpm test` rebuilds schema and runtime before running vitest — running
  vitest directly from a package will fail because the package's own
  `dist/` won't exist yet.
- `pnpm build` is the only command that builds `apps/editor`; per-package
  builds skip it.
- `gamekit/export` reads `templates/<expo|web>-game` from the CLI's CWD,
  not from the monorepo root — run it from inside a user project, or set
  up the templates path accordingly.
- The Tauri shell (`apps/editor/src-tauri`) hard-codes the CLI path
  relative to its own `CARGO_MANIFEST_DIR`; restructure the workspace and
  the spawn command breaks.
- `pnpm-workspace.yaml` allow-lists postinstall scripts for
  `@parcel/watcher`, `@shopify/react-native-skia`, `esbuild`, and
  `msgpackr-extract` — adding a new native dep requires editing it.
- `gamekit/generated/assets.ts` is gitignored except under
  `templates/expo-game/gamekit/generated/assets.ts` (committed for the
  starter to work without a `generate` step).
- `brief.md` defines the editor's visual + voice rules; treat it as the
  design source of truth for any UI work in `apps/editor`.
