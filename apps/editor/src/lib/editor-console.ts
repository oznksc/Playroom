import { createEntity, type GameKitEntity, type GameKitScene, type PlayerControllerComponent } from "@gamekit/schema";
import { findComponent } from "./components.js";

export function createConsoleObstacle(assetId?: string): GameKitEntity {
  const obstacle = createEntity(`Obstacle_${Math.round(Math.random() * 100)}`, {
    x: Math.round(80 + Math.random() * 230),
    y: Math.round(100 + Math.random() * 120),
  });
  obstacle.components.push({
    type: "AabbCollider",
    offset: { x: -20, y: -20 },
    size: { x: 40, y: 40 },
    isStatic: true,
  });
  if (assetId) {
    obstacle.components.push({
      type: "Sprite",
      assetId,
      width: 40,
      height: 40,
      anchor: { x: 0.5, y: 0.5 },
    });
  }
  return obstacle;
}

type ConsoleLogType = "system" | "physics" | "error" | "warn";

export function executeEditorConsoleCommand(params: {
  command: string;
  selectedAssetId?: string;
  fallbackAssetId?: string;
  selectedEntityId: string | null;
  updateScene: (mutator: (draft: GameKitScene) => void) => void;
  setSelectedEntityIds: (ids: Set<string>) => void;
  addConsoleLog: (type: ConsoleLogType, message: string) => void;
}): void {
  const { command, selectedAssetId, fallbackAssetId, selectedEntityId, updateScene, setSelectedEntityIds, addConsoleLog } = params;
  const tokens = command.trim().split(/\s+/);
  const cmd = tokens[0]?.toLowerCase() ?? "";

  if (cmd === "/clear") return;
  addConsoleLog("system", `Executing command: ${command}`);

  if (cmd === "/help") {
    addConsoleLog("system", "Engine Command Console Reference:");
    addConsoleLog("system", "  /spawn                - Spawns randomized solid obstacle Box.");
    addConsoleLog("system", "  /gravity [number]     - Adjusts simulated gravity force (e.g. 1800).");
    addConsoleLog("system", "  /speed [number]       - Overrides speed px/s on active Player.");
    addConsoleLog("system", "  /clear                - Empties terminal logs history.");
    return;
  }

  if (cmd === "/spawn") {
    const obstacle = createConsoleObstacle(selectedAssetId ?? fallbackAssetId);
    updateScene((draft) => {
      draft.entities.push(obstacle);
      setSelectedEntityIds(new Set([obstacle.id]));
    });
    addConsoleLog("system", "Successfully spawned dynamic physics obstacle inside canvas.");
    return;
  }

  if (cmd === "/gravity") {
    const value = Number(tokens[1]);
    if (Number.isNaN(value)) {
      addConsoleLog("error", "Failed to parse value. Usage: /gravity <number>");
      return;
    }
    updateScene((draft) => {
      draft.gravity.y = value;
      for (const entity of draft.entities) {
        const player = findComponent<PlayerControllerComponent>(entity, "PlayerController");
        if (player) player.gravity = value;
      }
    });
    addConsoleLog("physics", `Global gravity force coefficients updated to ${value} y-accel.`);
    return;
  }

  if (cmd === "/speed") {
    const value = Number(tokens[1]);
    if (Number.isNaN(value)) {
      addConsoleLog("error", "Failed to parse value. Usage: /speed <number>");
      return;
    }
    if (!selectedEntityId) {
      addConsoleLog("warn", "No entity selected to apply character controller speed updates.");
      return;
    }
    let found = false;
    updateScene((draft) => {
      const entity = draft.entities.find((candidate) => candidate.id === selectedEntityId);
      const player = entity ? findComponent<PlayerControllerComponent>(entity, "PlayerController") : undefined;
      if (player) {
        player.speed = value;
        found = true;
      }
    });
    addConsoleLog(found ? "system" : "warn", found
      ? `Modified active PlayerController speed constants to ${value}px/s.`
      : "Selected entity lacks an active PlayerController script.");
    return;
  }

  addConsoleLog("error", `Engine command '${cmd}' unrecognized. Enter '/help' to inspect command catalog.`);
}
