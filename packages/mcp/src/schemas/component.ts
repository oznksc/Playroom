import { z } from "zod";
import {
  TransformComponentSchema,
  SpriteComponentSchema,
  AabbColliderComponentSchema,
  CircleColliderComponentSchema,
  PolygonColliderComponentSchema,
  PlayerControllerComponentSchema,
  RigidBodyComponentSchema,
  CameraFollowComponentSchema,
  AnimationComponentSchema,
  TilemapComponentSchema,
  TextComponentSchema,
  AudioSourceComponentSchema,
  AudioListenerComponentSchema,
  TweenComponentSchema,
  FollowPathComponentSchema,
  StateMachineComponentSchema,
  ScriptComponentSchema,
  ParticleSystemComponentSchema,
  Light2DComponentSchema,
  NineSliceComponentSchema,
  GameKitComponentSchema,
  ComponentTypeSchema,
} from "@gamekit/schema";

export { ComponentTypeSchema } from "@gamekit/schema";

// Input schemas derive from core component schemas with stricter input validation.
// Core schemas provide defaults; these add .positive()/.int()/.min() constraints.

export const TransformInputSchema = TransformComponentSchema;

export const SpriteInputSchema = SpriteComponentSchema.extend({
  width: z.number().positive(),
  height: z.number().positive(),
});

export const AabbColliderInputSchema = AabbColliderComponentSchema.extend({
  size: z.object({ x: z.number(), y: z.number() }).refine(
    (v) => v.x > 0 && v.y > 0,
    { message: "Size must be positive" },
  ),
  layer: z.number().int().optional(),
  mask: z.number().int().optional(),
});

export const PlayerControllerInputSchema = PlayerControllerComponentSchema.extend({
  speed: z.number().positive(),
  jumpVelocity: z.number().positive(),
  gravity: z.number().positive(),
});

export const CameraFollowInputSchema = CameraFollowComponentSchema.extend({
  smoothing: z.number().min(0).max(1),
});

export const AnimationInputSchema = AnimationComponentSchema.extend({
  frameWidth: z.number().positive(),
  frameHeight: z.number().positive(),
  totalFrames: z.number().int().positive(),
  framesPerSecond: z.number().positive(),
});

export const RigidBodyInputSchema = RigidBodyComponentSchema.extend({
  mass: z.number().positive(),
  drag: z.number().min(0).max(1),
});

export const CircleColliderInputSchema = CircleColliderComponentSchema.extend({
  radius: z.number().positive(),
  layer: z.number().int().optional(),
  mask: z.number().int().optional(),
});

export const PolygonColliderInputSchema = PolygonColliderComponentSchema.extend({
  offset: z.object({ x: z.number(), y: z.number() }).optional().default({ x: 0, y: 0 }),
  points: z.array(z.object({ x: z.number(), y: z.number() })).min(3),
  isStatic: z.boolean().optional().default(false),
  isTrigger: z.boolean().optional().default(false),
  layer: z.number().int().optional(),
  mask: z.number().int().optional(),
});

export const TilemapInputSchema = TilemapComponentSchema.extend({
  tileWidth: z.number().positive(),
  tileHeight: z.number().positive(),
  columns: z.number().int().positive(),
  gridWidth: z.number().int().positive(),
  gridHeight: z.number().int().positive(),
  tiles: z.array(z.number().int().min(0)).default([]),
});

export const TextInputSchema = TextComponentSchema.extend({
  fontAssetId: z.string().min(1),
  size: z.number().positive(),
});

export const AudioSourceInputSchema = AudioSourceComponentSchema.extend({
  volume: z.number().min(0).max(1),
});

export const AudioListenerInputSchema = AudioListenerComponentSchema;

export const TweenInputSchema = TweenComponentSchema.extend({
  duration: z.number().positive(),
});

export const FollowPathInputSchema = FollowPathComponentSchema.extend({
  speed: z.number().nonnegative(),
});

export const StateMachineInputSchema = StateMachineComponentSchema;

export const ScriptInputSchema = ScriptComponentSchema;

export const ParticleSystemInputSchema = ParticleSystemComponentSchema.extend({
  maxParticles: z.number().int().positive(),
  emissionRate: z.number().nonnegative(),
  lifetime: z.number().positive(),
  speed: z.number().nonnegative(),
  sizeStart: z.number().positive(),
  sizeEnd: z.number().nonnegative(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
});

export const Light2DInputSchema = Light2DComponentSchema.extend({
  range: z.number().positive(),
  intensity: z.number().positive(),
});

export const NineSliceInputSchema = NineSliceComponentSchema.extend({
  width: z.number().positive(),
  height: z.number().positive(),
  leftWidth: z.number().nonnegative(),
  rightWidth: z.number().nonnegative(),
  topHeight: z.number().nonnegative(),
  bottomHeight: z.number().nonnegative(),
});

// Generic component input union (for add_component / batch tools)
export const ComponentInputSchema = GameKitComponentSchema;
