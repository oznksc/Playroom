import { z } from "zod";

export const Vector2Schema = z.object({
  x: z.number(),
  y: z.number(),
});

export const TransformInputSchema = z.object({
  type: z.literal("Transform"),
  position: Vector2Schema.default({ x: 0, y: 0 }),
  rotation: z.number().default(0),
  scale: Vector2Schema.default({ x: 1, y: 1 }),
});

export const SpriteInputSchema = z.object({
  type: z.literal("Sprite"),
  assetId: z.string().min(1),
  width: z.number().positive(),
  height: z.number().positive(),
  anchor: Vector2Schema.default({ x: 0.5, y: 0.5 }),
});

export const AabbColliderInputSchema = z.object({
  type: z.literal("AabbCollider"),
  offset: Vector2Schema.default({ x: 0, y: 0 }),
  size: Vector2Schema.refine((v) => v.x > 0 && v.y > 0, {
    message: "Size must be positive",
  }),
  isStatic: z.boolean().default(false),
  layer: z.number().int().optional(),
  mask: z.number().int().optional(),
});

export const PlayerControllerInputSchema = z.object({
  type: z.literal("PlayerController"),
  speed: z.number().positive(),
  jumpVelocity: z.number().positive(),
  gravity: z.number().positive(),
});

export const CameraFollowInputSchema = z.object({
  type: z.literal("CameraFollow"),
  targetId: z.string().min(1),
  smoothing: z.number().min(0).max(1),
});

export const AnimationInputSchema = z.object({
  type: z.literal("Animation"),
  assetId: z.string().min(1),
  frameWidth: z.number().positive(),
  frameHeight: z.number().positive(),
  totalFrames: z.number().int().positive(),
  framesPerSecond: z.number().positive(),
  loop: z.boolean().default(true),
  currentFrame: z.number().int().optional(),
});

export const ComponentInputSchema = z.discriminatedUnion("type", [
  TransformInputSchema,
  SpriteInputSchema,
  AabbColliderInputSchema,
  PlayerControllerInputSchema,
  CameraFollowInputSchema,
  AnimationInputSchema,
]);

export const ComponentTypeSchema = z.enum([
  "Transform",
  "Sprite",
  "AabbCollider",
  "PlayerController",
  "CameraFollow",
  "Animation",
]);
