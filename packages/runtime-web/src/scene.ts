import Phaser from "phaser";
import type {
  GameKitScene,
  GameKitEntity,
  TransformComponent,
  SpriteComponent,
  AabbColliderComponent,
  CircleColliderComponent,
  PolygonColliderComponent,
  PlayerControllerComponent,
  CameraFollowComponent,
  AnimationComponent,
  RigidBodyComponent,
  ParticleSystemComponent,
  TextComponent,
  ScriptComponent,
  SceneTransitionDef,
  FollowPathComponent,
  Light2DComponent,
  NineSliceComponent,
  TilemapComponent,
  TweenComponent,
  StateMachineComponent,
  GuiNode,
  GuiComponent,
  GuiComponentInstance,
} from "@gamekit/schema";
import { resolveGameRules } from "@gamekit/schema";
import { createPlayerController } from "@gamekit/runtime/player";
import { playTimeline, type TimelineState } from "@gamekit/runtime/timeline";
import {
  createParticleEmitter,
  updateParticleEmitter,
  particleRenderColor,
  particleRenderSize,
  particleRenderAlpha,
  type ParticleEmitterState,
} from "@gamekit/runtime/particles";
import { evaluateScriptEvent, hasScriptHandler, transitionFsm, type ScriptContext } from "@gamekit/runtime/script";
import { RulesEngine } from "@gamekit/runtime/rules-engine";
import { updateFollowPath } from "@gamekit/runtime/path";
import { updateTween } from "@gamekit/runtime/tween";
import {
  raycast,
  getEntityPolygon,
  applyAabbCollisions,
  applyCircleCollisions,
  updateCollisionEvents,
  type Aabb,
  type Circle,
  type CollisionEvent,
  type CollisionSolid,
  type CollisionState,
} from "@gamekit/runtime/collision";

import type { EntityBinding, PlayerBinding, TextBinding, Transformable } from "./scene-types.js";
import { computeWorldBounds, findComponent } from "./scene-helpers.js";
import { preloadEntityAssets, preloadGuiImageAssets } from "./asset-loader.js";
import { createPhaserRigidBody, type PhaserRigidBody } from "./rigid-body-web.js";
import { colliderLayerMask, solidCollides, triggerOverlaps } from "./collision-filter.js";
import { configureSceneKeyboard, resolveScenePlayerInput, type SceneInputKeys } from "./scene-input.js";
import { setupTouchJoystick as setupTouchJoystickInput } from "./touch-joystick.js";
import { refreshSceneHud } from "./scene-hud.js";
import { showSceneOverlay } from "./scene-overlay.js";
import {
  playSceneSound,
  setupSceneAudio,
  stopSceneSound,
  stopSceneAudio,
  updateSceneAudio,
  type SceneSoundMap,
} from "./scene-audio.js";
import { saveGame } from "./store.js";
import {
  createGestureRecognizer,
  gestureScriptEventName,
  type GestureRecognizer,
  type RecognizedGesture,
} from "@gamekit/runtime/gestures";

export type GameKitPhaserSceneOptions = {
  guiComponents?: GuiComponent[];
  sceneManager?: ScriptContext["sceneManager"];
  onGuiAction?: (action: string) => void;
  /** Editor / host callbacks (optional). */
  onOutcome?: (kind: "won" | "lost", message: string) => void;
  onLivesChange?: (lives: number | null) => void;
  onCollectProgress?: (tag: string, collected: number, target: number) => void;
  /** When true, skip Phaser text overlay (host paints its own). */
  suppressOutcomeOverlay?: boolean;
  /** Active level for rules merge / onComplete. */
  level?: import("@gamekit/schema").GameKitLevel | null;
  /** When set, auto-save progress (via store.ts) into this slot on level complete (win). */
  saveSlot?: string;
};

export class GameKitPhaserScene extends Phaser.Scene {
  private sceneData: GameKitScene;
  private assetUrls: Record<string, string>;
  private bindings: Map<string, EntityBinding> = new Map();
  private playerBinding: PlayerBinding | null = null;
  private cameraFollowData: CameraFollowComponent | null = null;
  private timelineState: TimelineState = { elapsed: 0, playing: false };
  private keys!: SceneInputKeys;
  private particleEmitters = new Map<string, ParticleEmitterState>();
  private particleGraphics: Phaser.GameObjects.Graphics | null = null;
  private sounds: SceneSoundMap = new Map();
  /** Contacts collected from Arcade colliders this frame (dynamic vs static solid). */
  private collisionContacts: CollisionEvent[] = [];
  /** Active solid-contact pairs from the previous frame (edge detection). */
  private collisionState: CollisionState = new Set();
  private lightSources = new Map<string, Phaser.GameObjects.Light>();
  private hasLights = false;
  /** Static convex polygon solids, resolved via the Skia SAT collision core. */
  private polygonSolids: CollisionSolid[] = [];
  private textBindings: TextBinding[] = [];
  private coinsCollected = 0;
  private totalCoins = 0;
  private activeEntities: GameKitEntity[] = [];
  private winText: Phaser.GameObjects.Text | null = null;
  private won = false;
  private gameOver = false;
  private gameRules: ReturnType<typeof resolveGameRules> = resolveGameRules();
  private rulesEngine: RulesEngine | null = null;
  private spawnPoint = { x: 80, y: 300 };
  private livesRemaining = 3;
  private livesText: Phaser.GameObjects.Text | null = null;
  /** Previous-frame jump key state for edge-triggered jumps (prevents rocket while held). */
  private jumpHeldLastFrame = false;
  /** Frames a jump press stays buffered so a jump just before landing still fires. */
  private jumpBufferFrames = 0;
  /** Coyote-time / ground stick to avoid Y vibration on platform seams. */
  private groundedGraceFrames = 0;
  private static readonly GROUND_GRACE = 4;
  private static readonly JUMP_BUFFER = 6;
  private transitionData: SceneTransitionDef | null = null;
  private joystickActive = false;
  private joystickCenter = { x: 0, y: 0 };
  private joystickDx = 0;
  private joystickDy = 0;
  private touchJump = false;
  private touchFire = false;
  private touchAction = false;
  private guiObjects: Phaser.GameObjects.GameObject[] = [];
  private loadedFonts = new Map<string, string>();
  private guiComponents: GuiComponent[] = [];
  private sceneManager: ScriptContext["sceneManager"] | undefined;
  private onGuiAction: ((action: string) => void) | undefined;
  private hostOptions: GameKitPhaserSceneOptions = {};
  /** Solid tilemap layers; dynamic bodies collide against them. */
  private tileLayers: Phaser.Tilemaps.TilemapLayer[] = [];
  private tileLayerByEntity = new Map<string, Phaser.Tilemaps.TilemapLayer>();
  /** RigidBody adapters for script actions (applyImpulse) on dynamic bodies. */
  private rigidBodies = new Map<string, PhaserRigidBody>();
  /** Shared gesture recognizer fed from pointer events (tap/swipe/pinch/longPress). */
  private gestureRecognizer: GestureRecognizer | null = null;
  /** GameObject → binding for collision layer/mask filtering. */
  private objectBindings = new Map<Phaser.GameObjects.GameObject, EntityBinding>();

