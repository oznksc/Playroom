# Getting started

## Prerequisites

- Node.js 18+
- pnpm 11
- For desktop editor shell: Rust toolchain (Tauri)
- For mobile export: Expo tooling

## Install monorepo

```bash
pnpm install
pnpm build
```

## Create a project

### Fastest path (recommended)

```bash
mkdir my-game && cd my-game
pnpm gamekit create platformer --name "My Game"
```

Creates a **menu + settings + gameplay** shell, copies skill assets, applies
genre recipes (input map, win rules), and regenerates `gamekit/generated/assets.ts`.

List genres:

```bash
pnpm gamekit skills list
```

### Blank shell only

```bash
pnpm gamekit init --name "My Game"
```

This creates `gamekit/project.json`, menu/settings/main scenes, and asset folders.
Add gameplay later with `pnpm gamekit skills apply <skill> --wire-shell`.

## Open the editor

```bash
pnpm gamekit editor
```

Browser: open the printed URL (default `http://127.0.0.1:4177`).

**Play** uses the real Phaser runtime host (same stack as web export).

Desktop (Tauri):

```bash
pnpm build
cd apps/editor
pnpm exec tauri dev
```

Pick a project folder with a `gamekit/` directory.

## Menu shell

| File | Role |
|------|------|
| `scenes/menu.scene.json` | Start menu (Play, Settings) |
| `scenes/settings.scene.json` | Settings + Back |
| `scenes/<skill>.scene.json` | Gameplay (`create` / skill apply) |
| `project.json` → `guiComponents` | HUD, Pause, Game Over, You Win |
| `project.activeScene` | Usually `menu.scene.json` |

## Health check

```bash
pnpm gamekit doctor
pnpm gamekit validate
```

## Export

```bash
pnpm gamekit export ./build --platform mobile
# or
pnpm gamekit export ./build --platform web
cd ./build && pnpm install && pnpm dev   # web
```

Entrypoints (`App.tsx` / `src/main.ts`) are **generated** from all scenes — no
manual imports.

## Production data pack

```bash
pnpm gamekit build --platform mobile
# output: build/gamekit/ with compact JSON + build-manifest.json
```

## Next

Full release checklist: [How to ship a game](./shipping-a-game.md).
