# Schema & components

Playroom scenes are JSON validated by `@gamekit/schema`.

## Core components

| Type | Role |
|------|------|
| `Transform` | Position, rotation, scale (required) |
| `Sprite` | Image render |
| `AabbCollider` / `CircleCollider` / `PolygonCollider` | Collision — shared SAT core on both runtimes: static polygon solids resolve against dynamic AABB/circle bodies every frame (AABB vs polygon uses the polygon's bounding box, matching Skia; circle vs polygon uses true convex SAT). Rotation/scale apply to polygon points; concave shapes ghost. |
| `RigidBody` | Velocity, mass, gravity scale |
| `PlayerController` | Move / jump — shared feel model on both runtimes: `speed` (with air control damping airborne), `jumpVelocity` (edge-triggered + jump buffering + coyote grace window), `gravity`; top-down 4-way when `gravity === 0`. |
| `CameraFollow` | Camera target — `smoothing` is a per-frame exponential lerp factor (0–1, higher = snappier; e.g. 0.18 default) |
| `Animation` | Spritesheet frames |
| `Tilemap` | Grid tiles + tileset |
| `NineSlice` | Stretch-9 panel — rendered on both runtimes: corners stay source-sized, edges stretch one axis, the center stretches both |
| `Text` | World-space label (`fontAssetId` empty = system font) |
| `AudioSource` / `AudioListener` | Audio — `AudioSource` plays `assetId` with `volume`/`loop`/`playOnStart` plus optional `minDistance`/`maxDistance`; `AudioListener` (with `enabled`) sets the listening position from its `Transform`. Spatial model shared by both runtimes: linear gain rolloff from `minDistance` to `maxDistance` + stereo pan from horizontal offset. No listener → authored volume, centered. |
| `Tween` / `FollowPath` | Motion helpers |
| `StateMachine` / `Script` | Behavior |
| `ParticleSystem` | Lightweight particle emitter |
| `Light2D` | Additive light — `point` (radial glow) or `spot` (cone along Transform rotation), `range`/`intensity`/`color` |

## Project file

`gamekit/project.json` holds:

- `scenes[]`, `levels[]`, `assets[]`
- optional `activeScene`, `transitions[]`
- `guiComponents[]`

## Starter menu GUI actions

`Button.action` is a **script event name**. Controllers (entities with `Script`) handle:

| Event | Typical action |
|-------|----------------|
| `startGame` | `switchScene` → `main` |
| `openSettings` | `switchScene` → `settings` |
| `backToMenu` | `switchScene` → `menu` |
| `resumeGame` | Unpause (host-defined) |
| `restartLevel` / `retryGame` | Reload main |
| `nextLevel` | `nextLevel` progression |

## Script events

A `Script` component's `handlers[]` bind an event name to actions. Hosts dispatch:

| Event | When |
|-------|------|
| `start` | On scene mount, once |
| `update` | Every frame, with `dt` (seconds) on the script context — both runtimes + headless simulation |
| `triggerEnter` / `onTriggerEnter` | When a collider with `isTrigger` overlaps the player |
| `collisionEnter` | When a body hits a solid (Skia only) |
| `onStart` | Rules-engine `onStart` hook (rules actions) |
| `tap` / `longPress` / `pinch` / `swipeUp` / `swipeDown` / `swipeLeft` / `swipeRight` | Pointer gestures recognized by the shared recognizer on both runtimes |

`Button.action` (see table above) is any custom event name — the same `evaluateScriptEvent`
path is used, so GUI buttons can trigger any of the same actions.

Factories: `createMenuScene`, `createSettingsScene`, `createDefaultGuiComponents`, `createStarterGameplayScene`, `createDefaultMenuTransitions` (`@gamekit/schema`).

## Skills

JSON templates under `packages/mcp/skills/*.json` expand into full scenes via `apply_skill` / `gamekit skills apply`.

Composable recipes under `packages/mcp/recipes/{effects,mechanics,scripts,animations,gestures}/` patch entities or scene input maps via `apply_recipe` / `gamekit recipes apply`.
