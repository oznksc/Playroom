# Cross-Runtime Parity Budget

Single source of truth for how `@gamekit/runtime` (Expo / Skia) and
`@gamekit/runtime-web` (Phaser) support the schema. Use it when:

- deciding whether a feature is safe to ship in a game intended for both targets,
- planning work to close a gap,
- adding a new component (the matrix must be updated in the same PR).

**Legend**

| Mark | Meaning |
|---|---|
| ✅ | Fully supported; all schema fields honored |
| ⚠️ | Partial — works but some fields/behaviors are ignored or divergent |
| ❌ | Not implemented — component/field silently ignored |
| 🔶 | Supported but behaves **differently** across runtimes |

> Status is current as of the E2E Ready baseline. The reference project
> `examples/parity-budget/` exercises both runtimes; run it in the editor play
> host (Phaser) and in the Expo template (Skia) to observe the deltas live.

---

## Component matrix

| Component | Skia (`@gamekit/runtime`) | Phaser (`@gamekit/runtime-web`) | Delta notes |
|---|---|---|---|
| Transform | ⚠️ | ✅ | Skia applies `rotation`/`scale` to collider geometry only — **sprites/tilemaps/text never rotate or scale visually**. Phaser honors position, rotation, scale fully. |
| Sprite | ✅ | ✅ | `assetId`, `width`, `height`, `anchor` on both. Missing-texture placeholder differs (Skia `#7dd3fc` rect vs Phaser colored rect). |
| Animation | ⚠️ | ⚠️ | Single-row spritesheets only on both; multi-row frame grids render garbage. `currentFrame` honored on Skia, ignored on Phaser (always restarts at frame 0). |
| Tilemap | ⚠️ | ❌ | Skia renders (single/multi-row atlas, tile `0` = empty) but **generates no collision**. Phaser ignores Tilemap entirely (treated as a plain rect, no tiles drawn). |
| Text | ⚠️ | ✅ | Skia: `fontAssetId` fallback renders nothing when font missing; no wrapping. Phaser loads custom fonts, supports HUD via position heuristic. |
| AudioSource | ⚠️ | ✅ | Both play `assetId`/`volume`/`loop`/`playOnStart`. Skia has no pause/resume/fade; Phaser has the same limitation — audio is fire-and-forget on both. |
| AudioListener | ❌ | ❌ | Defined in schema, unused by both. No spatial/positional audio anywhere. |
| Light2D | ❌ | ⚠️ | Phaser renders point lights (`range`, `intensity`, `color`); `kind: "spot"` degrades to point. Skia has no lighting pipeline. |
| NineSlice | ❌ | ✅ | Phaser uses built-in nineslice. Skia has no stretch-9 rendering. |
| AabbCollider | ✅ | ✅ | Full field support. 🔶 `layer`/`mask` honored by Skia, **ignored by Phaser** (all bodies collide with everything). |
| CircleCollider | ✅ | ✅ | Same as AabbCollider; Phaser ignores `layer`/`mask`. |
| PolygonCollider | ⚠️ | ❌ | Skia: SAT convex-only; `rotation` never applied to points; concave shapes ghost; no dynamic-vs-dynamic. Phaser: **no polygon collider at all** — entity gets a default rect with no physics. |
| RigidBody | ⚠️ | ⚠️ | Skia: `velocity`, `angularVelocity`, `mass`, `drag`, `isKinematic`, `gravityScale`, `useGravity`, sleeping. Phaser reduces to `drag` + `useGravity`; ignores `velocity`, `mass`, `angularVelocity`, `isKinematic`, `gravityScale`. 🔶 `applyImpulse` script action works on Skia, is a **no-op on Phaser** (no rigid-body store wired). |
| PlayerController | ⚠️ | ✅ | Both: `speed`/`jumpVelocity`/`gravity`, top-down 4-way when `gravity === 0`. Phaser adds coyote grace window, air damping, velocity caps. Skia is bare — no coyote time, no jump buffering, no air control. |
| CameraFollow | ⚠️ | ✅ | Both follow `targetId` + `smoothing`. 🔶 Phaser remaps smoothing to a different curve and hard-codes a deadzone + `(0,20)` offset; Skia is pure exponential lerp, no bounds/deadzone. |
| Tween | ✅ | ✅ | Full parity (`property`, easing, loop, pingPong). |
| FollowPath | ⚠️ | ✅ | Same shared logic (`points`, `speed`, `loop`). Skia path.rs lives under `@gamekit/runtime` and is shared — behavior matches; only constant linear speed (no easing) on both. |
| ParticleSystem | ⚠️ | ⚠️ | Same shared emitter on both: circle particles only, hex colors only, uniform 360° emission. Phaser renders as CPU Graphics. |
| StateMachine | ⚠️ | ⚠️ | Both evaluate `on.triggerEnter`/`on.collisionEnter` transitions only. No per-frame states, no timers, no `enter:`/`exit:` hooks inside the FSM itself. |
| Script | ⚠️ | ⚠️ | Both dispatch `start`, trigger-overlap, and GUI-action events. ❌ **No per-frame `update` event on either.** Skia adds collision-enter dispatch; Phaser does not. `applyImpulse` no-op on Phaser (see RigidBody). |
| GUI Text | ✅ | ✅ | `text`, `fontSize`, `color`, `align`; fixed to screen on both. |
| GUI Button | ✅ | ✅ | `action` dispatch works on both; Phaser makes **all** buttons interactive regardless of the `interactive` field. |
| GUI Image | ✅ | ✅ | Both render `assetId`. Phaser preloads GUI-only assets and looks them up by the bare `assetId`. |
| `anchorX`/`anchorY` / `nodeOverrides` (GUI) | ❌ | ⚠️ | Skia ignores both. Phaser honors `nodeOverrides`; ignores anchors. |
| Scene transitions | ⚠️ | ⚠️ | Skia: `fade` real, `slide` degrades to fade, `none` skipped. Phaser: only `fade`; `slide`/`none` ignored; scene switching is a host-side remount, not Phaser scene stacking. |

