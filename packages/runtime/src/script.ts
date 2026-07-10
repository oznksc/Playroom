import type { ScriptComponent, ScriptAction, StateMachineComponent } from "@gamekit/schema";

export interface ScriptContext {
  entityId: string;
  sceneManager?: any;
  entities: any[];
  rigidBodies?: Map<string, any>;
  playSound?: (assetId: string) => void;
  destroyEntity?: (entityId: string) => void;
}

export function executeActions(actions: ScriptAction[], context: ScriptContext): void {
  for (const action of actions) {
    switch (action.type) {
      case "playSound":
        if (context.playSound && typeof action.assetId === "string") {
          context.playSound(action.assetId);
        }
        break;
      case "switchScene":
        if (context.sceneManager && typeof action.sceneId === "string") {
          context.sceneManager.switchScene(action.sceneId);
        }
        break;
      case "destroyEntity":
        const targetId = typeof action.entityId === "string" ? action.entityId : context.entityId;
        if (context.destroyEntity) {
          context.destroyEntity(targetId);
        } else {
          const idx = context.entities.findIndex((e) => e.id === targetId);
          if (idx !== -1) {
            context.entities.splice(idx, 1);
          }
        }
        break;
      case "setVariable":
        if (context.sceneManager && typeof action.key === "string") {
          context.sceneManager.setPersistentVar(action.key, action.value);
        }
        break;
      case "applyImpulse":
        if (context.rigidBodies) {
          const rb = context.rigidBodies.get(context.entityId);
          if (rb && action.force && typeof action.force === "object") {
            rb.applyImpulse(action.force as { x: number; y: number });
          }
        }
        break;
      case "transitionState":
        if (typeof action.state === "string") {
          const entity = context.entities.find((e) => e.id === context.entityId);
          if (entity) {
            const sm = entity.components.find((c: any) => c.type === "StateMachine");
            if (sm) {
              transitionFsm(sm, action.state, context);
            }
          }
        }
        break;
    }
  }
}

export function transitionFsm(
  sm: StateMachineComponent,
  targetState: string,
  context: ScriptContext
): void {
  if (sm.currentState === targetState) return;

  const entity = context.entities.find((e) => e.id === context.entityId);
  if (!entity) return;

  const script = entity.components.find((c: any) => c.type === "Script") as ScriptComponent | undefined;

  // 1. Run exit event actions for current state
  if (sm.currentState && script) {
    const exitHandler = script.handlers.find((h) => h.event === `exit:${sm.currentState}`);
    if (exitHandler) {
      executeActions(exitHandler.actions, context);
    }
  }

  // 2. Set state
  sm.currentState = targetState;

  // 3. Run enter event actions for target state
  if (script) {
    const enterHandler = script.handlers.find((h) => h.event === `enter:${targetState}`);
    if (enterHandler) {
      executeActions(enterHandler.actions, context);
    }
  }
}

export function evaluateScriptEvent(
  eventName: string,
  script: ScriptComponent,
  context: ScriptContext
): void {
  const handler = script.handlers.find((h) => h.event === eventName);
  if (handler) {
    executeActions(handler.actions, context);
  }
}
