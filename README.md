<p align="center">
  <img src="./logo.png" alt="Playroom logo" width="120" />
</p>

# Playroom

Playroom is a 2D game editor and runtime for mobile (Expo/Skia) and web (Phaser). It provides a local browser editor, a JSON scene/project schema, CLI tooling, and two renderers.

## Quick Start

```bash
# Install dependencies
pnpm install
pnpm build

# Create a new game project (blank shell)
pnpm gamekit init --name "My Game"

# Or one-command playable game from a genre skill + recipe pack
pnpm gamekit create platformer --name "Jump Quest"
# skills: platformer | topdown | physics-puzzle | topdown-shooter | puzzle | …

# Start the editor
pnpm gamekit editor
# → http://127.0.0.1:4177

# Run tests
pnpm test
pnpm typecheck

# Browser E2E (editor Play host) — once: pnpm test:e2e:install
pnpm test:e2e
```

## Creating a Project

```bash
# Initialize a new project in the current directory
pnpm gamekit init --name "Coin Rush"

# Import image assets (.png .jpg .jpeg .webp .svg)
pnpm gamekit import player.svg
pnpm gamekit import background.png

# Remove an asset
pnpm gamekit remove <asset-id>

# Generate the asset registry (regenerates gamekit/generated/assets.ts)
pnpm gamekit generate --platform web

# Validate project and scenes
pnpm gamekit doctor
pnpm gamekit validate

# Build a deployable pack
pnpm gamekit build --platform web --out build/gamekit
```

## Editor

The editor server runs at `http://127.0.0.1:4177`:

```bash
# Start with default settings
pnpm gamekit editor

# Custom port and host
pnpm gamekit editor --port 4177 --host 0.0.0.0

# Via environment variables
GAMEKIT_EDITOR_PORT=8080 GAMEKIT_EDITOR_HOST=0.0.0.0 pnpm gamekit editor
```

The editor provides entity management, component editing (Transform, Sprite, AABB Collider, Player Controller, Camera Follow, and more), scene settings, timeline, GUI editor, and an AI agent panel.

## Export & Deploy

```bash
# Export as a standalone web project
pnpm gamekit export ./build --platform web

# Export as a mobile (Expo) project
pnpm gamekit export ./build --platform mobile
```

Export copies `gamekit/` (scenes, assets, prefabs) and **generates** the runnable
entrypoint from `project.json` + every `*.scene.json` file:

- Web → `src/main.ts` (Phaser + `SceneManager`, all scenes registered)
- Mobile → `App.tsx` (Expo/Skia + virtual controls on PlayerController scenes)

Adding a scene under `gamekit/scenes/` and listing it in `project.scenes` is
enough — re-export; no hand-wired imports.

The web export produces a standalone Vite project. Run it with:

```bash
cd ./build
pnpm install
pnpm dev     # → http://127.0.0.1:5174
```

## Demo Environment (Docker)

A full demo environment with the editor and a pre-loaded Coin Rush game is available via Docker:

```bash
# Build and start both services
docker compose up -d

# Editor: http://localhost:4177
# Web game: http://localhost:5174

# Start only the editor
docker compose up -d editor

# Start only the web game
docker compose up -d web-demo

# Stop everything
docker compose down

# Remove all data (including demo project changes)
docker compose down -v
```

On first startup, the editor service creates a demo project at `/demo` with the Coin Rush scene and assets — ready to edit and play immediately.

## Sample games

Full multi-scene examples under `examples/` (menu → gameplay → win/lose):

| Example | Genre | Notes |
|---|---|---|
| `examples/simple-coin-jumper` | Platformer | Collect coins, lives, pause/win overlays |
| `examples/top-down-arena` | Top-down | 4-way movement, gems + hazard, portrait |
| `examples/physics-puzzle` | Physics | Knock crates, reach goal, landscape |

```bash
cd examples/top-down-arena   # or physics-puzzle / simple-coin-jumper
pnpm install && pnpm start
# web pack: node ../../packages/cli/dist/index.js export ./build-web --platform web
```

## What is included

| Package | Description |
|---|---|
| `@gamekit/schema` | Shared JSON scene/project contract with Zod validation |
| `@gamekit/runtime` | Expo/Skia runtime (player, camera, collision, timeline, animations) |
| `@gamekit/runtime-web` | Phaser web runtime |
| `@gamekit/cli` | `gamekit` CLI for init, import, export, editor, MCP, doctor, build |
| `@gamekit/editor` | Vite/React browser editor served by the CLI |
| `@gamekit/mcp` | MCP server with 34 tools for AI-assisted game editing |
| `@gamekit/agent` | Agent integration layer |

## Repository Structure

```
apps/editor          Browser editor UI (Vite/React + Tauri)
packages/schema      Zod schemas, validators, and utilities
packages/runtime     Expo/Skia renderer and game loop
packages/runtime-web Phaser renderer
packages/cli         gamekit CLI
packages/mcp         MCP server and tool implementations
packages/agent       Agent providers and routes
templates            Starter projects for web and mobile export
scripts              Utility scripts (Docker entrypoint, etc.)
```

## E2E Ready scope

In scope (ship a small game end-to-end):

- `gamekit create <skill>` — menu shell + gameplay + assets + recipe pack
- Project init, local editor, multi-scene export bootstrap
- JSON scene/project files with Zod validation
- Canvas editing + **Phaser play-in-editor** (export parity)
- Image/audio/font import + generated asset registry
- Expo/Skia and Phaser runtimes; game rules, levels, GUI overlays
- MCP tooling + in-editor agent (BYOK)
- Physics, particles, lights, tilemaps, animations, tweens, paths, scripts
- Sample games under `examples/`

Still evolving (see `ROADMAP.md`):

- Cross-runtime parity budgets and Playwright E2E
- Schema `migrate`, asset atlas packer
- Deeper agent plan/undo/vision polish

## Documentation

See [`docs/`](./docs/index.md):

- [How to ship a game](./docs/guide/shipping-a-game.md)
- [Getting started](./docs/guide/getting-started.md)
- [CLI](./docs/guide/cli.md) · [Editor & agent](./docs/guide/editor-agent.md) · [Schema](./docs/guide/schema.md)

## Contributing

Read `CONTRIBUTING.md` before opening a pull request. The short version:

- Branch from `develop` for code changes.
- Branch from `docs` for documentation work.
- Branch from `examples` for sample projects and templates.
- Keep changes scoped and run `pnpm typecheck`, `pnpm test`, and `pnpm build` when relevant.

See also:

- `BRANCHES.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- `SUPPORT.md`
- `GOVERNANCE.md`

## License

MIT. See `LICENSE`.
