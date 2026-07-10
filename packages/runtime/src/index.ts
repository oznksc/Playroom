export type {
  AabbColliderComponent,
  CameraFollowComponent,
  CircleColliderComponent,
  PolygonColliderComponent,
  GameKitAsset,
  GameKitComponent,
  GameKitEntity,
  GameKitLevel,
  GameKitProject,
  GameKitScene,
  Orientation,
  PlayerControllerComponent,
  ResponsiveConfig,
  RigidBodyComponent,
  SafeAreaConfig,
  SpriteComponent,
  TransformComponent,
  Vector2
} from "@gamekit/schema";

export { createLevel } from "@gamekit/schema";
export { GameKitView } from "./view.js";
export { GameKitGame } from "./game.js";
export type { GameKitGameProps } from "./game.js";
export {
  SceneManager,
  type StorageProvider,
  type GameSavePayload,
  InMemoryStorage,
  LocalStorageProvider,
} from "./manager.js";
export { loadScene } from "./scene.js";
export {
  type Aabb,
  type Circle,
  type Polygon,
  type CollisionSolid,
  type CollisionEvent,
  type CollisionState,
  type RaycastHit,
  type TriggerEvent,
  type TriggerState,
  applyAabbCollisions,
  applyCircleCollisions,
  applyPolygonCollisions,
  getEntityAabb,
  getEntityCircle,
  getEntityPolygon,
  intersectsAabb,
  intersectsCircleAabb,
  intersectsCircleCircle,
  intersectsPolygonAabb,
  intersectsPolygonCircle,
  intersectsPolygonPolygon,
  raycast,
  solidAabb,
  updateCollisionEvents,
  updateTriggerEvents
} from "./collision.js";
export {
  type CameraState,
  createCameraFollow
} from "./camera.js";
export {
  type PlayerControllerInput,
  type PlayerControllerState,
  createPlayerController
} from "./player.js";
export { useGameLoop } from "./loop.js";
export type { GameLoopCallback, FixedTimestepOptions } from "./loop.js";
export {
  createRigidBody,
  type RigidBodyState,
  RIGID_BODY_FIXED_DT,
  RIGID_BODY_SLEEP_DELAY,
  RIGID_BODY_SLEEP_LINEAR_THRESHOLD,
  RIGID_BODY_SLEEP_ANGULAR_THRESHOLD
} from "./rigid-body.js";
export { usePlayerInput } from "./input.js";
export { updateTween } from "./tween.js";
export { updateFollowPath } from "./path.js";
export { executeActions, transitionFsm, evaluateScriptEvent, type ScriptContext } from "./script.js";
export {
  createAudioController,
  collectAudioSources,
  type AudioController,
  type ResolvedAudioSource,
} from "./audio.js";
export {
  resolveActionKeys,
  playerInputFromPressedKeys,
  type ResolvedActionKeys,
} from "./input-map.js";
export {
  simulateSceneSteps,
  type SimulateOptions,
  type SimulateResult,
} from "./simulate.js";
export {
  createParticleEmitter,
  updateParticleEmitter,
  particleRenderSize,
  particleRenderColor,
  type Particle,
  type ParticleEmitterState,
} from "./particles.js";
