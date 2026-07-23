import Phaser from "phaser";
import type {
  GameKitScene,
  GameKitEntity,
  TransformComponent,
  SpriteComponent,
  AabbColliderComponent,
  CircleColliderComponent,
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
import { evaluateScriptEvent, transitionFsm, type ScriptContext } from "@gamekit/runtime/script";
import { RulesEngine } from "@gamekit/runtime/rules-engine";
import { updateFollowPath } from "@gamekit/runtime/path";
import { updateTween } from "@gamekit/runtime/tween";
import { raycast } from "@gamekit/runtime/collision";

import type { EntityBinding, PlayerBinding, TextBinding, Transformable } from "./scene-types.js";
import { computeWorldBounds, findComponent } from "./scene-helpers.js";
import { preloadEntityAssets } from "./asset-loader.js";
import { configureSceneKeyboard, resolveScenePlayerInput, type SceneInputKeys } from "./scene-input.js";
import { setupTouchJoystick as setupTouchJoystickInput } from "./touch-joystick.js";
import { refreshSceneHud } from "./scene-hud.js";
import { showSceneOverlay } from "./scene-overlay.js";
import {
  playSceneSound,
  setupSceneAudio,
  stopSceneAudio,
  stopSceneSound,
  type SceneSoundMap,
} from "./scene-audio.js";

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
  private lightSources = new Map<string, Phaser.GameObjects.Light>();
  private hasLights = false;
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
  /** Coyote-time / ground stick to avoid Y vibration on platform seams. */
  private groundedGraceFrames = 0;
  private static readonly GROUND_GRACE = 4;
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
    preloadEntityAssets(this.load, this.activeEntities, this.assetUrls, this.loadedFonts);
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
        this.physics.add.collider(binding.gameObject, staticGroup);
      }
    }

    if (this.playerBinding) {
      this.physics.add.overlap(
        this.playerBinding.binding.gameObject,
        triggerGroup,
        (_player, triggerObj) => {
          this.handleTriggerOverlap(triggerObj as Phaser.GameObjects.GameObject);
        },
      );
    }

    if (this.cameraFollowData) {
      const targetBinding = this.bindings.get(this.cameraFollowData.targetId);
      if (targetBinding) {
        // Schema "smoothing" is a lerp factor (higher = snappier). Phaser needs a
        // high enough value or the player runs off-screen while the camera lags.
        const lerp = Phaser.Math.Clamp(
          Math.max(this.cameraFollowData.smoothing, 0.12) * 4,
          0.35,
          1,
        );
        this.cameras.main.setDeadzone(
          this.sceneData.viewport.width * 0.12,
          this.sceneData.viewport.height * 0.15,
        );
        this.cameras.main.startFollow(targetBinding.gameObject, true, lerp, lerp * 0.85);
        this.cameras.main.setFollowOffset(0, 20);
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

        // Jump only when actually touching ground (not mere grace), edge-triggered
        if (jumpPressed && touchingGround) {
          body.setVelocityY(-controllerData.jumpVelocity);
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
      const key = `asset:${node.assetId}`;
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
    const binding = this.bindings.get(entityId);
    if (binding) {
      binding.gameObject.destroy();
      this.bindings.delete(entityId);
    }
    this.activeEntities = this.activeEntities.filter((e) => e.id !== entityId);
    this.particleEmitters.delete(entityId);

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

  private createEntity(
    entity: GameKitEntity,
    staticGroup: Phaser.Physics.Arcade.StaticGroup,
    triggerGroup: Phaser.Physics.Arcade.StaticGroup,
  ): void {
    const transform = findComponent<TransformComponent>(entity, "Transform");
    if (!transform) return;

    const spriteComp = findComponent<SpriteComponent>(entity, "Sprite");
    const animComp = findComponent<AnimationComponent>(entity, "Animation");
    const colliderComp = findComponent<AabbColliderComponent>(entity, "AabbCollider");
    const circleColliderComp = findComponent<CircleColliderComponent>(entity, "CircleCollider");
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

    if (rigidBodyComp && body && !isStatic && !isTrigger) {
      // World gravity already applied via game config; drag only on X
      body.setDragX(Math.min(1000, rigidBodyComp.drag * 1000));
      body.setBounce(0);
      if (!rigidBodyComp.useGravity) {
        body.setAllowGravity(false);
      }
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
