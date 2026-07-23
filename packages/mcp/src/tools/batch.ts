import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ComponentInputSchema } from "../schemas/component.js";
import { GameKitComponentSchema } from "@gamekit/schema";
import type { TransformComponent } from "@gamekit/schema";
import type { FileIO } from "../utils/file-io.js";

const BatchOpSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("set_name"),
    entityId: z.string(),
    name: z.string(),
  }),
  z.object({
    op: z.literal("update_transform"),
    entityId: z.string(),
    position: z.object({ x: z.number(), y: z.number() }).optional(),
    rotation: z.number().optional(),
    scale: z.object({ x: z.number(), y: z.number() }).optional(),
  }),
  z.object({
    op: z.literal("add_component"),
    entityId: z.string(),
    component: ComponentInputSchema,
  }),
  z.object({
    op: z.literal("remove_component"),
    entityId: z.string(),
    componentType: z.string(),
  }),
  z.object({
    op: z.literal("remove_entity"),
    entityId: z.string(),
  }),
]);

export function registerBatchTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "batch_apply_edit",
    "Apply multiple entity edits atomically to a scene (single read/write). Useful for agent bulk changes.",
    {
      scenePath: z.string().describe("Scene filename"),
      ops: z.array(BatchOpSchema).min(1).max(100).describe("Ordered list of edit operations"),
    },
    async ({ scenePath, ops }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const results: Array<{ index: number; op: string; ok: boolean; detail?: string }> = [];

      for (let i = 0; i < ops.length; i++) {
        const op = ops[i];
        try {
          switch (op.op) {
            case "set_name": {
              const entity = scene.entities.find((e) => e.id === op.entityId);
              if (!entity) throw new Error(`Entity not found: ${op.entityId}`);
              entity.name = op.name;
              results.push({ index: i, op: op.op, ok: true });
              break;
            }
            case "update_transform": {
              const entity = scene.entities.find((e) => e.id === op.entityId);
              if (!entity) throw new Error(`Entity not found: ${op.entityId}`);
              const transform = entity.components.find(
                (c): c is TransformComponent => c.type === "Transform",
              );
              if (!transform) throw new Error(`No Transform on ${op.entityId}`);
              if (op.position) transform.position = { ...op.position };
              if (op.rotation !== undefined) transform.rotation = op.rotation;
              if (op.scale) transform.scale = { ...op.scale };
              results.push({ index: i, op: op.op, ok: true });
              break;
            }
            case "add_component": {
              const entity = scene.entities.find((e) => e.id === op.entityId);
              if (!entity) throw new Error(`Entity not found: ${op.entityId}`);
              const parsed = GameKitComponentSchema.parse(op.component);
              if (entity.components.some((c) => c.type === parsed.type)) {
                throw new Error(`Component already present: ${parsed.type}`);
              }
              entity.components.push(parsed);
              results.push({ index: i, op: op.op, ok: true, detail: parsed.type });
              break;
            }
            case "remove_component": {
              const entity = scene.entities.find((e) => e.id === op.entityId);
              if (!entity) throw new Error(`Entity not found: ${op.entityId}`);
              const before = entity.components.length;
              entity.components = entity.components.filter((c) => c.type !== op.componentType);
              if (entity.components.length === before) {
                throw new Error(`Component not found: ${op.componentType}`);
              }
              results.push({ index: i, op: op.op, ok: true, detail: op.componentType });
              break;
            }
            case "remove_entity": {
              const idx = scene.entities.findIndex((e) => e.id === op.entityId);
              if (idx === -1) throw new Error(`Entity not found: ${op.entityId}`);
              const removed = scene.entities.splice(idx, 1)[0];
              results.push({ index: i, op: op.op, ok: true, detail: removed.name });
              break;
            }
          }
        } catch (e) {
          results.push({
            index: i,
            op: op.op,
            ok: false,
            detail: e instanceof Error ? e.message : String(e),
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    ok: false,
                    error: `Aborted at op ${i}: ${e instanceof Error ? e.message : e}`,
                    results,
                  },
                  null,
                  2,
                ),
              },
            ],
            isError: true,
          };
        }
      }

      await fileIO.writeScene(filename, scene);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                ok: true,
                scenePath: filename,
                applied: results.length,
                results,
                entityCount: scene.entities.length,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
