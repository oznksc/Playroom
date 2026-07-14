import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  createEntity,
  createId,
  createPrefab,
  slugify,
  type GameKitComponent,
  type TransformComponent,
} from "@gamekit/schema";
import type { FileIO } from "../utils/file-io.js";

export function registerPrefabTools(server: McpServer, fileIO: FileIO): void {
  server.tool("list_prefabs", "List all prefab template files in gamekit/prefabs/. Returns each prefab's file, id, name, component types, and source entity name. Unreadable files are included with an 'error' field.", {}, async () => {
    const files = await fileIO.listPrefabs();
    const prefabs = [];
    for (const file of files) {
      try {
        const prefab = await fileIO.readPrefab(file);
        prefabs.push({
          file,
          id: prefab.id,
          name: prefab.name,
          componentTypes: prefab.components.map((c) => c.type),
          sourceEntityName: prefab.sourceEntityName ?? null,
        });
      } catch {
        prefabs.push({ file, error: "unreadable" });
      }
    }
    return {
      content: [{ type: "text", text: JSON.stringify({ prefabs }, null, 2) }],
    };
  });

  server.tool(
    "create_prefab",
    "Create a prefab template from an entity in a scene. Captures all the entity's components into a reusable template file saved to gamekit/prefabs/<slug>.prefab.json. The prefab name defaults to the entity's name if not specified. Use instantiate_prefab to spawn instances of this prefab.",
    {
      scenePath: z.string().describe("Scene filename containing the source entity"),
      entityId: z.string().describe("Entity ID to capture as a prefab"),
      name: z.string().optional().describe("Prefab name (defaults to entity name)"),
    },
    async ({ scenePath, entityId, name }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }

      const prefabName = name?.trim() || entity.name;
      const prefab = createPrefab(prefabName, entity.components, entity.name);
      const file = `${slugify(prefabName) || prefab.id}.prefab.json`;
      await fileIO.writePrefab(file, prefab);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                file,
                prefab: {
                  id: prefab.id,
                  name: prefab.name,
                  componentTypes: prefab.components.map((c) => c.type),
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "instantiate_prefab",
    "Spawn a prefab instance into a scene. Looks up the prefab by filename, id, or name (in that order). If x/y are provided, the instance's Transform position is set to those values; otherwise the prefab's original Transform position is used. The instance gets a fresh entity ID. Returns the created entity info and the source prefab ID.",
    {
      scenePath: z.string().describe("Target scene filename"),
      prefabId: z
        .string()
        .describe("Prefab id or filename (e.g. coin or coin.prefab.json)"),
      x: z.number().optional().describe("World X position for Transform"),
      y: z.number().optional().describe("World Y position for Transform"),
      name: z.string().optional().describe("Optional instance name override"),
    },
    async ({ scenePath, prefabId, x, y, name }) => {
      const file = prefabId.endsWith(".prefab.json")
        ? prefabId
        : `${slugify(prefabId)}.prefab.json`;

      let prefab;
      try {
        prefab = await fileIO.readPrefab(file);
      } catch {
        // Fall back: match by prefab.id inside files
        const files = await fileIO.listPrefabs();
        let found = null;
        for (const f of files) {
          try {
            const p = await fileIO.readPrefab(f);
            if (p.id === prefabId || p.name === prefabId) {
              found = p;
              break;
            }
          } catch {
            // skip
          }
        }
        if (!found) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Prefab not found: ${prefabId}` }) }],
            isError: true,
          };
        }
        prefab = found;
      }

      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const instanceName = name?.trim() || prefab.name;
      const entity = createEntity(instanceName, {
        x: x ?? 0,
        y: y ?? 0,
      });

      // Replace default Transform components with prefab components, then apply position override
      const components = structuredClone(prefab.components) as GameKitComponent[];
      const hasTransform = components.some((c) => c.type === "Transform");
      if (!hasTransform) {
        entity.components = components;
        entity.components.unshift({
          type: "Transform",
          position: { x: x ?? 0, y: y ?? 0 },
          rotation: 0,
          scale: { x: 1, y: 1 },
        });
      } else {
        entity.components = components.map((c) => {
          if (c.type !== "Transform") return c;
          const t = c as TransformComponent;
          if (x !== undefined || y !== undefined) {
            return {
              ...t,
              position: {
                x: x ?? t.position.x,
                y: y ?? t.position.y,
              },
            };
          }
          return t;
        });
      }

      // Fresh entity id (createEntity already set one)
      entity.id = createId(instanceName);
      scene.entities.push(entity);
      await fileIO.writeScene(filename, scene);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                scenePath: filename,
                entity: {
                  id: entity.id,
                  name: entity.name,
                  componentTypes: entity.components.map((c) => c.type),
                },
                prefabId: prefab.id,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "remove_prefab",
    "Delete a prefab file from gamekit/prefabs/. Existing instances of this prefab in scenes are NOT removed and will become orphaned. Lookup is by filename or by slugified name.",
    {
      prefabId: z.string().describe("Prefab id or filename"),
    },
    async ({ prefabId }) => {
      const file = prefabId.endsWith(".prefab.json")
        ? prefabId
        : `${slugify(prefabId)}.prefab.json`;
      try {
        await fileIO.deletePrefab(file);
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, removed: file }) }],
        };
      } catch {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Prefab not found: ${prefabId}` }) }],
          isError: true,
        };
      }
    },
  );
}