  constructor(
    sceneData: GameKitScene,
    assetUrls: Record<string, string>,
    transition?: SceneTransitionDef,
    options?: GameKitPhaserSceneOptions,
  ) {
    super("GameKitScene");
    this.sceneData = sceneData;
    this.assetUrls = assetUrls;
    this.activeEntities = structuredClone(sceneData.entities);
    this.gameRules = resolveGameRules(sceneData.gameRules);
    this.livesRemaining = this.gameRules.lives > 0 ? this.gameRules.lives : 0;
    this.transitionData = transition ?? null;
    this.hostOptions = options ?? {};
    this.guiComponents = options?.guiComponents ?? [];
    this.sceneManager = options?.sceneManager;
    this.onGuiAction = options?.onGuiAction;
    const player = sceneData.entities.find((e) =>
      e.components.some((c) => c.type === "PlayerController"),
    );
    const pt = player
      ? findComponent<TransformComponent>(player, "Transform")
      : undefined;
    this.spawnPoint = this.gameRules.spawnPoint
      ? { ...this.gameRules.spawnPoint }
      : pt
        ? { ...pt.position }
        : { x: 80, y: 300 };
  }

  private ensureRulesEngine(): RulesEngine {
    if (this.rulesEngine) return this.rulesEngine;
    this.rulesEngine = new RulesEngine(
      { ...this.sceneData, entities: this.activeEntities, gameRules: this.gameRules },
      {
        getEntities: () => this.activeEntities,
        destroyEntity: (id) => this.destroyEntityById(id),
        getPlayerTransforms: () => {
          const out: Array<{ entityId: string; position: { x: number; y: number } }> = [];
          for (const entity of this.activeEntities) {
            if (!entity.components.some((c) => c.type === "PlayerController")) continue;
            const binding = this.bindings.get(entity.id);
            const transform = findComponent<TransformComponent>(entity, "Transform");
            if (binding?.gameObject && typeof binding.gameObject.x === "number") {
              out.push({
                entityId: entity.id,
                position: {
                  x: binding.gameObject.x,
                  y: (binding.gameObject as { y?: number }).y ?? transform?.position.y ?? 0,
                },
              });
            } else if (transform) {
              out.push({ entityId: entity.id, position: { ...transform.position } });
            }
          }
          return out;
        },
        setPlayerPosition: (entityId, position) => {
          const binding = this.bindings.get(entityId);
          if (binding?.body) {
            binding.body.reset(position.x, position.y);
            binding.body.setVelocity(0, 0);
          } else if (binding?.gameObject) {
            (binding.gameObject as { x: number; y: number }).x = position.x;
            (binding.gameObject as { x: number; y: number }).y = position.y;
          }
          const entity = this.activeEntities.find((e) => e.id === entityId);
          const transform = entity ? findComponent<TransformComponent>(entity, "Transform") : undefined;
          if (transform) {
            transform.position.x = position.x;
            transform.position.y = position.y;
          }
        },
        resetPlayerMotion: (entityId) => {
          const binding = this.bindings.get(entityId);
          if (binding?.body) binding.body.setVelocity(0, 0);
          this.groundedGraceFrames = 0;
          this.jumpHeldLastFrame = false;
          this.jumpBufferFrames = 0;
        },
        playSound: (assetId) => {
          for (const e of this.activeEntities) {
            const audio = e.components.find((c) => c.type === "AudioSource");
            if (audio && audio.type === "AudioSource" && audio.assetId === assetId) {
              this.playSound(e.id);
            }
          }
        },
        sceneManager: this.sceneManager,
        onOutcome: (kind, message) => {
          if (kind === "won") this.showWin(message);
          else this.triggerGameOver(message);
          this.hostOptions.onOutcome?.(kind, message);
        },
        onLivesChange: (lives) => {
          if (lives === null) {
            this.hostOptions.onLivesChange?.(null);
            return;
          }
          this.livesRemaining = lives;
          if (this.livesText) this.livesText.setText(`Lives: ${lives}`);
          this.hostOptions.onLivesChange?.(lives);
        },
        onCollectProgress: (tag, collected, target) => {
          this.hostOptions.onCollectProgress?.(tag, collected, target);
        },
      },
      {
        initialSpawn: this.spawnPoint,
        level: this.hostOptions.level ?? null,
      },
    );
    return this.rulesEngine;
  }

  preload(): void {
    const loadedKeys = preloadEntityAssets(
      this.load,
      this.activeEntities,
      this.assetUrls,
      this.loadedFonts,
    );
    preloadGuiImageAssets(
      this.load,
      this.sceneData.gui,
      this.guiComponents,
      this.assetUrls,
      loadedKeys,
    );
  }

