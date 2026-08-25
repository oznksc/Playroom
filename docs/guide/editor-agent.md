# Editor & agent

## Layout

- **Hierarchy** — entities
- **Scenes** — scene files (active badge)
- **Prefabs** — save selection / spawn
- **Levels** — order, unlock, scene assignment
- **Agent** — natural-language scene building

## Play mode

The Play control runs the real Phaser host (`@gamekit/runtime-web`) in the canvas stage. Telemetry shows FPS, frame time, entity count, and draw calls. Toggle the profiler overlay (`` ` `` or the activity button) for display-list breakdown, physics bodies, textures, and sparklines.

## Scenes

Open scenes as tabs (Scenes panel or command palette). Split left/right or top/bottom to view two scenes. The focused pane owns inspector, undo, and Play.

## Tile paint

Add a **Tilemap** component, then B brush / X erase / G fill / T rect / I eyedropper (Alt-click also picks). The palette shows tileset thumbnails, brush size 1–3 (`[` `]`), and a live ghost on the grid. A paint stroke is a single undo step.

## Collider gizmos

View → Colliders draws solids (green) vs triggers (blue, hatched, inward ticks), static hatch, layer/mask badges, selected dimensions, and rigid-body velocity.

## Agent (BYOK)

1. Open Agent → Settings
2. Connect a provider
   - **Desktop (Tauri):** keys stored in OS keychain
   - **Browser:** encrypted with a passphrase in localStorage
3. Chat or use slash commands: `/plan`, `/execute`, `/screenshot`, `/help`

The agent receives prior turns in this scene (so `/execute` can run a plan) plus a scene summary with entity ids and positions. Destructive tools require approval (default: destructive-only).

Prefer describing the whole level to the agent; use the canvas afterward for pixel nudges without extra tokens.

## Hot-reload

When idle (not dirty, not playing), the editor polls scene mtime and reloads external changes (e.g. agent tool writes).
