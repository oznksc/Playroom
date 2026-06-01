import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GameKitScene, GameKitEntity } from "@gamekit/schema";
import type { FileIO } from "../utils/file-io.js";

export function registerSceneMetaTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "find_unused_assets",
    "List assets that are not referenced by any scene",
    {},
    async () => {
      const project = await fileIO.readProject();
      const usedAssetIds = new Set<string>();

      for (const sceneFile of project.scenes) {
        try {
          const filename = fileIO.resolveScenePath(sceneFile);
          const scene = await fileIO.readScene(filename) as GameKitScene;
          for (const entity of scene.entities) {
            for (const comp of entity.components) {
              if ("assetId" in comp && typeof comp.assetId === "string") {
                usedAssetIds.add(comp.assetId);
              }
            }
          }
        } catch {
          // skip unreadable scenes
        }
      }

      const unused = project.assets.filter((a) => !usedAssetIds.has(a.id));
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            total: project.assets.length,
            used: project.assets.length - unused.length,
            unused: unused.map((a) => ({ id: a.id, file: a.file, kind: a.kind })),
          }, null, 2),
        }],
      };
    },
  );

  server.tool(
    "explain_scene",
    "Summarize the current scene: entity count, component distribution, missing assets, performance notes",
    {
      scenePath: z.string().optional().describe("Scene filename (defaults to main)"),
    },
    async ({ scenePath }) => {
      const filename = fileIO.resolveScenePath(scenePath ?? "main.scene.json");
      const scene = await fileIO.readScene(filename) as GameKitScene;

      const componentCounts: Record<string, number> = {};
      let missingAssets = 0;
      const project = await fileIO.readProject();
      const assetIds = new Set(project.assets.map((a) => a.id));

      for (const entity of scene.entities) {
        for (const comp of entity.components) {
          componentCounts[comp.type] = (componentCounts[comp.type] ?? 0) + 1;
          if ("assetId" in comp && typeof comp.assetId === "string" && !assetIds.has(comp.assetId)) {
            missingAssets++;
          }
        }
      }

      const warnings: string[] = [];
      if (scene.entities.length > 50) warnings.push("Large scene (>50 entities) — consider splitting");
      if (componentCounts["AabbCollider"] && !componentCounts["PlayerController"]) {
        warnings.push("Has colliders but no PlayerController");
      }
      if (missingAssets > 0) warnings.push(`${missingAssets} missing asset references`);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            sceneId: scene.id,
            name: scene.name,
            entityCount: scene.entities.length,
            componentCounts,
            missingAssets,
            viewport: scene.viewport,
            gravity: scene.gravity,
            warnings,
          }, null, 2),
        }],
      };
    },
  );
}