  create(): void {
    const world = computeWorldBounds(this.sceneData);
    this.physics.world.setBounds(0, 0, world.width, world.height);
    this.cameras.main.setBounds(0, 0, world.width, world.height);
    this.cameras.main.setBackgroundColor(this.sceneData.viewport.background);

    this.hasLights = this.activeEntities.some((e) => findComponent<Light2DComponent>(e, "Light2D") !== undefined);
    if (this.hasLights) {
      this.lights.enable();
      this.lights.setAmbientColor(0x222222);
    }

    const staticGroup = this.physics.add.staticGroup();
    const triggerGroup = this.physics.add.staticGroup();

    for (const entity of this.activeEntities) {
      this.createEntity(entity, staticGroup, triggerGroup);
    }

    this.totalCoins = this.activeEntities.filter((e) => {
      const name = e.name.toLowerCase();
      const aabb = findComponent<AabbColliderComponent>(e, "AabbCollider");
      return name.includes("coin") || (aabb?.isTrigger === true && name.includes("coin"));
    }).length;
    // Fallback: count all trigger pickups if none named coin
    if (this.totalCoins === 0) {
      this.totalCoins = this.activeEntities.filter((e) => {
        const aabb = findComponent<AabbColliderComponent>(e, "AabbCollider");
        return aabb?.isTrigger === true;
      }).length;
    }

    for (const [, binding] of this.bindings) {
      if (binding.body && !binding.isStatic && !binding.isTrigger) {
        // Match Skia's solid-collision rule: a dynamic body only collides with
        // static bodies whose layer is in the dynamic body's mask.
        this.physics.add.collider(binding.gameObject, staticGroup, undefined, (_dyn, stat) => {
          const dynFilter = colliderLayerMask(binding.entity);
          const statBinding = this.objectBindings.get(stat as Phaser.GameObjects.GameObject);
          const statLayer = statBinding ? colliderLayerMask(statBinding.entity).layer : 1;
          if (statBinding) {
            this.collisionContacts.push({
              entityId: binding.entity.id,
              otherEntityId: statBinding.entity.id,
            });
          }
          return solidCollides(dynFilter.mask, statLayer);
        });
        if (this.tileLayers.length > 0) {
          this.physics.add.collider(binding.gameObject, this.tileLayers, undefined, (_dyn, tile) => {
            const dynFilter = colliderLayerMask(binding.entity);
            const layerEntityId = (tile as Phaser.Tilemaps.Tile).layer as unknown as Phaser.Tilemaps.TilemapLayer;
            const entityId = layerEntityId.getData("gkEntityId") as string | undefined;
            if (entityId) {
              this.collisionContacts.push({
                entityId: binding.entity.id,
                otherEntityId: entityId,
              });
            }
            return solidCollides(dynFilter.mask, 1);
          });
        }
      }
    }

    if (this.playerBinding) {
      const playerFilter = colliderLayerMask(this.playerBinding.binding.entity);
      this.physics.add.overlap(
        this.playerBinding.binding.gameObject,
        triggerGroup,
        (_player, triggerObj) => {
          this.handleTriggerOverlap(triggerObj as Phaser.GameObjects.GameObject);
        },
        (_player, triggerObj) => {
          // Match Skia's trigger rule: both masks must accept the other's layer.
          const triggerBinding = this.objectBindings.get(triggerObj as Phaser.GameObjects.GameObject);
          if (!triggerBinding) return true;
          return triggerOverlaps(playerFilter, colliderLayerMask(triggerBinding.entity));
        },
      );
    }

    if (this.cameraFollowData) {
      const targetBinding = this.bindings.get(this.cameraFollowData.targetId);
      if (targetBinding) {
        // Aligned with Skia's createCameraFollow (packages/runtime/src/camera.ts):
        // "smoothing" is a pure per-frame exponential lerp factor (0-1, higher =
        // snappier). Same value → same camera motion on both runtimes — no remap,
        // no deadzone, no follow offset.
        const lerp = Phaser.Math.Clamp(this.cameraFollowData.smoothing, 0, 1);
        this.cameras.main.startFollow(targetBinding.gameObject, false, lerp, lerp);
      }
    }

    this.setupInput();

    this.timelineState = {
      elapsed: 0,
      playing: this.sceneData.timeline.playing,
    };

    this.particleGraphics = this.add.graphics();
    this.particleGraphics.setDepth(1000);
    for (const entity of this.activeEntities) {
      if (findComponent<ParticleSystemComponent>(entity, "ParticleSystem")) {
        this.particleEmitters.set(entity.id, createParticleEmitter());
      }
    }

    this.setupAudio();

    const engine = this.ensureRulesEngine();
    engine.start();

    // Run onStart scripts (with rules hooks)
    for (const entity of this.activeEntities) {
      const script = findComponent<ScriptComponent>(entity, "Script");
      if (script) {
        evaluateScriptEvent("start", script, engine.scriptContext(entity.id, {
          destroyEntity: (id) => this.destroyEntityById(id),
          rigidBodies: this.rigidBodies,
          playSound: (assetId) => {
            for (const e of this.activeEntities) {
              const audio = e.components.find((c) => c.type === "AudioSource");
              if (audio && audio.type === "AudioSource" && audio.assetId === assetId) {
                this.playSound(e.id);
              }
            }
          },
        }));
      }
    }

    this.refreshHud();

    if (this.gameRules.fallDeathEnabled && this.gameRules.onFall === "respawn" && this.gameRules.lives > 0) {
      this.livesText = this.add
        .text(this.scale.width - 16, 14, `Lives: ${this.livesRemaining}`, {
          fontFamily: "IBM Plex Sans, system-ui, sans-serif",
          fontSize: "16px",
          color: "#f1c40f",
        })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(1600);
    }

    if (this.transitionData && this.transitionData.type === "fade") {
      const duration = Math.round((this.transitionData.duration ?? 0.3) * 1000);
      this.cameras.main.fadeIn(duration, 0, 0, 0);
    }

    this.setupTouchJoystick();
    this.setupGuiHud();
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.1);

    if (this.gameOver || this.won) {
      return;
    }

    this.ensureRulesEngine().update(dt);
    updateSceneAudio(this, this.activeEntities, this.sounds);
    this.processCollisionEvents();

    if (this.playerBinding) {
      const { binding, controller, controllerData } = this.playerBinding;
      const input = resolveScenePlayerInput(
        this.keys,
        {
          jump: this.touchJump,
          fire: this.touchFire,
          action: this.touchAction,
          dx: this.joystickDx,
          dy: this.joystickDy,
        },
        this.sceneData.inputMap,
      );
      const jumpDown = input.jump;
      // Only jump on the frame the key is pressed — holding must not re-apply impulse
      const jumpPressed = jumpDown && !this.jumpHeldLastFrame;
      this.jumpHeldLastFrame = jumpDown;
      if (jumpPressed) {
        this.jumpBufferFrames = GameKitPhaserScene.JUMP_BUFFER;
      } else if (this.jumpBufferFrames > 0) {
        this.jumpBufferFrames -= 1;
      }

      const body = binding.body!;
      const touchingGround = body.blocked.down || body.touching.down;

      if (touchingGround) {
        this.groundedGraceFrames = GameKitPhaserScene.GROUND_GRACE;
      } else if (this.groundedGraceFrames > 0) {
        this.groundedGraceFrames -= 1;
      }

      const grounded = touchingGround || this.groundedGraceFrames > 0;
      controller.setGrounded(grounded);

      // Kill downward residual velocity when standing on floor (stops Y jitter / bounce loop)
      if (touchingGround && body.velocity.y > 0 && !jumpPressed) {
        body.setVelocityY(0);
      }

      const isTopDown = controllerData.gravity === 0;
      if (isTopDown) {
        // Free 4-way movement when player gravity is zero.
        const dx = Number(input.right) - Number(input.left);
        const up =
          Boolean(input.up) || (controllerData.jumpVelocity === 0 && input.jump);
        const dy = Number(Boolean(input.down)) - Number(up);
        let vx = dx * controllerData.speed;
        let vy = dy * controllerData.speed;
        if (dx !== 0 && dy !== 0) {
          const inv = 1 / Math.SQRT2;
          vx *= inv;
          vy *= inv;
        }
        body.setVelocity(vx, vy);
        body.setAllowGravity(false);
      } else {
        // Horizontal only from controller; Phaser arcade owns gravity/Y.
        const direction = Number(input.right) - Number(input.left);
        const moveSpeed = touchingGround ? controllerData.speed : controllerData.speed * 0.85;
        body.setVelocityX(direction * moveSpeed);

        // Jump when on the ground (or coyote grace), edge-triggered + buffered
        if (this.jumpBufferFrames > 0 && grounded) {
          body.setVelocityY(-controllerData.jumpVelocity);
          this.jumpBufferFrames = 0;
          this.groundedGraceFrames = 0;
          controller.setGrounded(false);
        }

        // Cap upward speed so a bad impulse can never fling the player off-screen
        const maxUp = Math.max(controllerData.jumpVelocity, 200);
        if (body.velocity.y < -maxUp) {
          body.setVelocityY(-maxUp);
        }
      }

      // Fall / hazards evaluated in RulesEngine.update (uses player transforms from bindings)

      controller.state.velocity.x = body.velocity.x;
      controller.state.velocity.y = body.velocity.y;

      // Keep entity transform in sync for scripts / camera
      const transform = findComponent<TransformComponent>(binding.entity, "Transform");
      if (transform && typeof binding.gameObject.x === "number") {
        transform.position.x = binding.gameObject.x;
        transform.position.y = binding.gameObject.y ?? transform.position.y;
      }
    }

    playTimeline(this.sceneData, this.timelineState, dt);

