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
| Transform | ✅ | ✅ | Both runtimes apply position, `rotation` (degrees), and `scale` to sprites/tilemaps/text/animation nodes. Skia rotates/scales around the entity origin (the anchor point for sprites), matching Phaser. Tilemap solids stay axis-aligned at base scale — keep solid tilemaps at rotation 0 / scale 1. |
| Sprite | ✅ | ✅ | `assetId`, `width`, `height`, `anchor` on both. Missing-texture placeholder differs (Skia `#7dd3fc` rect vs Phaser colored rect). |
| Animation | ⚠️ | ⚠️ | Single-row spritesheets only on both; multi-row frame grids render garbage. `currentFrame` honored on Skia, ignored on Phaser (always restarts at frame 0). |
| Tilemap | ✅ | ✅ | Both render (single/multi-row atlas, tile `0` = empty) anchored at the entity's Transform. When `solid` is true, every non-empty tile is a static AABB (tile layer 1) and dynamic bodies collide with it on both runtimes. `solid` defaults to false. |
| Text | ⚠️ | ✅ | Skia: `fontAssetId` fallback renders nothing when font missing; no wrapping. Phaser loads custom fonts, supports HUD via position heuristic. |
| AudioSource | ✅ | ✅ | Both play `assetId`/`volume`/`loop`/`playOnStart` plus `minDistance`/`maxDistance` for spatial attenuation. Audio is fire-and-forget on both (no pause/resume/fade). |
| AudioListener | ✅ | ✅ | Shared spatial model (`computeSpatialAudio` in `@gamekit/runtime`): distance-based linear gain rolloff (full at/below `minDistance`, silent at/above `maxDistance`) + stereo pan proportional to horizontal offset. Both runtimes locate the first enabled `AudioListener` entity each frame and apply gain/pan to every playing source. Skia: `StereoPannerNode` (web) or volume-only (expo-av). Phaser: `setVolume`/`setPan`. One-shots from `playSound` script actions stay full volume and centered. No listener → authored volume, centered. |
| Light2D | ✅ | ⚠️ | Skia renders `point` as an additive radial glow (`range`, `intensity`, `color`) and `spot` as the same glow clipped to a cone fan opening along the entity's rotation (0 = up). Phaser renders point lights; `kind: "spot"` degrades to point on Phaser. |
| NineSlice | ✅ | ✅ | Both runtimes render 9-slice from the same borders: corners stay source-sized, edges stretch on one axis, the center stretches both. Phaser uses built-in nineslice; Skia draws 9 clipped/stretched image regions. |
| AabbCollider | ✅ | ✅ | Full field support. layer/mask honored on both: solid collision uses the dynamic body's mask vs the solid's layer; trigger overlap requires both masks to accept the other's layer. |
| CircleCollider | ✅ | ✅ | Same as AabbCollider; layer/mask filtering on Phaser matches Skia. |
| PolygonCollider | ✅ | ✅ | Both runtimes resolve convex polygons from the same SAT core: Skia collects static polygon solids in its loop; Phaser has no Arcade polygon bodies, so it collects them via `getEntityPolygon` and resolves dynamic AABB/circle bodies against them every frame (`applyAabbCollisions`/`applyCircleCollisions`). Rotation (degrees) and scale are applied to points; concave shapes ghost; no dynamic-vs-dynamic on either. |
| RigidBody | ⚠️ | ⚠️ | Both honor `velocity`, `mass`, `angularVelocity`, `isKinematic`, `gravityScale`, `drag`, `useGravity`. `applyImpulse` script actions work on both (impulse ÷ mass; no-op on kinematic). Skia simulates body sleeping; Phaser does not, and Phaser maps `drag` to an approximate px/s² value. |
| PlayerController | ✅ | ✅ | Both: `speed`/`jumpVelocity`/`gravity`, top-down 4-way when `gravity === 0`. Shared feel model: coyote grace window, jump buffering, edge-triggered jump, air control damping, upward velocity cap. |
| CameraFollow | ✅ | ✅ | Both follow `targetId` + `smoothing`. `smoothing` is a pure per-frame exponential lerp factor (0–1, higher = snappier) in both runtimes; no remap, deadzone, or follow offset. |
| Tween | ✅ | ✅ | Full parity (`property`, easing, loop, pingPong). |
| FollowPath | ⚠️ | ✅ | Same shared logic (`points`, `speed`, `loop`). Skia path.rs lives under `@gamekit/runtime` and is shared — behavior matches; only constant linear speed (no easing) on both. |
| ParticleSystem | ⚠️ | ⚠️ | Same shared emitter on both: circle particles only, hex colors only, uniform 360° emission. Phaser renders as CPU Graphics. |
| StateMachine | ⚠️ | ⚠️ | Both evaluate `on.triggerEnter`/`on.collisionEnter` transitions only. No per-frame states, no timers, no `enter:`/`exit:` hooks inside the FSM itself. |
| Script | ⚠️ | ⚠️ | Both dispatch `start`, trigger-overlap, GUI-action, and per-frame `update` events (update fires once per frame with `dt` on the context). ❌ Skia adds collision-enter dispatch; Phaser does not. `applyImpulse` works on both. |
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
| Gestures (tap/swipe/pinch/longPress) | ✅ | ✅ | Shared recognizer fed from pointer events on both runtimes; recognized gestures dispatch script events (`tap`, `longPress`, `swipeUp`/`swipeDown`/`swipeLeft`/`swipeRight`, `pinch`). |
| Multi-scene / scene switching | ✅ | ⚠️ | Skia has a full `SceneManager`. Phaser relies on the host to remount the Phaser instance on `switchScene`. |
| Game rules (hazards, objectives, lives, win/lose) | ✅ | ✅ | Shared `RulesEngine` — closest parity area. Only the player overlaps triggers on both. |
| Save/load | ✅ | ⚠️ | Skia: versioned payload + storage providers. Phaser: `store.ts` helpers (save/load/delete/list) wired into gameplay — auto-save into a `saveSlot` on level complete (win) when the host exposes `exportSaveSnapshot`; the generated web bootstrap passes `saveSlot: "auto"`. Loading a save still requires a host decision (stateless between mounts). |
| Tilemap collision | ✅ | ✅ | `Tilemap.solid` derives static tile bodies on both runtimes (tile id ≠ 0 → AABB on layer 1, so masks filter tiles too). |
| Dynamic-vs-dynamic body collision | ❌ | ❌ | Both only resolve static solids against the player. |
| Collision `layer`/`mask` | ✅ | ✅ | Both filter: solid collision = dynamic body's mask & solid's layer; trigger overlap = both masks accept the other's layer. |

