# Playroom Docs

Playroom is a local, JSON-first 2D game editor and runtime for Expo (Skia) and web (Phaser), with first-class MCP/AI tooling.

## Guides

- [Getting started](./guide/getting-started.md)
- [**How to ship a game**](./guide/shipping-a-game.md) — end-to-end create → edit → play → export
- [CLI reference](./guide/cli.md)
- [Editor & agent](./guide/editor-agent.md)
- [Schema & components](./guide/schema.md)
- [**Cross-runtime parity budget**](./guide/parity-budget.md) — Skia vs Phaser support matrix + deltas

## Quick start

```bash
pnpm install
pnpm build

# Full playable project from a genre skill
pnpm gamekit create platformer --name "Jump Quest"
pnpm gamekit editor
# Play in the editor (Phaser host), then:
pnpm gamekit export ./build --platform web
```

Open `http://127.0.0.1:4177` for the editor (or Tauri desktop after `pnpm build`).

## Samples

| Path | Genre |
|------|--------|
| `examples/simple-coin-jumper` | Platformer |
| `examples/top-down-arena` | Top-down |
| `examples/physics-puzzle` | Physics puzzle |
| `examples/parity-budget` | Parity probe lab (every schema component, both runtimes) |

## Status

See root [`ROADMAP.md`](../ROADMAP.md) for **E2E Ready** baseline and remaining work.
