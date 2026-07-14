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
  AudioSourceComponent,
  SceneTransitionDef,
} from "@gamekit/schema";
import {
  DEFAULT_INPUT_MAP,
  resolveFallDeathY,
  resolveGameRules,
} from "@gamekit/schema";
import { createPlayerController, type PlayerControllerInput } from "@gamekit/runtime/player";
import { playTimeline, type TimelineState } from "@gamekit/runtime/timeline";
import {
  createParticleEmitter,
  updateParticleEmitter,
  particleRenderColor,
  particleRenderSize,
  particleRenderAlpha,
  type ParticleEmitterState,
} from "@gamekit/runtime/particles";
import { evaluateScriptEvent } from "@gamekit/runtime/script";

type Transformable = {
  x: number;
  y: number;
  setPosition(x: number, y: number): unknown;
  setRotation(radians: number): unknown;
  setScale(x: number, y?: number): unknown;
};

type EntityBinding = {
  entity: GameKitEntity;
  gameObject: Phaser.GameObjects.GameObject & Transformable;
  body: Phaser.Physics.Arcade.Body | null;
  isStatic: boolean;
  isTrigger: boolean;
};

type PlayerBinding = {
  binding: EntityBinding;
  controller: ReturnType<typeof createPlayerController>;
  controllerData: PlayerControllerComponent;
};

type TextBinding = {
  entityId: string;
  textObject: Phaser.GameObjects.Text;
  baseTemplate: string;
};

function findComponent<T extends { type: string }>(
  entity: GameKitEntity,
  type: T["type"],
): T | undefined {
  return entity.components.find((c) => c.type === type) as T | undefined;
}

function computeWorldBounds(scene: GameKitScene): { width: number; height: number } {
  let maxX = scene.viewport.width;
  let maxY = scene.viewport.height;

  for (const entity of scene.entities) {
    const transform = findComponent<TransformComponent>(entity, "Transform");
    if (!transform) continue;
    const sprite = findComponent<SpriteComponent>(entity, "Sprite");
    const aabb = findComponent<AabbColliderComponent>(entity, "AabbCollider");
    const halfW = sprite ? sprite.width / 2 : aabb ? aabb.size.x / 2 : 0;
    const halfH = sprite ? sprite.height / 2 : aabb ? aabb.size.y / 2 : 0;
    maxX = Math.max(maxX, transform.position.x + halfW + 64);
    maxY = Math.max(maxY, transform.position.y + halfH + 64);
  }

  return {
    width: Math.max(scene.viewport.width, Math.ceil(maxX)),
    height: Math.max(scene.viewport.height, Math.ceil(maxY)),
  };
}

export class GameKitPhaserScene extends Phaser.Scene {
  private sceneData: GameKitScene;
  private assetUrls: Record<string, string>;
  private bindings: Map<string, EntityBinding> = new Map();
  private playerBinding: PlayerBinding | null = null;
  private cameraFollowData: CameraFollowComponent | null = null;
  private timelineState: TimelineState = { elapsed: 0, playing: false };
  private keys!: {
    left: Phaser.Input.Keyboard.Key[];
    right: Phaser.Input.Keyboard.Key[];
    jump: Phaser.Input.Keyboard.Key[];
  };
  private particleEmitters = new Map<string, ParticleEmitterState>();
  private particleGraphics: Phaser.GameObjects.Graphics | null = null;
  private sounds = new Map<string, Phaser.Sound.BaseSound>();
  private textBindings: TextBinding[] = [];
  private coinsCollected = 0;
  private totalCoins = 0;
  private activeEntities: GameKitEntity[] = [];
  private winText: Phaser.GameObjects.Text | null = null;
  private won = false;
  private gameOver = false;
  private gameRules: ReturnType<typeof resolveGameRules> = resolveGameRules();
  private fallY = 99999;
  private spawnPoint = { x: 80, y: 300 };
  private livesRemaining = 3;
  private fallCooldown = 0;
  private livesText: Phaser.GameObjects.Text | null = null;
  /** Previous-frame jump key state for edge-triggered jumps (prevents rocket while held). */
  private jumpHeldLastFrame = false;
  /** Coyote-time / ground stick to avoid Y vibration on platform seams. */
  private groundedGraceFrames = 0;
  private static readonly GROUND_GRACE = 4;
  private transitionData: SceneTransitionDef | null = null;
  private joystickBase: Phaser.GameObjects.Graphics | null = null;
  private joystickThumb: Phaser.GameObjects.Graphics | null = null;
  private joystickActive = false;
  private joystickCenter = { x: 0, y: 0 };
  private joystickDx = 0;
  private joystickDy = 0;
  private loadedFonts = new Map<string, string>();

