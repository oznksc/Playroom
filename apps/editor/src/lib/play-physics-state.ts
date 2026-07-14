import type { GameKitScene, PlayerControllerComponent, RigidBodyComponent } from "@gamekit/schema";
import { createPlayerController } from "@gamekit/runtime/player";
import { createRigidBody } from "@gamekit/runtime/rigid-body";

export function createPlayPhysicsState(scene: GameKitScene): {
  controllers: Map<string, ReturnType<typeof createPlayerController>>;
  rigidBodies: Map<string, ReturnType<typeof createRigidBody>>;
} {
  const controllers = new Map<string, ReturnType<typeof createPlayerController>>();
  const rigidBodies = new Map<string, ReturnType<typeof createRigidBody>>();

  for (const entity of scene.entities) {
    const controller = entity.components.find(
      (component): component is PlayerControllerComponent => component.type === "PlayerController",
    );
    if (controller) controllers.set(entity.id, createPlayerController(controller));

    const rigidBody = entity.components.find(
      (component): component is RigidBodyComponent => component.type === "RigidBody",
    );
    if (rigidBody) rigidBodies.set(entity.id, createRigidBody(rigidBody));
  }

  return { controllers, rigidBodies };
}
