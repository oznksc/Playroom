# Editor & agent

## Layout

- **Hierarchy** — entities
- **Scenes** — scene files (active badge)
- **Prefabs** — save selection / spawn
- **Levels** — order, unlock, scene assignment
- **Agent** — natural-language scene building

## Play mode

Topbar Play runs a fixed-timestep physics simulation in the canvas (not the full Skia/Phaser host yet). Telemetry shows real FPS, frame time, and entity count.

## Tile paint

Add a **Tilemap** component, select paint/erase tools, use the bottom palette (tiles 0–15).

## Agent (BYOK)

1. Open Agent → Settings
2. Connect a provider
   - **Desktop (Tauri):** keys stored in OS keychain
   - **Browser:** encrypted with a passphrase in localStorage
3. Chat or use slash commands: `/plan`, `/execute`, `/screenshot`, `/help`

Destructive tools require approval (default: destructive-only).

## Hot-reload

When idle (not dirty, not playing), the editor polls scene mtime and reloads external changes (e.g. agent tool writes).
