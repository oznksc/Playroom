import type { GameKitScene, TransformComponent } from "@gamekit/schema";
import { createCameraFollow } from "@gamekit/runtime/camera";
import { clampPlayCamera, computeSceneWorldBounds } from "./physics.js";

export function initializePlayCamera(
  scene: GameKitScene,
  rules: { spawnPoint?: { x: number; y: number } },
): {
  spawnPoint?: { x: number; y: number };
  cameraFollow: ReturnType<typeof createCameraFollow> | null;
  pan: { x: number; y: number } | null;
} {
  let followTargetId: string | undefined;
  let followSmoothing = 0.2;
  for (const entity of scene.entities) {
    const camera = entity.components.find((component) => component.type === "CameraFollow");
    if (camera?.type === "CameraFollow") {
      followTargetId = camera.targetId || entity.id;
      followSmoothing = camera.smoothing > 0 ? camera.smoothing : 0.2;
      break;
    }
  }

  const target = scene.entities.find((entity) => entity.id === followTargetId)
    ?? scene.entities.find((entity) => entity.components.some((component) => component.type === "PlayerController"));
  const transform = target?.components.find(
    (component): component is TransformComponent => component.type === "Transform",
  );
  if (!transform) return { spawnPoint: rules.spawnPoint, cameraFollow: null, pan: null };

  const spawnPoint = rules.spawnPoint ? { ...rules.spawnPoint } : { ...transform.position };
  const initial = {
    x: transform.position.x - scene.viewport.width / 2,
    y: transform.position.y - scene.viewport.height / 2,
  };
  const pan = clampPlayCamera(initial, scene, computeSceneWorldBounds(scene));
  return {
    spawnPoint,
    pan,
    cameraFollow: createCameraFollow({
      viewport: { x: scene.viewport.width, y: scene.viewport.height },
      smoothing: Math.min(1, Math.max(0.18, followSmoothing)),
      initial: { position: pan, zoom: 1 },
    }),
  };
}