  constructor(sceneData: GameKitScene, assetUrls: Record<string, string>, transition?: SceneTransitionDef) {
    super("GameKitScene");
    this.sceneData = sceneData;
    this.assetUrls = assetUrls;
    this.activeEntities = structuredClone(sceneData.entities);
    this.gameRules = resolveGameRules(sceneData.gameRules);
    this.fallY = resolveFallDeathY(sceneData, this.gameRules);
    this.livesRemaining = this.gameRules.lives > 0 ? this.gameRules.lives : 0;
    this.transitionData = transition ?? null;
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

  preload(): void {
    const loadedKeys = new Set<string>();

    for (const entity of this.activeEntities) {
      const sprite = findComponent<SpriteComponent>(entity, "Sprite");
      const anim = findComponent<AnimationComponent>(entity, "Animation");

      if (anim) {
        if (!loadedKeys.has(anim.assetId) && this.assetUrls[anim.assetId]) {
          this.load.spritesheet(anim.assetId, this.assetUrls[anim.assetId], {
            frameWidth: anim.frameWidth,
            frameHeight: anim.frameHeight,
          });
          loadedKeys.add(anim.assetId);
        }
      } else if (sprite) {
        if (!loadedKeys.has(sprite.assetId) && this.assetUrls[sprite.assetId]) {
          this.load.image(sprite.assetId, this.assetUrls[sprite.assetId]);
          loadedKeys.add(sprite.assetId);
        }
      }

      const audio = findComponent<AudioSourceComponent>(entity, "AudioSource");
      if (audio && !loadedKeys.has(audio.assetId) && this.assetUrls[audio.assetId]) {
        this.load.audio(audio.assetId, this.assetUrls[audio.assetId]);
        loadedKeys.add(audio.assetId);
      }
      const text = findComponent<TextComponent>(entity, "Text");
      if (text?.fontAssetId && !loadedKeys.has(`font:${text.fontAssetId}`) && this.assetUrls[text.fontAssetId]) {
        loadedKeys.add(`font:${text.fontAssetId}`);
        const family = `GKFont-${text.fontAssetId}`;
        const url = this.assetUrls[text.fontAssetId];
        const css = `@font-face{font-family:'${family}';src:url('${url}') format('${this.fontFormat(url)}');font-display:swap;}`;
        const style = document.createElement("style");
        style.textContent = css;
        document.head.appendChild(style);
        const font = new FontFace(family, `url(${url})`);
        font.load().then((loaded) => {
          (document.fonts as unknown as { add(f: FontFace): void }).add(loaded);
          this.loadedFonts.set(text.fontAssetId, family);
        }).catch(() => {});
      }
    }
  }

  private fontFormat(url: string): string {
    const ext = url.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "woff2") return "woff2";
    if (ext === "woff") return "woff";
    if (ext === "otf") return "opentype";
    return "truetype";
  }