---

## Behavioral deltas to know about

These are the "same scene, different feel" traps:

1. **Player feel.** Both runtimes share one feel model: coyote-time grace, jump
   buffering, edge-triggered jump, air damping, and an upward velocity cap. Same
   `speed`/`jumpVelocity`/`gravity` values produce the same motion and feel.
2. **Camera.** Both runtimes use the same pure exponential lerp model — `smoothing`
   is a per-frame lerp factor (0–1, higher = snappier) with no remap, deadzone, or
   follow offset. Same `smoothing` value produces the same camera motion.
3. **Collision layer/mask.** Matched on both runtimes: solid collision uses the dynamic
   body's mask vs the solid's layer; trigger overlap requires both masks to accept the
   other's layer.
4. **RigidBody.** Field support is matched on both runtimes (`velocity`, `mass`,
   `angularVelocity`, `isKinematic`, `gravityScale`, `drag`, `useGravity`);
   `applyImpulse` scripts work on both. Remaining differences: Skia sleeps idle
   bodies; Phaser does not, and Phaser maps `drag` to an approximate px/s² value.
5. **HUD text.** Entity `Text` components with `{coins}`/`Coins:` patterns are
   live-updated on Phaser but are static on Skia (and on Phaser, only those two
   patterns). Use GUI text if you need a live HUD you can rely on.

---

## Parity budget — closing work, prioritized

Ordered by product impact (games shipping to both targets), not effort.

