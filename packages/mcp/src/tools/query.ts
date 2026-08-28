import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { effectiveEntityTags } from "@gamekit/schema";
import { ComponentTypeSchema } from "../schemas/component.js";
import type { FileIO } from "../utils/file-io.js";
import { toolJson } from "../utils/result.js";
import {
  aabbOverlap,
  boundsOverlap,
  getEntityBounds,
  isOffScreen,
  summarizeComponent,
  summarizeEntity,
} from "../utils/entity-query.js";

export function registerQueryTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "list_entities",
    "List entities in a scene as compact summaries (id, name, tags, component types, position, bounds). Prefer this over get_scene for large scenes. Use query_entities to filter.",
    {
      scenePath: z
        .string()
        .describe("Scene filename including .scene.json (e.g. 'main.scene.json')"),
    },
    async ({ scenePath }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      return toolJson({
        sceneId: scene.id,
        name: scene.name,
        count: scene.entities.length,
        entities: scene.entities.map(summarizeEntity),
      });
    }
  );

  server.tool(
    "list_components",
    "List components on a single entity with a compact per-type summary. Use get_entity for the full component payloads.",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID"),
    },
    async ({ scenePath, entityId }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return toolJson(
          {
            error: `Entity "${entityId}" not found in scene "${scenePath}". Use list_entities to see available IDs.`,
          },
          true
        );
      }
      return toolJson({
        entityId: entity.id,
        name: entity.name,
        tags: entity.tags ?? [],
        components: entity.components.map(summarizeComponent),
      });
    }
  );

  server.tool(
    "get_entity",
    "Return the full entity JSON (id, name, tags, all components). Use list_entities first to discover IDs.",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID"),
    },
    async ({ scenePath, entityId }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return toolJson(
          {
            error: `Entity "${entityId}" not found in scene "${scenePath}". Use list_entities to see available IDs.`,
          },
          true
        );
      }
      return toolJson(entity);
    }
  );

  server.tool(
    "query_entities",
    "Filter entities in a scene by name substring, tag, component type, and/or world-space region. All provided filters AND together. Returns compact summaries.",
    {
      scenePath: z.string().describe("Scene filename"),
      nameContains: z.string().optional().describe("Case-insensitive name substring"),
      tag: z.string().optional().describe("Required gameplay tag (e.g. coin, goal, hazard)"),
      componentType: ComponentTypeSchema.optional().describe("Required component type"),
      region: z
        .object({
          minX: z.number(),
          minY: z.number(),
          maxX: z.number(),
          maxY: z.number(),
        })
        .optional()
        .describe("World-space AABB; entities whose bounds overlap this region match"),
    },
    async ({ scenePath, nameContains, tag, componentType, region }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const needle = nameContains?.toLowerCase();

      const matches = scene.entities.filter((entity) => {
        if (needle && !entity.name.toLowerCase().includes(needle)) return false;
        if (tag && !effectiveEntityTags(entity).includes(tag)) return false;
        if (componentType && !entity.components.some((c) => c.type === componentType)) return false;
        if (region) {
          const bounds = getEntityBounds(entity);
          if (!bounds) return false;
          if (!aabbOverlap(bounds, region)) return false;
        }
        return true;
      });

      return toolJson({
        sceneId: scene.id,
        filters: {
          nameContains: nameContains ?? null,
          tag: tag ?? null,
          componentType: componentType ?? null,
          region: region ?? null,
        },
        count: matches.length,
        entities: matches.map(summarizeEntity),
      });
    }
  );

  server.tool(
    "inspect_layout",
    "Spatial audit of a scene: entity bounds, off-screen entities, overlapping pairs, missing Transform/Sprite/collider, and viewport. Use before layout_entities or after a bulk spawn.",
    {
      scenePath: z.string().describe("Scene filename"),
    },
    async ({ scenePath }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const viewport = scene.viewport ?? { width: 844, height: 390 };

      const entities = scene.entities.map((entity) => {
        const bounds = getEntityBounds(entity);
        const types = new Set(entity.components.map((c) => c.type));
        const issues: string[] = [];
        if (!types.has("Transform")) issues.push("missing-transform");
        if (
          !types.has("Sprite") &&
          !types.has("Text") &&
          !types.has("NineSlice") &&
          !types.has("Tilemap") &&
          !types.has("ParticleSystem")
        ) {
          issues.push("no-visual");
        }
        if (
          types.has("PlayerController") &&
          !types.has("AabbCollider") &&
          !types.has("CircleCollider") &&
          !types.has("PolygonCollider")
        ) {
          issues.push("player-missing-collider");
        }
        if (bounds && isOffScreen(bounds, viewport)) issues.push("off-screen");
        return {
          ...summarizeEntity(entity),
          issues,
        };
      });

      const overlaps: Array<{ a: string; b: string }> = [];
      for (let i = 0; i < scene.entities.length; i++) {
        const aBounds = getEntityBounds(scene.entities[i]);
        if (!aBounds) continue;
        for (let j = i + 1; j < scene.entities.length; j++) {
          const bBounds = getEntityBounds(scene.entities[j]);
          if (!bBounds) continue;
          if (boundsOverlap(aBounds, bBounds)) {
            overlaps.push({ a: scene.entities[i].id, b: scene.entities[j].id });
          }
        }
      }

      const issueCount = entities.reduce((n, e) => n + e.issues.length, 0);
      return toolJson({
        sceneId: scene.id,
        name: scene.name,
        viewport,
        gravity: scene.gravity,
        entityCount: scene.entities.length,
        issueCount,
        overlapCount: overlaps.length,
        overlaps,
        entities,
      });
    }
  );
}