---

## Feature-area matrix

| Feature | Skia | Phaser | Notes |
|---|---|---|---|
| Keyboard input | ✅ | ✅ | Action map + defaults (`arrows`/`wasd`/`space`/`j`/`k`). |
| Virtual controls (joystick + buttons) | ✅ | ✅ | Analog stick + discrete A/B/X. |
| Gamepad | ✅ | ✅ | Shared poll + merge; standard button map + sticks. |
| Gestures (tap/swipe/pinch/longPress) | ⚠️ | ❌ | Skia exports the recognizer but **never wires it** into the game loop. Phaser doesn't reference it at all. |
| Multi-scene / scene switching | ✅ | ⚠️ | Skia has a full `SceneManager`. Phaser relies on the host to remount the Phaser instance on `switchScene`. |
| Game rules (hazards, objectives, lives, win/lose) | ✅ | ✅ | Shared `RulesEngine` — closest parity area. Only the player overlaps triggers on both. |
| Save/load | ✅ | ⚠️ | Skia: versioned payload + storage providers. Phaser: `store.ts` helpers exist but **nothing calls them** — runtime is stateless between mounts. |
| Tilemap collision | ❌ | ❌ | Neither runtime derives colliders from tiles. |
| Dynamic-vs-dynamic body collision | ❌ | ❌ | Both only resolve static solids against the player. |
| Collision `layer`/`mask` | ✅ | ❌ | Skia honors them; Phaser ignores them entirely. |

---

## Behavioral deltas to know about

These are the "same scene, different feel" traps:

1. **Transform scale/rotation visuals.** Skia ignores them at render time; a rotating
   gem or a scaled sprite will look static on mobile but correct on web. Polygon
   colliders also ignore rotation on Skia, so a rotated polygon behaves differently
   from its visual.
2. **Player feel.** Phaser adds coyote-time grace, air damping, and velocity caps;
   Skia is instant-velocity. Platformers will feel tighter on web unless the Skia
   controller is brought up to parity.
3. **Camera.** Phaser remaps `smoothing` and adds a deadzone; Skia is a pure lerp.
   Same `smoothing` value will not produce the same camera motion.
4. **Collision layer/mask.** A scene that relies on collision masks to ignore certain bodies
   will behave differently on web, where everything collides with everything.
5. **RigidBody fields.** `velocity`, `mass`, `angularVelocity`, `isKinematic`,
   `gravityScale` only matter on Skia. `applyImpulse` scripts do nothing on web.
6. **HUD text.** Entity `Text` components with `{coins}`/`Coins:` patterns are
   live-updated on Phaser but are static on Skia (and on Phaser, only those two
   patterns). Use GUI text if you need a live HUD you can rely on.

---

## Parity budget — closing work, prioritized

Ordered by product impact (games shipping to both targets), not effort.

| # | Gap | Runtime to fix | Effort | Notes |
|---|---|---|---|---|
| ~~1~~ | ~~GUI Image asset-key bug~~ | Phaser | S | **Fixed** — GUI-only assets are preloaded and looked up by bare `assetId`; `ASSET_UNUSED` doctor now counts GUI Image refs. |
| 2 | Tilemap renders but no collision on either | Both | M | Shared tile-collision pass; static bodies per solid tile. |
| 3 | RigidBody parity (velocity/mass/isKinematic/gravityScale) | Phaser | M | Wire Phaser bodies to the shared fields; fix `applyImpulse` no-op. |
| 4 | Collision `layer`/`mask` on Phaser | Phaser | M | Consult layer/mask in the Phaser collision filter. |
| 5 | Transform scale/rotation rendering on Skia | Skia | M | Apply Skia `rotate`/`scale` to sprite/tilemap/text/animation nodes; apply rotation to polygon points. |
| 6 | PlayerController feel parity | Skia | M | Add coyote time, jump buffering, air damping; match Phaser velocity model. |
| 7 | PolygonCollider on Phaser | Phaser | L | Convex SAT via Phaser `Geom`; needs per-entity bodies. |
| 8 | Gestures wired on both | Both | M | Feed the shared recognizer from pointer events; dispatch script events. |
| 9 | AudioListener / spatial audio | Both | L | Needs a positional audio model (both runtimes). |
| 10 | Light2D on Skia | Skia | L | Skia color-filters / blend modes for point/spot lights. |
| 11 | NineSlice on Skia | Skia | M | 9-slice via `useImage` + 9 rects or shader. |
| 12 | Per-frame script `update` event | Both | S | Dispatch a frame callback into Script handlers. |
| 13 | Camera smoothing parity | Both | S | Align the lerp model and document the remap. |
| 14 | Save/load wiring on Phaser | Phaser | S | Call `store.ts` from gameplay (auto-save on level complete). |

**S** = small (< 1 day), **M** = medium (1–3 days), **L** = large (3–5+ days).

---

## Keeping this document honest

- Every PR that changes a runtime's component handling **must** update this matrix.
- New schema components must be added to the matrix in the same PR that adds them
  to the schema (see `packages/schema/src/index.ts` `GameKitComponentSchema`).
- The reference scenes in `examples/parity-budget/` should be the first thing you
  run after a parity fix — green behavior across both runtimes is the acceptance
  criterion.