  create(): void {
    const world = computeWorldBounds(this.sceneData);
    this.physics.world.setBounds(0, 0, world.width, world.height);
    this.cameras.main.setBounds(0, 0, world.width, world.height);
    this.cameras.main.setBackgroundColor(this.sceneData.viewport.background);

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

    // Run onStart scripts
    for (const entity of this.activeEntities) {
      const script = findComponent<ScriptComponent>(entity, "Script");
      if (script) {
        evaluateScriptEvent("start", script, {
          entityId: entity.id,
          entities: this.activeEntities,
          destroyEntity: (id) => this.destroyEntityById(id),
        });
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
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.1);

    if (this.gameOver || this.won) {
      return;
    }

    if (this.fallCooldown > 0) {
      this.fallCooldown = Math.max(0, this.fallCooldown - dt);
    }

    if (this.playerBinding) {
      const { binding, controller, controllerData } = this.playerBinding;
      const jumpDown = this.keys.jump.some((k) => k.isDown) || this.joystickDy < -0.5;
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

      // Horizontal only from controller; Phaser arcade owns gravity/Y.
      // Slight air control reduction so jumps feel less "floaty / fly away".
      const keyDirection =
        Number(this.keys.right.some((k) => k.isDown)) - Number(this.keys.left.some((k) => k.isDown));
      const joystickDirection = Math.abs(this.joystickDx) > 0.3 ? Math.sign(this.joystickDx) : 0;
      const direction = keyDirection !== 0 ? keyDirection : joystickDirection;
      const moveSpeed = touchingGround ? controllerData.speed : controllerData.speed * 0.85;
      body.setVelocityX(direction * moveSpeed);

      // Jump from keyboard OR joystick upward swipe (dy < -0.5)
      const joystickJump = this.joystickDy < -0.5 && !this.jumpHeldLastFrame;
      const effectiveJump = jumpPressed || joystickJump;

      // Jump only when actually touching ground (not mere grace), edge-triggered
      if (effectiveJump && touchingGround) {
        body.setVelocityY(-controllerData.jumpVelocity);
        this.groundedGraceFrames = 0;
        controller.setGrounded(false);
      }

      // Cap upward speed so a bad impulse can never fling the player off-screen
      const maxUp = Math.max(controllerData.jumpVelocity, 200);
      if (body.velocity.y < -maxUp) {
        body.setVelocityY(-maxUp);
      }

      // Fall death from scene.gameRules
      const spriteY = (binding.gameObject as { y?: number }).y ?? body.center?.y ?? body.y;
      if (this.gameRules.fallDeathEnabled && this.fallCooldown <= 0 && spriteY >= this.fallY) {
        this.handleFallDeath(body);
      }

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
      if (!binding || binding.isStatic || binding.isTrigger) continue;

      const transform = findComponent<TransformComponent>(entity, "Transform");
      if (!transform) continue;

      const go = binding.gameObject;
      // Dynamic bodies drive transform from physics; non-physics objects from transform
      if (binding.body && typeof go.x === "number") {
        transform.position.x = go.x;
        transform.position.y = go.y;
      } else {
        if (go.setPosition) go.setPosition(transform.position.x, transform.position.y);
        if (go.setRotation) go.setRotation(Phaser.Math.DegToRad(transform.rotation));
        if (go.setScale) go.setScale(transform.scale.x, transform.scale.y);
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
    for (const entity of this.activeEntities) {
      const audio = findComponent<AudioSourceComponent>(entity, "AudioSource");
      if (!audio) continue;
      if (!this.cache.audio.exists(audio.assetId)) continue;

      const sound = this.sound.add(audio.assetId, {
        loop: audio.loop,
        volume: Phaser.Math.Clamp(audio.volume, 0, 1),
      });
      this.sounds.set(entity.id, sound);

      if (audio.playOnStart) {
        sound.play();
      }
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.stopAllSounds());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.stopAllSounds());
  }

  playSound(entityId: string): void {
    const sound = this.sounds.get(entityId);
    if (sound && !sound.isPlaying) sound.play();
  }

  stopSound(entityId: string): void {
    this.sounds.get(entityId)?.stop();
  }

  private stopAllSounds(): void {
    for (const sound of this.sounds.values()) {
      sound.stop();
    }
  }

  private setupInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      this.keys = { left: [], right: [], jump: [] };
      return;
    }

    const map = this.sceneData.inputMap ?? DEFAULT_INPUT_MAP;
    const byAction = (action: string): string[] =>
      map.bindings.find((b) => b.action === action)?.keys ?? [];

    const toCodes = (keys: string[]): number[] => {
      const codes: number[] = [];
      for (const k of keys) {
        if (k === " " || k === "Space" || k === "Spacebar") {
          codes.push(Phaser.Input.Keyboard.KeyCodes.SPACE);
        } else if (k === "ArrowLeft") {
          codes.push(Phaser.Input.Keyboard.KeyCodes.LEFT);
        } else if (k === "ArrowRight") {
          codes.push(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        } else if (k === "ArrowUp") {
          codes.push(Phaser.Input.Keyboard.KeyCodes.UP);
        } else if (k === "ArrowDown") {
          codes.push(Phaser.Input.Keyboard.KeyCodes.DOWN);
        } else if (k.length === 1) {
          const upper = k.toUpperCase();
          const code = (Phaser.Input.Keyboard.KeyCodes as Record<string, number>)[upper];
          if (typeof code === "number") codes.push(code);
        }
      }
      return [...new Set(codes)];
    };

    const leftKeys = byAction("move_left").length
      ? byAction("move_left")
      : ["ArrowLeft", "a", "A"];
    const rightKeys = byAction("move_right").length
      ? byAction("move_right")
      : ["ArrowRight", "d", "D"];
    const jumpKeys = byAction("jump").length ? byAction("jump") : ["ArrowUp", " ", "w", "W"];

    this.keys = {
      left: toCodes(leftKeys).map((c) => keyboard.addKey(c)),
      right: toCodes(rightKeys).map((c) => keyboard.addKey(c)),
      jump: toCodes(jumpKeys).map((c) => keyboard.addKey(c)),
    };
  }

  private setupTouchJoystick(): void {
    const baseRadius = 50;
    const thumbRadius = 18;
    const travel = 36;

    this.joystickBase = this.add.graphics().setDepth(2000).setScrollFactor(0);
    this.joystickThumb = this.add.graphics().setDepth(2001).setScrollFactor(0);

    const drawBase = (x: number, y: number) => {
      this.joystickBase!.clear();
      this.joystickBase!.fillStyle(0xffffff, 0.15);
      this.joystickBase!.fillCircle(x, y, baseRadius);
      this.joystickBase!.lineStyle(2, 0xffffff, 0.3);
      this.joystickBase!.strokeCircle(x, y, baseRadius);
    };

    const drawThumb = (x: number, y: number) => {
      this.joystickThumb!.clear();
      this.joystickThumb!.fillStyle(0xffffff, 0.8);
      this.joystickThumb!.fillCircle(x, y, thumbRadius);
    };

    const hideJoystick = () => {
      this.joystickBase!.clear();
      this.joystickThumb!.clear();
    };

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.x < this.scale.width / 2) {
        this.joystickActive = true;
        this.joystickCenter = { x: pointer.x, y: pointer.y };
        drawBase(pointer.x, pointer.y);
        drawThumb(pointer.x, pointer.y);
        this.joystickDx = 0;
        this.joystickDy = 0;
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.joystickActive || !pointer.isDown) return;
      const dx = pointer.x - this.joystickCenter.x;
      const dy = pointer.y - this.joystickCenter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clamped = Math.min(dist, travel);
      const angle = Math.atan2(dy, dx);
      const nx = (clamped / travel) * Math.cos(angle);
      const ny = (clamped / travel) * Math.sin(angle);

      this.joystickDx = nx;
      this.joystickDy = ny;
      drawThumb(
        this.joystickCenter.x + nx * travel,
        this.joystickCenter.y + ny * travel,
      );
    });

    const release = () => {
      this.joystickActive = false;
      this.joystickDx = 0;
      this.joystickDy = 0;
      hideJoystick();
    };

    this.input.on("pointerup", release);
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

    const name = entity.name.toLowerCase();
    const isCoin =
      name.includes("coin") ||
      name.includes("pickup") ||
      name.includes("gem") ||
      name.includes("target");
    const isGoal = name.includes("goal") || name.includes("flag") || name.includes("finish");

    // Detach immediately so the same overlap cannot fire twice in one frame
    this.bindings.delete(matchedId);

    const script = findComponent<ScriptComponent>(entity, "Script");
    if (script) {
      evaluateScriptEvent("triggerEnter", script, {
        entityId: entity.id,
        entities: this.activeEntities,
        destroyEntity: (id) => this.destroyEntityById(id),
      });
    }

    if (isCoin) {
      this.coinsCollected += 1;
      this.destroyEntityById(entity.id);
      this.refreshHud();
      if (this.totalCoins > 0 && this.coinsCollected >= this.totalCoins && !this.won) {
        this.showWin("All coins collected! You win!");
      }
      return;
    }

    if (isGoal && !this.won) {
      this.showWin(
        this.totalCoins > 0
          ? `Goal reached! Coins: ${this.coinsCollected}/${this.totalCoins}`
          : "Goal reached! You win!",
      );
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
  }

  private refreshHud(): void {
    for (const tb of this.textBindings) {
      let text = tb.baseTemplate;
      if (/coins?\s*:/i.test(text) || text.includes("{coins}")) {
        text = text
          .replace(/\{coins\}/gi, String(this.coinsCollected))
          .replace(/Coins:\s*\d+/i, `Coins: ${this.coinsCollected}`)
          .replace(/coins:\s*\d+/i, `Coins: ${this.coinsCollected}`);
        if (this.totalCoins > 0 && !/\/\d+/.test(text) && /Coins:\s*\d+/i.test(text)) {
          text = text.replace(
            /Coins:\s*(\d+)/i,
            `Coins: ${this.coinsCollected}/${this.totalCoins}`,
          );
        }
      }
      tb.textObject.setText(text);
    }
  }

  private showWin(message: string): void {
    if (this.gameOver) return;
    this.won = true;
    if (this.playerBinding?.binding.body) {
      this.playerBinding.binding.body.setVelocity(0, 0);
      this.playerBinding.binding.body.moves = false;
    }
    this.showOverlay(message || this.gameRules.winMessage, "#00f0ff");
  }

  private handleFallDeath(body: Phaser.Physics.Arcade.Body): void {
    if (this.won || this.gameOver) return;

    if (this.gameRules.onFall === "respawn") {
      const unlimited = this.gameRules.lives <= 0;
      if (!unlimited) {
        this.livesRemaining = Math.max(0, this.livesRemaining - 1);
        if (this.livesText) {
          this.livesText.setText(`Lives: ${this.livesRemaining}`);
        }
      }
      if (!unlimited && this.livesRemaining <= 0) {
        this.triggerGameOver();
        return;
      }
      body.reset(this.spawnPoint.x, this.spawnPoint.y);
      body.setVelocity(0, 0);
      this.groundedGraceFrames = 0;
      this.fallCooldown = 0.45;
      this.jumpHeldLastFrame = false;
      return;
    }

    this.triggerGameOver();
  }

  private triggerGameOver(): void {
    this.gameOver = true;
    if (this.playerBinding?.binding.body) {
      this.playerBinding.binding.body.setVelocity(0, 0);
      this.playerBinding.binding.body.moves = false;
    }
    this.showOverlay(this.gameRules.gameOverMessage, "#ff6b8a");
  }

  private showOverlay(message: string, color: string): void {
    if (this.winText) {
      this.winText.setColor(color);
      this.winText.setText(message);
      return;
    }
    this.winText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, message, {
        fontFamily: "IBM Plex Sans, system-ui, sans-serif",
        fontSize: "28px",
        color,
        backgroundColor: "#06090ecc",
        padding: { x: 20, y: 12 },
        align: "center",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000);

    this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 48, "Refresh page to retry", {
        fontFamily: "IBM Plex Sans, system-ui, sans-serif",
        fontSize: "14px",
        color: "#8b9bb4",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000);
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
  }
}
