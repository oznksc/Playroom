# Playroom — Roadmap

Tracks progress from MVP toward a production-ready, AI-native 2D game engine.
Schema is the contract; runtime, editor, CLI, and MCP evolve together.

**Language:** This document is English-only (project convention).

---

## Current status (E2E Ready baseline)

Playroom can ship a full small game without hand-wiring entrypoints:

| Capability | Status |
|---|---|
| Schema-driven scenes + validation | Done |
| Physics (AABB / circle / polygon, RigidBody, triggers, raycast) | Done |
| Game rules (lives, collect, reach, hazards, win/lose) | Done |
| Multi-scene shell (menu / settings / gameplay + GUI) | Done |
| Input (action map, virtual controls, gamepad, gestures, top-down 4-way) | Done |
| Export multi-scene bootstrap (`App.tsx` / `main.ts` generated) | Done |
| Play-in-editor = real Phaser host (`@gamekit/runtime-web`) | Done |
| One-command genre games (`gamekit create <skill>`) | Done |
| Sample games (platformer, top-down, physics puzzle) | Done |
| CLI: doctor, build, dev, export, skills, recipes | Done |
| MCP tools + in-editor agent (BYOK) | Done (polish ongoing) |

**How to ship a game:** see [`docs/guide/shipping-a-game.md`](./docs/guide/shipping-a-game.md).

---

## E2E Ready milestone (completed)

Workstreams that closed the “can we make end-to-end games?” gap:

### Sprint A — Export multi-scene bootstrap — **done**

- [x] Generate web `src/main.ts` and mobile `App.tsx` from `project.json` + all scenes
- [x] No hand-wired scene imports after export
- [x] Prefabs copied on export; transition duration seconds → ms
- [x] Tests: `packages/cli/test/export-bootstrap.test.ts`

### Sprint B — Full sample games — **done**

- [x] `examples/simple-coin-jumper` (existing platformer reference)
- [x] `examples/top-down-arena` (portrait, gems + hazard, 4-way move)
- [x] `examples/physics-puzzle` (landscape, crates + goal)
- [x] Runtime top-down: `PlayerController` gravity 0 → free 4-way + input map `move_up` / `move_down`

### Sprint C — Real play-in-editor host — **done**

- [x] Editor play uses Phaser via `PlayRuntimeHost` + `@gamekit/runtime-web`
- [x] Pause / stop / remount on `switchScene`; lives + win/lose callbacks
- [x] Export-parity physics/rules/GUI in the editor canvas stage

### Sprint D — One-command skill → game — **done**

- [x] `gamekit create <skill-id>`: init shell → skill scene → assets → recipes → registry
- [x] Skill packs (`skill-packs.ts`): platformer, topdown, physics-puzzle, …
- [x] Enhanced `skills apply` (+ optional `--wire-shell`)
- [x] Tests: `packages/cli/test/create-skill.test.ts`

### Sprint E — Docs & roadmap refresh — **done**

- [x] This roadmap rebased to reality (English)
- [x] Shipping guide + getting-started updates

---

## Implemented core (reference)

### Physics & collision

- [x] AABB, Circle, Polygon colliders; layers/masks; triggers
- [x] RigidBody + fixed timestep; sleeping bodies; raycast
- [x] Collision / trigger enter-exit events

### Components & systems

- [x] Transform, Sprite, Animation, CameraFollow, PlayerController
- [x] Tilemap, Text, AudioSource / AudioListener
- [x] ParticleSystem, Light2D, NineSlice
- [x] StateMachine, Script (JSON DSL actions), Tween, FollowPath
- [x] Game rules engine + level progression + save payload schema

### Input & devices

- [x] Input action map (keys / touch / gamepad bindings)
- [x] Virtual joystick + action buttons
- [x] Gamepad API poll; gesture recognizer helpers
- [x] Top-down four-direction when `PlayerController.gravity === 0`

### Scene management & data

- [x] SceneManager (switch / next / levels / persistent vars)
- [x] Save/load slots (web localStorage + project-side CLI saves)
- [x] Prefabs (schema + CLI/API + export copy)
- [x] Project transitions + activeScene