    for (const entity of this.activeEntities) {
      const binding = this.bindings.get(entity.id);
      if (!binding) continue;

      const transform = findComponent<TransformComponent>(entity, "Transform");
      if (!transform) continue;

      // Tween parity with mobile runtime
      const tweens = entity.components.filter((c): c is TweenComponent => c.type === "Tween");
      for (const tween of tweens) {
        updateTween(tween, transform, dt);
      }

      const followPath = findComponent<FollowPathComponent>(entity, "FollowPath");
      if (followPath) {
        updateFollowPath(followPath, transform, dt);
      }

      // Ensure StateMachine has currentState
      const sm = findComponent<StateMachineComponent>(entity, "StateMachine");
      if (sm && !sm.currentState) {
        sm.currentState = sm.initialState;
      }

      const go = binding.gameObject;
      // Dynamic bodies drive transform from physics; non-physics objects from transform
      if (binding.body && !binding.isStatic && !binding.isTrigger && typeof go.x === "number") {
        this.resolvePolygonSolids(entity, binding, transform);
        transform.position.x = go.x;
        transform.position.y = go.y;
      } else {
        if (go.setPosition) go.setPosition(transform.position.x, transform.position.y);
        if (go.setRotation) go.setRotation(Phaser.Math.DegToRad(transform.rotation));
        if (go.setScale) go.setScale(transform.scale.x, transform.scale.y);

        if (go.body && (binding.isStatic || binding.isTrigger)) {
          if ("updateFromGameObject" in go.body) {
            (go.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
          }
        }
      }

      const light = this.lightSources.get(entity.id);
      if (light) {
        light.x = transform.position.x;
        light.y = transform.position.y;
      }
    }

    // Per-frame Script "update" events (after transforms are synced)
    const updateEngine = this.ensureRulesEngine();
    for (const entity of this.activeEntities) {
      const script = findComponent<ScriptComponent>(entity, "Script");
      if (!script || !hasScriptHandler(script, "update")) continue;
      evaluateScriptEvent("update", script, updateEngine.scriptContext(entity.id, {
        dt,
        destroyEntity: (id) => this.destroyEntityById(id),
        rigidBodies: this.rigidBodies,
        playSound: (assetId) => {
          for (const e of this.activeEntities) {
            const audio = e.components.find((c) => c.type === "AudioSource");
            if (audio && audio.type === "AudioSource" && audio.assetId === assetId) {
              this.playSound(e.id);
            }
          }
        },
      }));
    }

    // Particle systems
    if (this.particleGraphics) {
      this.particleGraphics.clear();
      for (const entity of this.activeEntities) {
        const ps = findComponent<ParticleSystemComponent>(entity, "ParticleSystem");
        const transform = findComponent<TransformComponent>(entity, "Transform");
        if (!ps || !transform) continue;
        let emitter = this.particleEmitters.get(entity.id);
        if (!emitter) {
          emitter = createParticleEmitter();
          this.particleEmitters.set(entity.id, emitter);
        }
        const particles = updateParticleEmitter(
          emitter,
          ps,
          transform.position,
          this.sceneData.gravity?.y ?? 0,
          dt,
        );
        for (const p of particles) {
          const c = Phaser.Display.Color.ValueToColor(particleRenderColor(p));
          this.particleGraphics.fillStyle(c.color, particleRenderAlpha(p));
          this.particleGraphics.fillCircle(p.x, p.y, Math.max(0.5, particleRenderSize(p) / 2));
        }
      }
    }

    // Keep HUD text fixed to camera
    for (const tb of this.textBindings) {
      // no-op: scrollFactor already 0
    }
  }

  private setupAudio(): void {
    setupSceneAudio(this, this.activeEntities, this.sounds);
  }

  playSound(entityId: string): void {
    playSceneSound(this.sounds, entityId);
  }

  stopSound(entityId: string): void {
    stopSceneSound(this.sounds, entityId);
  }

  private stopAllSounds(): void {
    stopSceneAudio(this.sounds);
  }

  private setupInput(): void {
    this.keys = configureSceneKeyboard(this.input.keyboard, this.sceneData.inputMap);
    this.setupGestureRecognition();
  }

