import type Phaser from "phaser";
import type { GameKitEntity, PlayerControllerComponent } from "@gamekit/schema";
import type { createPlayerController } from "@gamekit/runtime/player";

export type Transformable = {
  x: number;
  y: number;
  setPosition(x: number, y: number): unknown;
  setRotation(radians: number): unknown;
  setScale(x: number, y?: number): unknown;
};

export type EntityBinding = {
  entity: GameKitEntity;
  gameObject: Phaser.GameObjects.GameObject & Transformable;
  body: Phaser.Physics.Arcade.Body | null;
  isStatic: boolean;
  isTrigger: boolean;
};

export type PlayerBinding = {
  binding: EntityBinding;
  controller: ReturnType<typeof createPlayerController>;
  controllerData: PlayerControllerComponent;
};

export type TextBinding = {
  entityId: string;
  textObject: Phaser.GameObjects.Text;
  baseTemplate: string;
};
