import type { ScriptComponent, ScriptAction, StateMachineComponent } from "@gamekit/schema";

/**
 * Host capabilities for script / rules actions.
 * Runtimes should inject sceneManager + rules hooks so progression actions work.
 */
export interface ScriptContext {
  entityId: string;
  sceneManager?: {
    switchScene: (sceneId: string) => boolean;
    nextScene?: () => boolean;
    nextLevel?: () => boolean;
    unlockLevel?: (levelId: string) => boolean;
    completeLevel?: (levelId: string) => string | null;
    getState?: () => { currentLevelId: string | null };
    setPersistentVar: (key: string, value: unknown) => void;
    getPersistentVar?: (key: string, defaultValue?: unknown) => unknown;
  };
  entities: any[];
  rigidBodies?: Map<string, any>;
  playSound?: (assetId: string) => void;
  destroyEntity?: (entityId: string) => void;
  /** Rules engine hooks (optional). */
  rules?: {
    win?: (message?: string) => void;
    lose?: (message?: string) => void;
    respawn?: () => void;
    completeObjective?: (objectiveId: string) => void;
    setLives?: (lives: number) => void;
    addLives?: (delta: number) => void;
    /** Update respawn point (checkpoint). */
    setCheckpoint?: (point: { x: number; y: number }) => void;
  };
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
      case "nextScene":
        context.sceneManager?.nextScene?.();
        break;
      case "nextLevel":
        context.sceneManager?.nextLevel?.();
        break;
      case "unlockLevel":
        if (context.sceneManager?.unlockLevel && typeof action.levelId === "string") {
          context.sceneManager.unlockLevel(action.levelId);
        }
        break;
      case "completeLevel": {
        const levelId =
          typeof action.levelId === "string"
            ? action.levelId
            : context.sceneManager?.getState?.().currentLevelId;
        if (context.sceneManager?.completeLevel && levelId) {
          context.sceneManager.completeLevel(levelId);
        }
        break;
      }
      case "destroyEntity": {
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
      }
      case "setVariable":
        if (context.sceneManager && typeof action.key === "string") {
          context.sceneManager.setPersistentVar(action.key, action.value);
        }
        break;
      case "incrementVariable": {
        if (context.sceneManager && typeof action.key === "string") {
          const delta = typeof action.by === "number" ? action.by : typeof action.value === "number" ? action.value : 1;
          const current = context.sceneManager.getPersistentVar?.(action.key, 0);
          const n = typeof current === "number" ? current : Number(current) || 0;
          context.sceneManager.setPersistentVar(action.key, n + delta);
        }
        break;
      }
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
      case "win":
        context.rules?.win?.(typeof action.message === "string" ? action.message : undefined);
        break;
      case "lose":
      case "gameOver":
        context.rules?.lose?.(typeof action.message === "string" ? action.message : undefined);
        break;
      case "respawn":
        context.rules?.respawn?.();
        break;
      case "completeObjective":
        if (typeof action.objectiveId === "string") {
          context.rules?.completeObjective?.(action.objectiveId);
        }
        break;
      case "setLives":
        if (typeof action.lives === "number") {
          context.rules?.setLives?.(action.lives);
        }
        break;
      case "addLives":
        if (typeof action.by === "number") {
          context.rules?.addLives?.(action.by);
        } else if (typeof action.lives === "number") {
          context.rules?.addLives?.(action.lives);
        }
        break;
      case "setCheckpoint": {
        let point: { x: number; y: number } | null = null;
        if (
          action.point &&
          typeof action.point === "object" &&
          typeof (action.point as { x?: unknown }).x === "number" &&
          typeof (action.point as { y?: unknown }).y === "number"
        ) {
          point = {
            x: (action.point as { x: number }).x,
            y: (action.point as { y: number }).y,
          };
        } else if (typeof action.x === "number" && typeof action.y === "number") {
          point = { x: action.x, y: action.y };
        } else {
          // Use triggering entity transform as checkpoint
          const entity = context.entities.find((e) => e.id === context.entityId);
          const t = entity?.components?.find((c: { type: string }) => c.type === "Transform") as
            | { position?: { x: number; y: number } }
            | undefined;
          if (t?.position) point = { ...t.position };
        }
        if (point) context.rules?.setCheckpoint?.(point);
        break;
      }
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