### Editor

- [x] Canvas-first floating chrome; entity/component inspectors
- [x] Play / pause / stop with Phaser host
- [x] GUI editor, timeline panel, console, undo hook
- [x] Hot-reload poll for external scene edits
- [x] Agent panel (BYOK) over MCP tools
- [ ] Richer gizmos (collider/trigger debug polish)
- [ ] Full tile palette paint UX polish
- [ ] Split multi-scene tabs
- [ ] Profiler overlay (FPS exists in play; draw-call deep dive open)

### CLI & DX

- [x] `init`, `import`, `remove`, `generate`, `editor`, `export`
- [x] `create <skill>`, `skills list|apply`, `recipes list|describe|apply`
- [x] `doctor`, `validate`, `build`, `dev`
- [x] `save` / `load` / `list-saves`, `mcp`
- [ ] `migrate <from> <to>` schema upgrades
- [ ] Texture atlas / audio bank packer
- [ ] HTTPS / mTLS editor binding (host/port already exist)

### Testing & quality

- [x] Schema tests + golden-style coverage growth
- [x] Runtime tests (collision, rules, input, simulate, perf budget)
- [x] MCP tool tests under `packages/mcp/test/`
- [x] CLI tests (project, doctor, export, create, recipes, prefabs)
- [x] Headless pipeline: create → doctor → simulate → export (`e2e-pipeline.test.ts`)
- [x] Playwright E2E: editor → Phaser play host → stop (`e2e/play-host.spec.ts`, `pnpm test:e2e`)
- [x] CI workflow (unit + Playwright Chromium)
- [ ] Editor unit tests (RTL for canvas/inspector)
- [ ] Deterministic RNG + snapshot suite expansion

### Content

- [x] Genre skills: platformer, topdown, physics-puzzle, topdown-shooter, puzzle, endless-runner, arena-brawler, …
- [x] Recipe catalog: effects, mechanics, scripts, animations, gestures
- [x] Examples under `examples/`
- [x] Project wizard surface in editor (templates)
- [ ] More shipped sample genres (tower defense, visual novel, …)
- [ ] In-app first-run tutorial overlay

---

## Next priorities (post–E2E Ready)

Ordered for product impact, not exhaustive:

1. **Cross-runtime parity budget** — shared reference scenes; document Skia vs Phaser deltas  
2. **Schema migrate command** — safe upgrades when `schemaVersion` bumps  
3. **Asset packer** — texture atlas + audio bank in `gamekit build`  
4. **Agent reliability** — plan-then-execute, undo snapshot, vision screenshot  
5. **More samples** — endless-runner and topdown-shooter as full `examples/`  
6. **Editor unit tests (RTL)** — Inspector / SceneCanvas beyond Playwright smoke  
7. **Docs site polish** — VitePress already wired; keep guides in sync on every CLI change  

---

## AI / MCP (ongoing)

### Done

- [x] MCP tool surface (scenes, entities, assets, physics, GUI, rules, recipes, skills, simulate, doctor, …)
- [x] `@gamekit/agent` ReAct loop + provider adapters (Anthropic-first; more providers partial)
- [x] Editor BYOK keys + chat SSE + approval modes
- [x] Skill/recipe injection into agent context

### Open

- [ ] Plan-then-execute mode with user confirmation  
- [ ] Auto undo snapshot per agent session  
- [ ] `/screenshot` → vision model loop  
- [ ] Tool audit log + idempotency keys for LLM retries  
- [ ] Stronghold/keychain storage for Tauri  

---

## Version notes

| Tag | Notes |
|-----|--------|
| MVP 0.1.x | Schema + dual runtime + editor + basic MCP |
| E2E Ready | Export bootstrap, samples, Phaser play host, `gamekit create`, shipping docs |
| Next | Parity, E2E tests, migrate, packer, agent polish |

Historical detailed design notes may still live in `ROADMAP_DETAILED.md`; **this file is the status source of truth**.
