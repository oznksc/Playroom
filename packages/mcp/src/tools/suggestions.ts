import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

type ComponentDef = Record<string, unknown>;

const ROLE_COMPONENTS: Record<string, ComponentDef[]> = {
  player: [
    { type: "Transform", position: { x: 100, y: 200 }, rotation: 0, scale: { x: 1, y: 1 } },
    { type: "Sprite", assetId: "player", width: 48, height: 48, anchor: { x: 0.5, y: 0.5 } },
    { type: "AabbCollider", offset: { x: 0, y: 0 }, size: { x: 48, y: 48 }, isStatic: false },
    { type: "PlayerController", speed: 300, jumpVelocity: 600, gravity: 1800 },
    { type: "CameraFollow", targetId: "", smoothing: 0.1 },
  ],
  enemy: [
    { type: "Transform", position: { x: 300, y: 200 }, rotation: 0, scale: { x: 1, y: 1 } },
    { type: "Sprite", assetId: "enemy", width: 48, height: 48, anchor: { x: 0.5, y: 0.5 } },
    { type: "AabbCollider", offset: { x: 0, y: 0 }, size: { x: 48, y: 48 }, isStatic: false },
    { type: "RigidBody", velocity: { x: -100, y: 0 }, angularVelocity: 0, mass: 1, drag: 0, isKinematic: false, gravityScale: 1, useGravity: true },
  ],
  collectible: [
    { type: "Transform", position: { x: 400, y: 150 }, rotation: 0, scale: { x: 1, y: 1 } },
    { type: "Sprite", assetId: "coin", width: 24, height: 24, anchor: { x: 0.5, y: 0.5 } },
    { type: "AabbCollider", offset: { x: 0, y: 0 }, size: { x: 24, y: 24 }, isStatic: true, isTrigger: true },
  ],
  platform: [
    { type: "Transform", position: { x: 400, y: 400 }, rotation: 0, scale: { x: 1, y: 1 } },
    { type: "Sprite", assetId: "platform", width: 200, height: 32, anchor: { x: 0.5, y: 0.5 } },
    { type: "AabbCollider", offset: { x: 0, y: 0 }, size: { x: 200, y: 32 }, isStatic: true },
  ],
  obstacle: [
    { type: "Transform", position: { x: 500, y: 300 }, rotation: 0, scale: { x: 1, y: 1 } },
    { type: "Sprite", assetId: "obstacle", width: 32, height: 32, anchor: { x: 0.5, y: 0.5 } },
    { type: "AabbCollider", offset: { x: 0, y: 0 }, size: { x: 32, y: 32 }, isStatic: true },
  ],
};

export function registerSuggestionTools(server: McpServer): void {
  server.tool(
    "suggest_components",
    "Suggest typical component combinations for an entity based on its role",
    {
      role: z
        .enum(["player", "enemy", "collectible", "platform", "obstacle"])
        .describe("Entity role to get component suggestions for"),
    },
    async ({ role }) => {
      const components = ROLE_COMPONENTS[role] ?? [];
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            role,
            description: getSuggestionDescription(role),
            components,
          }, null, 2),
        }],
      };
    },
  );
}

function getSuggestionDescription(role: string): string {
  switch (role) {
    case "player": return "Player-controlled entity with physics, collision, and camera follow";
    case "enemy": return "AI-controlled entity with physics and collision";
    case "collectible": return "Pickup item with trigger collision";
    case "platform": return "Static platform for standing on";
    case "obstacle": return "Static obstacle that blocks movement";
    default: return "Entity";
  }
}
