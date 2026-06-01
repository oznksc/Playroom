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
} from "@gamekit/schema";
import { createPlayerController, type PlayerControllerInput } from "@gamekit/runtime/player";
import { playTimeline, type TimelineState } from "@gamekit/runtime/timeline";

type Transformable = {
  setPosition(x: number, y: number): unknown;
  setRotation(radians: number): unknown;
  setScale(x: number, y?: number): unknown;
};

type EntityBinding = {
  entity: GameKitEntity;
  gameObject: Phaser.GameObjects.GameObject & Partial<Transformable>;
  body: Phaser.Physics.Arcade.Body | null;
  isStatic: boolean;
};

type PlayerBinding = {
  binding: EntityBinding;
  controller: ReturnType<typeof createPlayerController>;
  controllerData: PlayerControllerComponent;
};

function findComponent<T extends { type: string }>(
  entity: GameKitEntity,
  type: T["type"],
): T | undefined {
  return entity.components.find((c) => c.type === type) as T | undefined;
}

export class GameKitPhaserScene extends Phaser.Scene {
  private sceneData: GameKitScene;
  private assetUrls: Record<string, string>;
  private bindings: Map<string, EntityBinding> = new Map();
  private playerBinding: PlayerBinding | null = null;
  private cameraFollowData: CameraFollowComponent | null = null;
  private timelineState: TimelineState = { elapsed: 0, playing: false };
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor(sceneData: GameKitScene, assetUrls: Record<string, string>) {
    super("GameKitScene");
    this.sceneData = sceneData;
    this.assetUrls = assetUrls;
  }

  preload(): void {
    const loadedKeys = new Set<string>();

    for (const entity of this.sceneData.entities) {
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
    }
  }

  create(): void {
    const staticGroup = this.physics.add.staticGroup();

    for (const entity of this.sceneData.entities) {
      this.createEntity(entity, staticGroup);
    }

    for (const [, binding] of this.bindings) {
      if (binding.body && !binding.isStatic) {
        this.physics.add.collider(binding.gameObject, staticGroup);
      }
    }

    if (this.cameraFollowData) {
      const targetBinding = this.bindings.get(this.cameraFollowData.targetId);
      if (targetBinding) {
        this.cameras.main.startFollow(
          targetBinding.gameObject,
          true,
          this.cameraFollowData.smoothing,
          this.cameraFollowData.smoothing,
        );
      }
    }

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    this.timelineState = {
      elapsed: 0,
      playing: this.sceneData.timeline.playing,
    };
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.1);

    if (this.playerBinding && this.cursors) {
      const { binding, controller, controllerData } = this.playerBinding;
      const input: PlayerControllerInput = {
        left: this.cursors.left.isDown,
        right: this.cursors.right.isDown,
        jump: this.cursors.up.isDown,
      };

      controller.update(input, dt);
      const body = binding.body!;
      body.setVelocityX(controller.state.velocity.x);

      if (controller.state.velocity.y !== 0) {
        body.setVelocityY(controller.state.velocity.y);
      }

      if (input.jump && controller.state.grounded) {
        body.setVelocityY(-controllerData.jumpVelocity);
      }

      controller.setGrounded(body.blocked.down || body.touching.down);
      controller.state.velocity.y = body.velocity.y;
    }

    playTimeline(this.sceneData, this.timelineState, dt);

    for (const entity of this.sceneData.entities) {
      const binding = this.bindings.get(entity.id);
      if (!binding || binding.isStatic) continue;

      const transform = findComponent<TransformComponent>(entity, "Transform");
      if (!transform) continue;

      const go = binding.gameObject;
      if (go.setPosition) go.setPosition(transform.position.x, transform.position.y);
      if (go.setRotation) go.setRotation(Phaser.Math.DegToRad(transform.rotation));
      if (go.setScale) go.setScale(transform.scale.x, transform.scale.y);
    }
  }

  private createEntity(
    entity: GameKitEntity,
    staticGroup: Phaser.Physics.Arcade.StaticGroup,
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
      const rect = this.add.rectangle(
        transform.position.x,
        transform.position.y,
        colliderComp?.size.x ?? 0,
        colliderComp?.size.y ?? 0,
        0x000000,
        0,
      );
      rect.setOrigin(0, 0);
      gameObject = rect;
    }

    let body: Phaser.Physics.Arcade.Body | null = null;

    const effectiveCollider = colliderComp ?? circleColliderComp;
    if (effectiveCollider) {
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

        if (colliderComp.isStatic) {
          staticGroup.add(gameObject);
          body = gameObject.body as Phaser.Physics.Arcade.Body;
          body.setSize(colliderComp.size.x, colliderComp.size.y);
          body.setOffset(offsetX, offsetY);
          body.setImmovable(true);
          body.updateFromGameObject();
        } else {
          this.physics.add.existing(gameObject, false);
          body = gameObject.body as Phaser.Physics.Arcade.Body;
          body.setSize(colliderComp.size.x, colliderComp.size.y);
          body.setOffset(offsetX, offsetY);
          body.setCollideWorldBounds(true);
        }
      } else if (circleColliderComp) {
        if (circleColliderComp.isStatic) {
          staticGroup.add(gameObject);
          body = gameObject.body as Phaser.Physics.Arcade.Body;
          body.setCircle(circleColliderComp.radius, circleColliderComp.offset.x, circleColliderComp.offset.y);
          body.setImmovable(true);
          body.updateFromGameObject();
        } else {
          this.physics.add.existing(gameObject, false);
          body = gameObject.body as Phaser.Physics.Arcade.Body;
          body.setCircle(circleColliderComp.radius, circleColliderComp.offset.x, circleColliderComp.offset.y);
          body.setCollideWorldBounds(true);
        }
      }
    }

    if (rigidBodyComp && body) {
      body.setVelocity(rigidBodyComp.velocity.x, rigidBodyComp.velocity.y);
      if (rigidBodyComp.useGravity) {
        body.setGravityY(rigidBodyComp.gravityScale);
      }
      body.setDrag(rigidBodyComp.drag * 1000, 0);
    }

    const binding: EntityBinding = {
      entity,
      gameObject: gameObject as EntityBinding["gameObject"],
      body,
      isStatic: colliderComp?.isStatic ?? false,
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
