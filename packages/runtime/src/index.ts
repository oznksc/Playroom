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
export type { ExtendedPlayerInput } from "./input.js";
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
  resolveGamepadBindings,
  playerInputFromPressedKeys,
  extendedInputFromPressedKeys,
  mergeGamepadIntoInput,
  type ResolvedActionKeys,
  type ResolvedGamepadBindings,
} from "./input-map.js";
export {
  simulateSceneSteps,
  type SimulateOptions,
  type SimulateResult,
} from "./simulate.js";
export { VirtualJoystick } from "./joystick.js";
export type { VirtualJoystickProps } from "./joystick.js";
export { VirtualButton } from "./virtual-button.js";
export type { VirtualButtonProps } from "./virtual-button.js";
export { VirtualControls } from "./virtual-controls.js";
export type { VirtualControlsProps, VirtualControlActions } from "./virtual-controls.js";
export {
  createGestureRecognizer,
  gestureToJumpImpulse,
  type GestureRecognizer,
  type GestureRecognizerOptions,
  type RecognizedGesture,
  type GestureKind,
  type SwipeDirection,
} from "./gestures.js";
export {
  pollGamepad,
  isGamepadApiAvailable,
  isGamepadBindingActive,
  type GamepadSnapshot,
} from "./gamepad.js";
export {
  createParticleEmitter,
  updateParticleEmitter,
  particleRenderSize,
  particleRenderColor,
  particleRenderAlpha,
  particleLifeProgress,
  type Particle,
  type ParticleEmitterState,
} from "./particles.js";
