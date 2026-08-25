import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createId, type GameKitEntity } from "@gamekit/schema";
import type { FileIO } from "../utils/file-io.js";
import { toolJson } from "../utils/result.js";
import { ENTITY_ROLES, buildRoleEntity, getRoleDescription } from "../utils/roles.js";
import {
  findEntity,
  getEntityBounds,
  getTransform,
  setPositionFromMin,
  summarizeEntity,
} from "../utils/entity-query.js";

const LayoutModeSchema = z.enum([
  "row",
  "column",
  "grid",
  "align-left",
  "align-right",
  "align-top",
  "align-bottom",
  "align-center-x",
  "align-center-y",
  "distribute-x",
  "distribute-y",
]);

export function registerLayoutTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "set_transform",
    "Set or nudge an entity Transform (position, rotation, scale). When relative is true, values are added to the current transform instead of replacing it.",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID"),
      position: z.object({ x: z.number(), y: z.number() }).optional(),
      rotation: z.number().optional().describe("Degrees"),
      scale: z.object({ x: z.number(), y: z.number() }).optional(),
      relative: z.boolean().optional().describe("If true, add to the current transform (default false)"),
    },
    async ({ scenePath, entityId, position, rotation, scale, relative }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const entity = findEntity(scene, entityId);
      if (!entity) {
        return toolJson({ error: `Entity "${entityId}" not found. Use list_entities.` }, true);
      }
      const transform = getTransform(entity);
      if (!transform) {
        return toolJson({ error: `Entity "${entity.name}" has no Transform. Use add_component.` }, true);
      }
      if (position) {
        transform.position = relative
          ? { x: transform.position.x + position.x, y: transform.position.y + position.y }
          : { ...position };
      }
      if (rotation !== undefined) {
        transform.rotation = relative ? transform.rotation + rotation : rotation;
      }
      if (scale) {
        transform.scale = relative
          ? { x: transform.scale.x * scale.x, y: transform.scale.y * scale.y }
          : { ...scale };
      }
      await fileIO.writeScene(filename, scene);
      return toolJson({ success: true, entity: summarizeEntity(entity), transform });
    },
  );

  server.tool(
    "place_relative",
    "Place an entity relative to another using visual bounds (sprite/collider size + anchor). Y increases downward. gap is extra pixels between bounds.",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity to move"),
      targetId: z.string().describe("Anchor entity to place relative to"),
      side: z.enum(["left", "right", "above", "below", "center"]).describe("Which side of the target to occupy"),
      gap: z.number().optional().describe("Pixels between bounds (default 0; ignored for center)"),
    },
    async ({ scenePath, entityId, targetId, side, gap }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const mover = findEntity(scene, entityId);
      const target = findEntity(scene, targetId);
      if (!mover) return toolJson({ error: `Entity "${entityId}" not found.` }, true);
      if (!target) return toolJson({ error: `Target "${targetId}" not found.` }, true);
      const moverBounds = getEntityBounds(mover);
      const targetBounds = getEntityBounds(target);
      if (!moverBounds || !targetBounds) {
        return toolJson({ error: "Both entities need a Transform to place relative." }, true);
      }
      const spacing = gap ?? 0;
      let minX = moverBounds.minX;
      let minY = moverBounds.minY;
      switch (side) {
        case "left":
          minX = targetBounds.minX - moverBounds.width - spacing;
          minY = targetBounds.minY + (targetBounds.height - moverBounds.height) / 2;
          break;
        case "right":
          minX = targetBounds.maxX + spacing;
          minY = targetBounds.minY + (targetBounds.height - moverBounds.height) / 2;
          break;
        case "above":
          minX = targetBounds.minX + (targetBounds.width - moverBounds.width) / 2;
          minY = targetBounds.minY - moverBounds.height - spacing;
          break;
        case "below":
          minX = targetBounds.minX + (targetBounds.width - moverBounds.width) / 2;
          minY = targetBounds.maxY + spacing;
          break;
        case "center":
          minX = targetBounds.minX + (targetBounds.width - moverBounds.width) / 2;
          minY = targetBounds.minY + (targetBounds.height - moverBounds.height) / 2;
          break;
      }
      setPositionFromMin(mover, minX, minY);
      await fileIO.writeScene(filename, scene);
      return toolJson({
        success: true,
        entity: summarizeEntity(mover),
        target: summarizeEntity(target),
        side,
        gap: spacing,
      });
    },
  );

  server.tool(
    "layout_entities",
    "Arrange a list of entities as a row, column, grid, alignment, or even distribution. Uses visual bounds so sprites do not overlap when gap is set. Origin defaults to the first entity's top-left.",
    {
      scenePath: z.string().describe("Scene filename"),
      entityIds: z.array(z.string()).min(1).describe("Entities to arrange, in order"),
      mode: LayoutModeSchema.describe("Layout mode"),
      origin: z.object({ x: z.number(), y: z.number() }).optional().describe("Top-left origin for row/column/grid (world pixels)"),
      gap: z.number().optional().describe("Pixels between bounds (default 8)"),
      columns: z.number().int().min(1).optional().describe("Column count for grid mode (default 3)"),
    },
    async ({ scenePath, entityIds, mode, origin, gap, columns }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const entities: GameKitEntity[] = [];
      for (const id of entityIds) {
        const entity = findEntity(scene, id);
        if (!entity) return toolJson({ error: `Entity "${id}" not found.` }, true);
        entities.push(entity);
      }

      const spacing = gap ?? 8;
      const firstBounds = getEntityBounds(entities[0]);
      if (!firstBounds) return toolJson({ error: `Entity "${entities[0].name}" has no Transform.` }, true);
      const originX = origin?.x ?? firstBounds.minX;
      const originY = origin?.y ?? firstBounds.minY;

      const applyRow = (startX: number, startY: number, cols?: number) => {
        const colCount = cols ?? entities.length;
        let x = startX;
        let y = startY;
        let col = 0;
        let rowHeight = 0;
        for (const entity of entities) {
          const bounds = getEntityBounds(entity);
          if (!bounds) continue;
          if (col >= colCount) {
            x = startX;
            y += rowHeight + spacing;
            col = 0;
            rowHeight = 0;
          }
          setPositionFromMin(entity, x, y);
          x += bounds.width + spacing;
          rowHeight = Math.max(rowHeight, bounds.height);
          col += 1;
        }
      };

      switch (mode) {
        case "row":
          applyRow(originX, originY);
          break;
        case "column": {
          let y = originY;
          for (const entity of entities) {
            const bounds = getEntityBounds(entity);
            if (!bounds) continue;
            setPositionFromMin(entity, originX, y);
            y += bounds.height + spacing;
          }
          break;
        }
        case "grid":
          applyRow(originX, originY, columns ?? 3);
          break;
        case "align-left":
          for (const entity of entities) {
            const bounds = getEntityBounds(entity);
            if (!bounds) continue;
            setPositionFromMin(entity, originX, bounds.minY);
          }
          break;
        case "align-right": {
          const maxRight = Math.max(
            ...entities.map((e) => getEntityBounds(e)?.maxX ?? Number.NEGATIVE_INFINITY),
          );
          for (const entity of entities) {
            const bounds = getEntityBounds(entity);
            if (!bounds) continue;
            setPositionFromMin(entity, maxRight - bounds.width, bounds.minY);
          }
          break;
        }
        case "align-top":
          for (const entity of entities) {
            const bounds = getEntityBounds(entity);
            if (!bounds) continue;
            setPositionFromMin(entity, bounds.minX, originY);
          }
          break;
        case "align-bottom": {
          const maxBottom = Math.max(
            ...entities.map((e) => getEntityBounds(e)?.maxY ?? Number.NEGATIVE_INFINITY),
          );
          for (const entity of entities) {
            const bounds = getEntityBounds(entity);
            if (!bounds) continue;
            setPositionFromMin(entity, bounds.minX, maxBottom - bounds.height);
          }
          break;
        }
        case "align-center-x": {
          const xs = entities.map((e) => getEntityBounds(e)?.x).filter((n): n is number => n !== undefined);
          const mid = xs.reduce((a, b) => a + b, 0) / xs.length;
          for (const entity of entities) {
            const transform = getTransform(entity);
            if (transform) transform.position = { ...transform.position, x: mid };
          }
          break;
        }
        case "align-center-y": {
          const ys = entities.map((e) => getEntityBounds(e)?.y).filter((n): n is number => n !== undefined);
          const mid = ys.reduce((a, b) => a + b, 0) / ys.length;
          for (const entity of entities) {
            const transform = getTransform(entity);
            if (transform) transform.position = { ...transform.position, y: mid };
          }
          break;
        }
        case "distribute-x": {
          if (entities.length >= 3) {
            const first = getEntityBounds(entities[0]);
            const last = getEntityBounds(entities[entities.length - 1]);
            if (first && last) {
              const span = last.x - first.x;
              const step = span / (entities.length - 1);
              entities.forEach((entity, i) => {
                const transform = getTransform(entity);
                if (transform) transform.position = { ...transform.position, x: first.x + step * i };
              });
            }
          }
          break;
        }
        case "distribute-y": {
          if (entities.length >= 3) {
            const first = getEntityBounds(entities[0]);
            const last = getEntityBounds(entities[entities.length - 1]);
            if (first && last) {
              const span = last.y - first.y;
              const step = span / (entities.length - 1);
              entities.forEach((entity, i) => {
                const transform = getTransform(entity);
                if (transform) transform.position = { ...transform.position, y: first.y + step * i };
              });
            }
          }
          break;
        }
      }

      await fileIO.writeScene(filename, scene);
      return toolJson({
        success: true,
        mode,
        gap: spacing,
        arranged: entities.map(summarizeEntity),
      });
    },
  );

  server.tool(
    "duplicate_entity",
    "Clone an entity count times with a per-copy position offset. Components are deep-copied; IDs are new. CameraFollow that targeted the original is retargeted to the clone.",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Source entity ID"),
      count: z.number().int().min(1).max(50).optional().describe("How many copies (default 1)"),
      offset: z
        .object({ x: z.number(), y: z.number() })
        .optional()
        .describe("World offset applied per copy index (copy i gets i * offset). Default {x: 48, y: 0}"),
      nameSuffix: z.string().optional().describe("Appended to the clone name (default ' Copy')"),
    },
    async ({ scenePath, entityId, count, offset, nameSuffix }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const source = findEntity(scene, entityId);
      if (!source) return toolJson({ error: `Entity "${entityId}" not found.` }, true);

      const copies = count ?? 1;
      const delta = offset ?? { x: 48, y: 0 };
      const suffix = nameSuffix ?? " Copy";
      const created: GameKitEntity[] = [];

      for (let i = 1; i <= copies; i++) {
        const clone: GameKitEntity = {
          id: createId(source.name),
          name: `${source.name}${suffix}${copies > 1 ? ` ${i}` : ""}`,
          components: structuredClone(source.components),
          ...(source.tags ? { tags: [...source.tags] } : {}),
        };
        const transform = getTransform(clone);
        if (transform) {
          transform.position = {
            x: transform.position.x + delta.x * i,
            y: transform.position.y + delta.y * i,
          };
        }
        for (const comp of clone.components) {
          if (comp.type === "CameraFollow" && (comp.targetId === source.id || comp.targetId === "self")) {
            comp.targetId = clone.id;
          }
        }
        scene.entities.push(clone);
        created.push(clone);
      }

      await fileIO.writeScene(filename, scene);
      return toolJson({
        success: true,
        sourceId: source.id,
        created: created.map(summarizeEntity),
      });
    },
  );

  server.tool(
    "reorder_entity",
    "Change draw/update order of an entity in the scene list (index 0 is drawn first / behind). Use 'front' to draw last, 'back' to draw first.",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID"),
      to: z
        .union([
          z.enum(["front", "back", "forward", "backward"]),
          z.number().int().min(0),
        ])
        .describe("Target index, or front/back/forward/backward"),
    },
    async ({ scenePath, entityId, to }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const index = scene.entities.findIndex((e) => e.id === entityId);
      if (index === -1) return toolJson({ error: `Entity "${entityId}" not found.` }, true);
      const [entity] = scene.entities.splice(index, 1);
      let nextIndex = index;
      if (to === "front") nextIndex = scene.entities.length;
      else if (to === "back") nextIndex = 0;
      else if (to === "forward") nextIndex = Math.min(index + 1, scene.entities.length);
      else if (to === "backward") nextIndex = Math.max(index - 1, 0);
      else nextIndex = Math.min(to, scene.entities.length);
      scene.entities.splice(nextIndex, 0, entity);
      await fileIO.writeScene(filename, scene);
      return toolJson({
        success: true,
        entityId: entity.id,
        from: index,
        to: nextIndex,
        order: scene.entities.map((e) => ({ id: e.id, name: e.name })),
      });
    },
  );

  server.tool(
    "spawn_role",
    "Create an entity from a typical role kit (player, enemy, collectible, platform, obstacle) with Transform + Sprite + collider (and PlayerController/CameraFollow for player). Prefer this over hand-assembling components. CameraFollow.targetId is wired to the new entity.",
    {
      scenePath: z.string().describe("Scene filename"),
      role: z.enum(ENTITY_ROLES).describe("Role kit to spawn"),
      name: z.string().optional().describe("Entity name (defaults to the role, capitalized)"),
      position: z.object({ x: z.number(), y: z.number() }).optional().describe("World position (defaults to the kit's template)"),
      assetId: z.string().optional().describe("Override Sprite.assetId"),
      tags: z.array(z.string()).optional().describe("Override gameplay tags"),
    },
    async ({ scenePath, role, name, position, assetId, tags }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const entity = buildRoleEntity({ role, name, position, assetId, tags });
      scene.entities.push(entity);
      await fileIO.writeScene(filename, scene);
      return toolJson({
        success: true,
        role,
        description: getRoleDescription(role),
        entity,
        summary: summarizeEntity(entity),
      });
    },
  );
}