| # | Gap | Runtime to fix | Effort | Notes |
|---|---|---|---|---|
| ~~1~~ | ~~GUI Image asset-key bug~~ | Phaser | S | **Fixed** — GUI-only assets are preloaded and looked up by bare `assetId`; `ASSET_UNUSED` doctor now counts GUI Image refs. |
| ~~2~~ | ~~Tilemap renders but no collision on either~~ | Both | M | **Fixed** — Tilemap now renders on Phaser and `Tilemap.solid` derives static tile bodies on both runtimes (tile id ≠ 0 → AABB on layer 1). |
| ~~3~~ | ~~RigidBody parity (velocity/mass/isKinematic/gravityScale)~~ | Phaser | M | **Fixed** — Phaser honors `velocity`/`mass`/`angularVelocity`/`isKinematic`/`gravityScale`/`drag`/`useGravity` via Arcade and `applyImpulse` scripts work (impulse ÷ mass; no-op on kinematic). |
| ~~4~~ | ~~Collision `layer`/`mask` on Phaser~~ | Phaser | M | **Fixed** — Phaser collider/overlap process callbacks apply the Skia layer/mask rule (solid: dynamic mask & static layer; trigger: both masks must accept the other's layer; tile solids are layer 1). |
| ~~5~~ | ~~Transform scale/rotation rendering on Skia~~ | Skia | M | **Fixed** — Skia applies `rotate`/`scale` (rotation in degrees, pivoted at the entity origin/anchor) to sprite/tilemap/text/animation nodes, and applies rotation + scale to polygon points. Tilemap solids stay axis-aligned (keep solid tilemaps at rotation 0 / scale 1). |
| 6 | PlayerController feel parity | Skia | M | **Fixed** — Skia's controller now uses the same feel model as Phaser: coyote grace window (4 frames), jump buffering (6 frames), edge-triggered jump, air control damping (`speed * 0.85` airborne), and an upward velocity cap. Phaser also gained jump buffering to keep both runtimes identical. |
| 7 | PolygonCollider on Phaser | Phaser | L | **Fixed** — static convex polygons are resolved via the shared Skia SAT core: static solids are collected with `getEntityPolygon` (rotation/scale applied) and dynamic AABB/circle bodies resolve against them every frame with `applyAabbCollisions`/`applyCircleCollisions`, correcting position + velocity (Skia semantics, incl. polygon-as-bounding-box for AABB and true SAT for circle). Arcade has no polygon bodies, so solids are resolved manually; concave shapes ghost and there is no dynamic-vs-dynamic, matching Skia. |
| 8 | Gestures wired on both | Both | M | **Fixed** — both runtimes feed the shared `createGestureRecognizer` from pointer events (Skia: RN touch handlers; Phaser: `pointerdown`/`pointermove`/`pointerup`/`pointercancel`) and dispatch recognized gestures as script events (`tap`, `longPress`, `swipeUp`/`swipeDown`/`swipeLeft`/`swipeRight`, `pinch`). |
| 9 | AudioListener / spatial audio | Both | L | **Fixed** — shared `computeSpatialAudio` model in `@gamekit/runtime`: distance-based linear gain rolloff (`minDistance`→`maxDistance`, defaults 0/1000) + stereo pan from horizontal offset. Both runtimes locate the first enabled `AudioListener` entity's `Transform` each frame and apply gain/pan to every playing source (Skia: `StereoPannerNode` on web / volume-only on expo-av; Phaser: `setVolume`/`setPan`). `AudioSource` gained optional `minDistance`/`maxDistance`; `playSound` one-shots stay full volume, centered; no listener → authored volume, centered. |
| 10 | Light2D on Skia | Skia | L | **Fixed** — Skia renders lights with additive blend: `point` is a radial gradient glow (bright center → transparent edge) across `range` with peak alpha scaled by `intensity` and `color`-tinted; `spot` clips the same glow to a cone fan opening along the entity's rotation (0 = up, clockwise). Pure helpers (`pointLightColors`, `computeSpotCone`, `hexToRgbaHex`) are unit-tested. Phaser still degrades `spot` to point. |
| 11 | NineSlice on Skia | Skia | M | **Fixed** — Skia renders 9-slice via `computeNineSliceRegions` (source rects → target rects) drawing 9 clipped/stretched image regions: corners fixed, edges stretch one axis, center stretches both. Pure helper is unit-tested. |
| ~~12~~ | ~~Per-frame script `update` event~~ | Both | S | **Fixed** — hosts dispatch an `update` event into Script handlers every frame (Skia loop, Phaser `update`, headless `simulateSceneSteps`); the ScriptContext carries `dt`. |
| 13 | Camera smoothing parity | Both | S | **Fixed** — Phaser uses Skia's `createCameraFollow` model: `smoothing` is a pure per-frame exponential lerp factor (0–1); removed the remap, deadzone, and follow offset. |
| ~~14~~ | ~~Save/load wiring on Phaser~~ | Phaser | S | **Fixed** — `store.ts` wired into gameplay: `GameKitPhaserScene` auto-saves into the configured `saveSlot` on level complete (win) via the host's `exportSaveSnapshot`; the generated web bootstrap passes `saveSlot: "auto"` and exposes the SceneManager snapshot. |

**S** = small (< 1 day), **M** = medium (1–3 days), **L** = large (3–5+ days).

---

## Keeping this document honest

- Every PR that changes a runtime's component handling **must** update this matrix.
- New schema components must be added to the matrix in the same PR that adds them
  to the schema (see `packages/schema/src/index.ts` `GameKitComponentSchema`).
- The reference scenes in `examples/parity-budget/` should be the first thing you
  run after a parity fix — green behavior across both runtimes is the acceptance
  criterion.
