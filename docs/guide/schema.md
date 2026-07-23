# Schema & components

Playroom scenes are JSON validated by `@gamekit/schema`.

## Core components

| Type | Role |
|------|------|
| `Transform` | Position, rotation, scale (required) |
| `Sprite` | Image render |
| `AabbCollider` / `CircleCollider` / `PolygonCollider` | Collision |
| `RigidBody` | Velocity, mass, gravity scale |
| `PlayerController` | Move / jump |
| `CameraFollow` | Camera target |
| `Animation` | Spritesheet frames |
| `Tilemap` | Grid tiles + tileset |
| `Text` | World-space label (`fontAssetId` empty = system font) |
| `AudioSource` / `AudioListener` | Audio |
| `Tween` / `FollowPath` | Motion helpers |
| `StateMachine` / `Script` | Behavior |
| `ParticleSystem` | Lightweight particle emitter |

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

Factories: `createMenuScene`, `createSettingsScene`, `createDefaultGuiComponents`, `createStarterGameplayScene`, `createDefaultMenuTransitions` (`@gamekit/schema`).

## Skills

JSON templates under `packages/mcp/skills/*.json` expand into full scenes via `apply_skill` / `gamekit skills apply`.

Composable recipes under `packages/mcp/recipes/{effects,mechanics,scripts,animations,gestures}/` patch entities or scene input maps via `apply_recipe` / `gamekit recipes apply`.
