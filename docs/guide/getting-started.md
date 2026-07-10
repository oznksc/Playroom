# Getting started

## Prerequisites

- Node.js 18+
- pnpm 11
- For desktop: Rust toolchain (Tauri)
- For mobile export: Expo tooling

## Install monorepo

```bash
pnpm install
pnpm build
```

## Create a project

```bash
mkdir my-game && cd my-game
pnpm gamekit init --name "My Game"
```

This creates `gamekit/project.json`, `gamekit/scenes/main.scene.json`, and asset folders.

## Open the editor

```bash
pnpm gamekit editor
# or from monorepo root against a project folder:
# cd path/to/my-game && node path/to/Playroom/packages/cli/dist/index.js editor
```

Browser: open the printed URL (default `http://127.0.0.1:4177`).

Desktop (Tauri):

```bash
pnpm build
cd apps/editor
pnpm exec tauri dev
```

Pick a project folder with a `gamekit/` directory.

## Apply a genre template

In the editor topbar, click **New from template**, or:

```bash
pnpm gamekit skills list
pnpm gamekit skills apply platformer
```

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
```

## Production pack

```bash
pnpm gamekit build --platform mobile
# output: build/gamekit/ with compact JSON + build-manifest.json
```