  private setupGestureRecognition(): void {
    const recognizer = createGestureRecognizer();
    this.gestureRecognizer = recognizer;
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      recognizer.pointerDown(pointer.id, pointer.x, pointer.y, Date.now());
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      const gesture = recognizer.pointerMove(pointer.id, pointer.x, pointer.y, Date.now());
      if (gesture) this.dispatchGesture(gesture);
    });
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      const gesture = recognizer.pointerUp(pointer.id, pointer.x, pointer.y, Date.now());
      if (gesture) this.dispatchGesture(gesture);
    });
    this.input.on("pointercancel", (pointer: Phaser.Input.Pointer) => {
      recognizer.pointerCancel(pointer.id);
    });
  }

  private dispatchGesture(gesture: RecognizedGesture): void {
    const eventName = gestureScriptEventName(gesture);
    const engine = this.ensureRulesEngine();
    for (const entity of this.activeEntities) {
      const script = findComponent<ScriptComponent>(entity, "Script");
      if (!script || !hasScriptHandler(script, eventName)) continue;
      evaluateScriptEvent(eventName, script, engine.scriptContext(entity.id, {
        destroyEntity: (id) => this.destroyEntityById(id),
        rigidBodies: this.rigidBodies,
        playSound: (assetId) => {
          for (const e of this.activeEntities) {
            const audio = e.components.find((c) => c.type === "AudioSource");
            if (audio && audio.type === "AudioSource" && audio.assetId === assetId) {
              this.playSound(e.id);
            }
          }
        },
      }));
    }
  }

  private setupTouchJoystick(): void {
    const thisScene = this;
    setupTouchJoystickInput(
      this,
      {
        get active() { return thisScene.joystickActive; },
        set active(value: boolean) { thisScene.joystickActive = value; },
        get center() { return thisScene.joystickCenter; },
        set center(value: { x: number; y: number }) { thisScene.joystickCenter = value; },
        get dx() { return thisScene.joystickDx; },
        set dx(value: number) { thisScene.joystickDx = value; },
        get dy() { return thisScene.joystickDy; },
        set dy(value: number) { thisScene.joystickDy = value; },
        get jump() { return thisScene.touchJump; },
        set jump(value: boolean) { thisScene.touchJump = value; },
        get fire() { return thisScene.touchFire; },
        set fire(value: boolean) { thisScene.touchFire = value; },
        get action() { return thisScene.touchAction; },
        set action(value: boolean) { thisScene.touchAction = value; },
      },
      this.sceneData.inputMap,
    );
  }

  /** Screen-space GUI / HUD from scene.gui.nodes + componentInstances */
  private setupGuiHud(): void {
    for (const obj of this.guiObjects) obj.destroy();
    this.guiObjects = [];

    const componentMap = new Map(this.guiComponents.map((c) => [c.id, c]));
    for (const instance of this.sceneData.gui?.componentInstances ?? []) {
      if (instance.visible === false) continue;
      const component = componentMap.get(instance.componentId);
      if (!component) continue;
      for (const node of component.nodes) {
        if (node.visible === false) continue;
        const offsetNode = offsetGuiNode(node, instance);
        this.guiObjects.push(...this.createGuiNodeObjects(offsetNode));
      }
    }

    const nodes = this.sceneData.gui?.nodes ?? [];
    for (const node of nodes) {
      if (node.visible === false) continue;
      this.guiObjects.push(...this.createGuiNodeObjects(node));
    }
  }

  private buildGuiScriptContext(entityId: string): ScriptContext {
    return {
      entityId,
      entities: this.activeEntities,
      sceneManager: this.sceneManager,
      destroyEntity: (id) => this.destroyEntityById(id),
      playSound: (assetId) => {
        for (const e of this.activeEntities) {
          const audio = e.components.find((c) => c.type === "AudioSource");
          if (audio && audio.type === "AudioSource" && audio.assetId === assetId) {
            this.playSound(e.id);
          }
        }
      },
    };
  }

  private dispatchGuiAction(action: string): void {
    for (const entity of this.activeEntities) {
      const script = findComponent<ScriptComponent>(entity, "Script");
      if (script) {
        evaluateScriptEvent(action, script, this.buildGuiScriptContext(entity.id));
      }
    }
    this.onGuiAction?.(action);
  }

  private createGuiNodeObjects(node: GuiNode): Phaser.GameObjects.GameObject[] {
    const created: Phaser.GameObjects.GameObject[] = [];
    if (node.type === "Text") {
      const t = this.add
        .text(node.x, node.y, node.text, {
          fontFamily: "IBM Plex Sans, system-ui, sans-serif",
          fontSize: `${node.fontSize ?? 16}px`,
          color: node.color ?? "#ffffff",
          align: node.align ?? "left",
          wordWrap: { width: node.width },
        })
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(1500);
      created.push(t);
    } else if (node.type === "Button") {
      const bg = this.add
        .rectangle(
          node.x + node.width / 2,
          node.y + node.height / 2,
          node.width,
          node.height,
          Phaser.Display.Color.ValueToColor(node.backgroundColor ?? "#333333").color,
          0.95,
        )
        .setScrollFactor(0)
        .setDepth(1500)
        .setInteractive({ useHandCursor: true });
      const label = this.add
        .text(node.x + node.width / 2, node.y + node.height / 2, node.text, {
          fontFamily: "IBM Plex Sans, system-ui, sans-serif",
          fontSize: `${node.fontSize ?? 14}px`,
          color: node.color ?? "#ffffff",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1501);
      if (node.action) {
        bg.on("pointerup", () => {
          this.dispatchGuiAction(node.action!);
        });
      }
      created.push(bg, label);
    } else if (node.type === "Image") {
      const key = node.assetId;
      if (this.textures.exists(key)) {
        const img = this.add
          .image(node.x + node.width / 2, node.y + node.height / 2, key)
          .setDisplaySize(node.width, node.height)
          .setScrollFactor(0)
          .setDepth(1500);
        created.push(img);
      } else {
        const placeholder = this.add
          .rectangle(
            node.x + node.width / 2,
            node.y + node.height / 2,
            node.width,
            node.height,
            0x444466,
            0.8,
          )
          .setScrollFactor(0)
          .setDepth(1500);
        created.push(placeholder);
      }
    }
    return created;
  }

  /** Software raycast against active entity colliders (parity with mobile). */
  raycastScene(
    origin: { x: number; y: number },
    direction: { x: number; y: number },
    maxDistance = 1000,
  ) {
    return raycast(origin, direction, this.activeEntities, { maxDistance });
  }

  /**
   * Dispatch `collisionEnter` to scripts and StateMachines when a dynamic body
   * first contacts a static solid this frame (edge-triggered, matching Skia).
   * Contacts are collected from Arcade colliders during the physics step.
   */
  private processCollisionEvents(): void {
    const update = updateCollisionEvents(this.collisionContacts, this.collisionState);
    this.collisionState = update.active;
    this.collisionContacts = [];

    if (update.events.length === 0) return;

    const engine = this.ensureRulesEngine();
    for (const event of update.events) {
      const e1 = this.activeEntities.find((e) => e.id === event.entityId);
      const e2 = this.activeEntities.find((e) => e.id === event.otherEntityId);

      for (const entity of [e1, e2]) {
        if (!entity) continue;
        const ctx = engine.scriptContext(entity.id, {
          destroyEntity: (id: string) => this.destroyEntityById(id),
          rigidBodies: this.rigidBodies,
          playSound: (assetId: string) => {
            for (const e of this.activeEntities) {
              const audio = e.components.find((c) => c.type === "AudioSource");
              if (audio && audio.type === "AudioSource" && audio.assetId === assetId) {
                this.playSound(e.id);
              }
            }
          },
        });
        const sm = findComponent<StateMachineComponent>(entity, "StateMachine");
        if (sm && sm.currentState) {
          const stateObj = sm.states.find((s) => s.name === sm.currentState);
          if (stateObj?.on?.["collisionEnter"]) {
            transitionFsm(sm, stateObj.on["collisionEnter"], ctx);
          }
        }
        const script = findComponent<ScriptComponent>(entity, "Script");
        if (script) {
          evaluateScriptEvent("collisionEnter", script, ctx);
        }
      }
    }
  }

  private handleTriggerOverlap(triggerObj: Phaser.GameObjects.GameObject): void {
    let matchedId: string | null = null;
    for (const [id, binding] of this.bindings) {
      if (binding.gameObject === triggerObj) {
        matchedId = id;
        break;
      }
    }
    if (!matchedId || !this.bindings.has(matchedId)) return;

    const entity = this.activeEntities.find((e) => e.id === matchedId);
    if (!entity) return;

    // Detach immediately so the same overlap cannot fire twice in one frame
    this.bindings.delete(matchedId);

    const engine = this.ensureRulesEngine();
    const playerId = this.playerBinding?.binding.entity.id;

    const script = findComponent<ScriptComponent>(entity, "Script");
    if (script) {
      const ctx = engine.scriptContext(entity.id, {
        destroyEntity: (id: string) => this.destroyEntityById(id),
        rigidBodies: this.rigidBodies,
        playSound: (assetId: string) => {
          for (const e of this.activeEntities) {
            const audio = e.components.find((c) => c.type === "AudioSource");
            if (audio && audio.type === "AudioSource" && audio.assetId === assetId) {
              this.playSound(e.id);
            }
          }
        },
      });
      const sm = findComponent<StateMachineComponent>(entity, "StateMachine");
      if (sm && sm.currentState) {
        const stateObj = sm.states.find((s) => s.name === sm.currentState);
        if (stateObj?.on?.["triggerEnter"]) {
          transitionFsm(sm, stateObj.on["triggerEnter"], ctx);
        }
      }
      evaluateScriptEvent("onTriggerEnter", script, ctx);
      evaluateScriptEvent("triggerEnter", script, ctx);
    }

    // Rules engine: collect / reach / tagContact (replaces name heuristics)
    const beforeDestroyed = !this.activeEntities.some((e) => e.id === matchedId);
    engine.handleTriggerEnter(matchedId, playerId);
    if (!beforeDestroyed && !this.activeEntities.some((e) => e.id === matchedId)) {
      // Entity was collected — count for HUD coin display
      this.coinsCollected += 1;
      this.refreshHud();
    } else if (this.bindings.has(matchedId) === false && this.activeEntities.some((e) => e.id === matchedId)) {
      // Trigger handled but entity kept (e.g. goal) — leave entity without re-binding
    }
  }

  private destroyEntityById(entityId: string): void {
    const tileLayer = this.tileLayerByEntity.get(entityId);
    if (tileLayer) {
      tileLayer.destroy();
      this.tileLayers = this.tileLayers.filter((l) => l !== tileLayer);
      this.tileLayerByEntity.delete(entityId);
    }
    const binding = this.bindings.get(entityId);
    if (binding) {
      binding.gameObject.destroy();
      this.bindings.delete(entityId);
      this.objectBindings.delete(binding.gameObject);
    }
    this.activeEntities = this.activeEntities.filter((e) => e.id !== entityId);
    this.particleEmitters.delete(entityId);
    this.rigidBodies.delete(entityId);

    const light = this.lightSources.get(entityId);
    if (light) {
      this.lights.removeLight(light);
      this.lightSources.delete(entityId);
    }
  }

  private refreshHud(): void {
    refreshSceneHud(this.textBindings, this.coinsCollected, this.totalCoins);
  }

  private showWin(message: string): void {
    if (this.gameOver || this.won) return;
    this.won = true;
    if (this.playerBinding?.binding.body) {
      this.playerBinding.binding.body.setVelocity(0, 0);
      this.playerBinding.binding.body.moves = false;
    }
    // Auto-save progress when a slot is configured and the host exposes a snapshot.
    if (this.hostOptions.saveSlot) {
      const snapshot = this.sceneManager?.exportSaveSnapshot?.();
      if (snapshot) {
        void saveGame(this.hostOptions.saveSlot, snapshot).catch(() => undefined);
      }
    }
    this.showOverlay(message || this.gameRules.winMessage, "#00f0ff");
  }

  private triggerGameOver(message?: string): void {
    if (this.won || this.gameOver) return;
    this.gameOver = true;
    if (this.playerBinding?.binding.body) {
      this.playerBinding.binding.body.setVelocity(0, 0);
      this.playerBinding.binding.body.moves = false;
    }
    this.showOverlay(message || this.gameRules.gameOverMessage, "#ff6b8a");
  }

  private showOverlay(message: string, color: string): void {
    if (this.hostOptions.suppressOutcomeOverlay) return;
    this.winText = showSceneOverlay(this, this.winText, message, color);
  }

  /**
   * Renders a Tilemap as a Phaser tilemap layer anchored at the entity's
   * Transform position. Tile ids are 1-based (0 = empty) in the schema;
   * Phaser uses -1 for empty and 0 for the first tileset frame. When the
   * tilemap is `solid`, every placed tile becomes a static collision body.
   */
  private createTilemapLayer(
    entityId: string,
    transform: TransformComponent,
    tilemap: TilemapComponent,
  ): void {
    if (!this.textures.exists(tilemap.tilesetId)) return;

    const data: number[][] = [];
    for (let gy = 0; gy < tilemap.gridHeight; gy++) {
      const row: number[] = [];
      for (let gx = 0; gx < tilemap.gridWidth; gx++) {
        const tileId = tilemap.tiles[gy * tilemap.gridWidth + gx] ?? 0;
        row.push(tileId === 0 ? -1 : tileId - 1);
      }
      data.push(row);
    }

    const map = this.make.tilemap({
      data,
      tileWidth: tilemap.tileWidth,
      tileHeight: tilemap.tileHeight,
    });
    const tileset = map.addTilesetImage(
      tilemap.tilesetId,
      undefined,
      tilemap.tileWidth,
      tilemap.tileHeight,
    );
    if (!tileset) return;

    const layer = map.createLayer(0, tileset, transform.position.x, transform.position.y);
    if (!layer) return;

    if (tilemap.solid) {
      layer.setCollisionByExclusion([-1]);
      layer.setData("gkEntityId", entityId);
      this.tileLayers.push(layer);
      this.tileLayerByEntity.set(entityId, layer);
    }
  }

  private createEntity(
    entity: GameKitEntity,
    staticGroup: Phaser.Physics.Arcade.StaticGroup,
    triggerGroup: Phaser.Physics.Arcade.StaticGroup,
  ): void {
    const transform = findComponent<TransformComponent>(entity, "Transform");
    if (!transform) return;

    const tilemapComp = findComponent<TilemapComponent>(entity, "Tilemap");
    if (tilemapComp) {
      this.createTilemapLayer(entity.id, transform, tilemapComp);
      return;
    }

    const spriteComp = findComponent<SpriteComponent>(entity, "Sprite");
    const animComp = findComponent<AnimationComponent>(entity, "Animation");
    const colliderComp = findComponent<AabbColliderComponent>(entity, "AabbCollider");
    const circleColliderComp = findComponent<CircleColliderComponent>(entity, "CircleCollider");
    const polygonColliderComp = findComponent<PolygonColliderComponent>(entity, "PolygonCollider");
    const playerComp = findComponent<PlayerControllerComponent>(entity, "PlayerController");
    const rigidBodyComp = findComponent<RigidBodyComponent>(entity, "RigidBody");
    const cameraComp = findComponent<CameraFollowComponent>(entity, "CameraFollow");
    const textComp = findComponent<TextComponent>(entity, "Text");
    const nineSliceComp = findComponent<NineSliceComponent>(entity, "NineSlice");

    // HUD / world text (no physics)
    if (textComp && !spriteComp && !animComp) {
      const isHud =
        transform.position.x < this.sceneData.viewport.width &&
        transform.position.y < 80;
      const fontFamily = (textComp.fontAssetId && this.loadedFonts.get(textComp.fontAssetId))
        || "IBM Plex Sans, system-ui, sans-serif";
      const textObject = this.add
        .text(transform.position.x, transform.position.y, textComp.text, {
          fontFamily,
          fontSize: `${textComp.size || 16}px`,
          color: textComp.color || "#ffffff",
          align: textComp.align || "left",
          wordWrap: textComp.width
            ? { width: textComp.width, useAdvancedWrap: false }
            : undefined,
        })
        .setOrigin(
          textComp.align === "center" ? 0.5 : textComp.align === "right" ? 1 : 0,
          0,
        )
        .setDepth(1500);
      if (isHud) {
        textObject.setScrollFactor(0);
      }
      this.textBindings.push({
        entityId: entity.id,
        textObject,
        baseTemplate: textComp.text,
      });
      return;
    }

    let gameObject: Phaser.GameObjects.GameObject;
    let originX = 0;
    let originY = 0;

    if (animComp) {
      const sprite = this.add.sprite(
        transform.position.x,
        transform.position.y,
        animComp.assetId,
      );
      const animKey = `${entity.id}-anim`;
      if (!this.anims.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(animComp.assetId, {
            start: 0,
            end: animComp.totalFrames - 1,
          }),
          frameRate: animComp.framesPerSecond,
          repeat: animComp.loop ? -1 : 0,
        });
      }
      sprite.play(animKey);
      const startFrame = animComp.currentFrame ?? 0;
      if (startFrame > 0) {
        const currentAnim = sprite.anims.currentAnim;
        if (currentAnim) {
          const animFrame = currentAnim.frames[startFrame];
          if (animFrame) sprite.anims.setCurrentFrame(animFrame);
        }
      }
      gameObject = sprite;
    } else if (spriteComp) {
      if (this.textures.exists(spriteComp.assetId)) {
        const image = this.add.image(
          transform.position.x,
          transform.position.y,
          spriteComp.assetId,
        );
        image.setDisplaySize(spriteComp.width, spriteComp.height);
        image.setOrigin(spriteComp.anchor.x, spriteComp.anchor.y);
        originX = spriteComp.anchor.x;
        originY = spriteComp.anchor.y;
        gameObject = image;
      } else {
        // Fallback colored rect when asset missing
        const color = entity.name.toLowerCase().includes("coin")
          ? 0xf1c40f
          : entity.name.toLowerCase().includes("player")
            ? 0x4a9eff
            : 0x8b6914;
        const rect = this.add.rectangle(
          transform.position.x,
          transform.position.y,
          spriteComp.width,
          spriteComp.height,
          color,
        );
        rect.setOrigin(spriteComp.anchor.x, spriteComp.anchor.y);
        originX = spriteComp.anchor.x;
        originY = spriteComp.anchor.y;
        gameObject = rect;
      }
    } else if (nineSliceComp) {
      if (this.textures.exists(nineSliceComp.assetId)) {
        const nineslice = this.add.nineslice(
          transform.position.x,
          transform.position.y,
          nineSliceComp.assetId,
          undefined,
          nineSliceComp.width,
          nineSliceComp.height,
          nineSliceComp.leftWidth,
          nineSliceComp.rightWidth,
          nineSliceComp.topHeight,
          nineSliceComp.bottomHeight
        );
        nineslice.setOrigin(0.5, 0.5);
        originX = 0.5;
        originY = 0.5;
        gameObject = nineslice;
      } else {
        const rect = this.add.rectangle(
          transform.position.x,
          transform.position.y,
          nineSliceComp.width,
          nineSliceComp.height,
          0xff5555
        );
        rect.setOrigin(0.5, 0.5);
        originX = 0.5;
        originY = 0.5;
        gameObject = rect;
      }
    } else if (polygonColliderComp) {
      // Static convex polygon: render a Phaser polygon at the transform. Points
      // are local (collider space), origin (0,0) so the transform sync applies
      // position/rotation/scale around it, matching the Skia SAT solid.
      const localPoints = polygonColliderComp.points.map((p) => ({
        x: p.x + polygonColliderComp.offset.x,
        y: p.y + polygonColliderComp.offset.y,
      }));
      const poly = this.add.polygon(
        transform.position.x,
        transform.position.y,
        localPoints,
        polygonColliderComp.isStatic ? 0x8b5cf6 : 0x8b6914,
        polygonColliderComp.isStatic ? 0.25 : 0,
      );
      poly.setOrigin(0, 0);
      originX = 0;
      originY = 0;
      gameObject = poly;
    } else {
      const rect = this.add.rectangle(
        transform.position.x,
        transform.position.y,
        colliderComp?.size.x ?? 32,
        colliderComp?.size.y ?? 32,
        0x333333,
        colliderComp ? 0.85 : 0,
      );
      rect.setOrigin(0.5, 0.5);
      originX = 0.5;
      originY = 0.5;
      gameObject = rect;
    }

    let body: Phaser.Physics.Arcade.Body | null = null;
    const isTrigger = colliderComp?.isTrigger === true || circleColliderComp?.isTrigger === true;
    const isStatic = colliderComp?.isStatic ?? circleColliderComp?.isStatic ?? false;

    if (colliderComp) {
      const displayWidth =
        "displayWidth" in gameObject
          ? (gameObject as { displayWidth: number }).displayWidth
          : colliderComp.size.x;
      const displayHeight =
        "displayHeight" in gameObject
          ? (gameObject as { displayHeight: number }).displayHeight
          : colliderComp.size.y;

      const offsetX = colliderComp.offset.x + originX * displayWidth;
      const offsetY = colliderComp.offset.y + originY * displayHeight;

      if (isTrigger) {
        // StaticBody (no setImmovable — always immovable)
        triggerGroup.add(gameObject);
        const staticBody = gameObject.body as Phaser.Physics.Arcade.StaticBody;
        staticBody.setSize(colliderComp.size.x, colliderComp.size.y);
        staticBody.setOffset(offsetX, offsetY);
        staticBody.updateFromGameObject();
        body = null;
      } else if (isStatic) {
        staticGroup.add(gameObject);
        const staticBody = gameObject.body as Phaser.Physics.Arcade.StaticBody;
        staticBody.setSize(colliderComp.size.x, colliderComp.size.y);
        staticBody.setOffset(offsetX, offsetY);
        staticBody.updateFromGameObject();
        body = null;
      } else {
        this.physics.add.existing(gameObject, false);
        body = gameObject.body as Phaser.Physics.Arcade.Body;
        // Size/offset in unscaled frame pixels; convert display collider via current scale
        const sx = Math.max(0.0001, Math.abs((gameObject as Phaser.GameObjects.Image).scaleX ?? 1));
        const sy = Math.max(0.0001, Math.abs((gameObject as Phaser.GameObjects.Image).scaleY ?? 1));
        body.setSize(colliderComp.size.x / sx, colliderComp.size.y / sy);
        body.setOffset(offsetX / sx, offsetY / sy);
        body.setCollideWorldBounds(true);
        body.setBounce(0, 0);
        body.setMaxVelocity(600, 1200);
        body.setFriction(0, 0);
      }
    } else if (circleColliderComp) {
      if (isTrigger) {
        triggerGroup.add(gameObject);
        const staticBody = gameObject.body as Phaser.Physics.Arcade.StaticBody;
        staticBody.setCircle(
          circleColliderComp.radius,
          circleColliderComp.offset.x,
          circleColliderComp.offset.y,
        );
        staticBody.updateFromGameObject();
        body = null;
      } else if (isStatic) {
        staticGroup.add(gameObject);
        const staticBody = gameObject.body as Phaser.Physics.Arcade.StaticBody;
        staticBody.setCircle(
          circleColliderComp.radius,
          circleColliderComp.offset.x,
          circleColliderComp.offset.y,
        );
        staticBody.updateFromGameObject();
        body = null;
      } else {
        this.physics.add.existing(gameObject, false);
        body = gameObject.body as Phaser.Physics.Arcade.Body;
        body.setCircle(
          circleColliderComp.radius,
          circleColliderComp.offset.x,
          circleColliderComp.offset.y,
        );
        body.setCollideWorldBounds(true);
      }
    }

    if (polygonColliderComp && polygonColliderComp.isStatic && !polygonColliderComp.isTrigger) {
      // Arcade has no polygon bodies: resolve static convex polygons via the
      // shared Skia SAT core. Push the world-space solid once at spawn (static
      // polygons do not move during a scene).
      const polygon = getEntityPolygon(entity);
      if (polygon) {
        this.polygonSolids.push({
          ...polygon,
          layer: polygonColliderComp.layer ?? 1,
          entityId: entity.id,
        });
      }
    }

    if (rigidBodyComp && body && !isStatic && !isTrigger) {
      // RigidBody parity: honor the shared schema fields on the Arcade body.
      body.setBounce(0);
      if (rigidBodyComp.isKinematic) {
        // Kinematic: moves at its own velocity but is not affected by forces
        // and never gets pushed by other bodies.
        body.setImmovable(true);
        body.setAllowGravity(false);
        body.setDrag(0, 0);
      } else {
        if (rigidBodyComp.useGravity) {
          // Arcade adds body gravity to world gravity, so scale the world value
          // to make effective gravity = world * gravityScale.
          const worldGravityY = this.physics.world.gravity.y;
          const scale = (rigidBodyComp.gravityScale ?? 1) - 1;
          if (scale !== 0) body.setGravityY(worldGravityY * scale);
        } else {
          body.setAllowGravity(false);
        }
        if (rigidBodyComp.drag > 0) {
          // World gravity already applied via game config; drag only on X
          body.setDragX(Math.min(1000, rigidBodyComp.drag * 1000));
        }
      }
      // Initial velocity + mass + angular velocity from the shared fields.
      body.setMass(Math.max(0.001, rigidBodyComp.mass));
      body.setVelocity(rigidBodyComp.velocity.x, rigidBodyComp.velocity.y);
      if (rigidBodyComp.angularVelocity !== 0) {
        body.setAngularVelocity(rigidBodyComp.angularVelocity);
      }
      this.rigidBodies.set(entity.id, createPhaserRigidBody(body, rigidBodyComp));
    }

    // Player: disable default drag fight with controller horizontal velocity
    if (playerComp && body) {
      body.setDrag(0, 0);
      body.setBounce(0, 0);
      body.setAllowGravity(true);
      // Tight caps so the character cannot rocket off the viewport
      body.setMaxVelocity(playerComp.speed, playerComp.jumpVelocity);
    }

    const binding: EntityBinding = {
      entity,
      gameObject: gameObject as EntityBinding["gameObject"],
      body,
      isStatic: isStatic || isTrigger,
      isTrigger,
    };
    this.bindings.set(entity.id, binding);
    this.objectBindings.set(gameObject as Phaser.GameObjects.GameObject, binding);

    if (playerComp) {
      this.playerBinding = {
        binding,
        controller: createPlayerController(playerComp),
        controllerData: playerComp,
      };
    }

    if (cameraComp) {
      this.cameraFollowData = cameraComp;
    }

    if (gameObject && this.hasLights && "setPipeline" in gameObject) {
      (gameObject as any).setPipeline("Light2D");
    }

    const lightComp = findComponent<Light2DComponent>(entity, "Light2D");
    if (lightComp && this.hasLights) {
      try {
        const colorHex = Phaser.Display.Color.HexStringToColor(lightComp.color).color;
        const phaserLight = this.lights.addLight(
          transform.position.x,
          transform.position.y,
          lightComp.range,
          colorHex,
          lightComp.intensity
        );
        this.lightSources.set(entity.id, phaserLight);
      } catch {
        const phaserLight = this.lights.addLight(
          transform.position.x,
          transform.position.y,
          lightComp.range,
          0xffffff,
          lightComp.intensity
        );
        this.lightSources.set(entity.id, phaserLight);
      }
    }
  }

  /**
   * Resolve a dynamic AABB/circle body against the static convex polygon
   * solids (Arcade has no polygon bodies). Reuses the shared Skia SAT core so
   * behavior matches the mobile runtime exactly.
   */
  private resolvePolygonSolids(
    entity: GameKitEntity,
    binding: EntityBinding,
    transform: TransformComponent,
  ): void {
    if (this.polygonSolids.length === 0 || !binding.body) return;
    const aabbComp = findComponent<AabbColliderComponent>(entity, "AabbCollider");
    const circleComp = findComponent<CircleColliderComponent>(entity, "CircleCollider");

    const mask = colliderLayerMask(entity).mask;

    if (aabbComp) {
      const moving: Aabb = {
        x: binding.body.x,
        y: binding.body.y,
        width: binding.body.width,
        height: binding.body.height,
      };
      const velocity = { x: binding.body.velocity.x, y: binding.body.velocity.y };
      const result = applyAabbCollisions(moving, velocity, this.polygonSolids, mask);
      this.setBodyPosition(binding, result.position.x, result.position.y);
      binding.body.setVelocity(result.velocity.x, result.velocity.y);
      this.syncBlockedFlags(binding.body, velocity, result);
      if (result.grounded) {
        transform.position.y = result.position.y - aabbComp.offset.y;
      }
    } else if (circleComp) {
      const moving: Circle = {
        x: binding.body.center.x,
        y: binding.body.center.y,
        radius: binding.body.halfWidth,
      };
      const velocity = { x: binding.body.velocity.x, y: binding.body.velocity.y };
      const result = applyCircleCollisions(moving, velocity, this.polygonSolids, mask);
      this.setBodyPosition(
        binding,
        result.position.x - binding.body.halfWidth,
        result.position.y - binding.body.halfWidth,
      );
      binding.body.setVelocity(result.velocity.x, result.velocity.y);
      if (result.grounded) {
        transform.position.y = result.position.y - circleComp.offset.y;
      }
    }
  }

  /**
   * Reflect the SAT result on the Arcade `blocked` flags so grounded/on-wall
   * detection (e.g. the player controller) also works against polygon solids
   * that Arcade knows nothing about.
   */
  private syncBlockedFlags(
    body: Phaser.Physics.Arcade.Body,
    velocity: { x: number; y: number },
    result: { velocity: { x: number; y: number }; grounded: boolean },
  ): void {
    if (velocity.x !== 0 && result.velocity.x === 0) {
      body.blocked.left = velocity.x < 0;
      body.blocked.right = velocity.x > 0;
      body.touching.left = velocity.x < 0;
      body.touching.right = velocity.x > 0;
    }
    if (velocity.y !== 0 && result.velocity.y === 0) {
      body.blocked.up = velocity.y < 0;
      body.blocked.down = velocity.y > 0;
      body.touching.up = velocity.y < 0;
      body.touching.down = velocity.y > 0;
    }
  }

  /**
   * Move a dynamic Arcade body (and its game object) so its world position
   * becomes (x, y). Arcade re-derives the body from the game object every
   * frame (`updateFromGameObject`), so both must be shifted by the same delta
   * — moving only the body would be overwritten on the next physics step, and
   * moving only the game object would leave the body offset behind.
   */
  private setBodyPosition(binding: EntityBinding, x: number, y: number): void {
    const body = binding.body;
    if (!body) return;
    const dx = x - body.x;
    const dy = y - body.y;
    if (dx === 0 && dy === 0) return;
    const go = binding.gameObject;
    body.position.set(x, y);
    body.prev.set(x, y);
    body.updateCenter();
    go.x += dx;
    go.y += dy;
  }
}

function offsetGuiNode(node: GuiNode, instance: GuiComponentInstance): GuiNode {
  const overrides = instance.nodeOverrides?.[node.id] as Record<string, unknown> | undefined;
  const base = {
    ...node,
    x: node.x + instance.x,
    y: node.y + instance.y,
  };
  if (!overrides) return base as GuiNode;
  const { id: _id, type: _type, ...safe } = overrides;
  return { ...base, ...safe } as GuiNode;
}
