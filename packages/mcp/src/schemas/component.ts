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
  isTrigger: z.boolean().optional(),
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

export const RigidBodyInputSchema = z.object({
  type: z.literal("RigidBody"),
  velocity: Vector2Schema.default({ x: 0, y: 0 }),
  angularVelocity: z.number().default(0),
  mass: z.number().positive().default(1),
  drag: z.number().min(0).max(1).default(0),
  isKinematic: z.boolean().default(false),
  gravityScale: z.number().default(1),
  useGravity: z.boolean().default(true),
});

export const CircleColliderInputSchema = z.object({
  type: z.literal("CircleCollider"),
  offset: Vector2Schema.default({ x: 0, y: 0 }),
  radius: z.number().positive(),
  isStatic: z.boolean().default(false),
  isTrigger: z.boolean().default(false),
  layer: z.number().int().optional(),
  mask: z.number().int().optional(),
});

export const PolygonColliderInputSchema = z.object({
  type: z.literal("PolygonCollider"),
  offset: z.object({ x: z.number(), y: z.number() }).optional().default({ x: 0, y: 0 }),
  points: z.array(z.object({ x: z.number(), y: z.number() })).min(3).describe("At least 3 vertices in local coordinates"),
  isStatic: z.boolean().optional().default(false),
  isTrigger: z.boolean().optional().default(false),
  layer: z.number().int().optional(),
  mask: z.number().int().optional(),
});

export const TilemapInputSchema = z.object({
  type: z.literal("Tilemap"),
  tilesetId: z.string().min(1),
  tileWidth: z.number().positive(),
  tileHeight: z.number().positive(),
  columns: z.number().int().positive(),
  gridWidth: z.number().int().positive(),
  gridHeight: z.number().int().positive(),
  tiles: z.array(z.number().int().min(0)).default([]),
});

export const ComponentInputSchema = z.discriminatedUnion("type", [
  TransformInputSchema,
  SpriteInputSchema,
  AabbColliderInputSchema,
  CircleColliderInputSchema,
  PolygonColliderInputSchema,
  PlayerControllerInputSchema,
  RigidBodyInputSchema,
  CameraFollowInputSchema,
  AnimationInputSchema,
  TilemapInputSchema,
]);

export const ComponentTypeSchema = z.enum([
  "Transform",
  "Sprite",
  "AabbCollider",
  "CircleCollider",
  "PolygonCollider",
  "PlayerController",
  "RigidBody",
  "CameraFollow",
  "Animation",
  "Tilemap",
]);
