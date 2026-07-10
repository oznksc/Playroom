import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FileIO } from "../utils/file-io.js";
import { CircleColliderInputSchema, RigidBodyInputSchema } from "../schemas/component.js";
import type { AabbColliderComponent, CircleColliderComponent, PolygonColliderComponent, GameKitComponent } from "@gamekit/schema";
import { raycast } from "@gamekit/runtime/collision";

export function registerPhysicsTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "add_collider",
    "Add an AabbCollider, CircleCollider, or PolygonCollider to an entity",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID"),
      type: z.enum(["AabbCollider", "CircleCollider", "PolygonCollider"]).describe("Collider type"),
      offset: z.object({ x: z.number(), y: z.number() }).optional().describe("Collider offset from transform position"),
      size: z.object({ x: z.number().positive(), y: z.number().positive() }).optional().describe("Size for AabbCollider"),
      radius: z.number().positive().optional().describe("Radius for CircleCollider"),
      points: z.array(z.object({ x: z.number(), y: z.number() })).min(3).optional().describe("Points for PolygonCollider (min 3)"),
      isStatic: z.boolean().default(false).describe("Whether the collider is static (immovable)"),
      isTrigger: z.boolean().default(false).describe("Whether the collider is a trigger (overlap only, no collision response)"),
      layer: z.number().int().optional().describe("Collision layer bitmask"),
      mask: z.number().int().optional().describe("Collision mask bitmask"),
    },
    async ({ scenePath, entityId, type, offset, size, radius, points, isStatic, isTrigger, layer, mask }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }

      const existingCollider = entity.components.find(
        (c) => c.type === "AabbCollider" || c.type === "CircleCollider" || c.type === "PolygonCollider"
      );
      if (existingCollider) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity already has a collider: ${existingCollider.type}` }) }],
          isError: true,
        };
      }

      if (type === "AabbCollider") {
        if (!size) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "size is required for AabbCollider" }) }],
            isError: true,
          };
        }
        const component: AabbColliderComponent = {
          type: "AabbCollider",
          offset: offset ?? { x: 0, y: 0 },
          size,
          isStatic,
          ...(layer !== undefined ? { layer } : {}),
          ...(mask !== undefined ? { mask } : {}),
        };
        entity.components.push(component as GameKitComponent);
      } else if (type === "CircleCollider") {
        if (!radius) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "radius is required for CircleCollider" }) }],
            isError: true,
          };
        }
        const component: CircleColliderComponent = {
          type: "CircleCollider",
          offset: offset ?? { x: 0, y: 0 },
          radius,
          isStatic,
          isTrigger,
          ...(layer !== undefined ? { layer } : {}),
          ...(mask !== undefined ? { mask } : {}),
        };
        entity.components.push(component as GameKitComponent);
      } else if (type === "PolygonCollider") {
        if (!points) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: "points is required for PolygonCollider" }) }],
            isError: true,
          };
        }
        const component: PolygonColliderComponent = {
          type: "PolygonCollider",
          offset: offset ?? { x: 0, y: 0 },
          points,
          isStatic,
          ...(isTrigger ? { isTrigger } : {}),
          ...(layer !== undefined ? { layer } : {}),
          ...(mask !== undefined ? { mask } : {}),
        };
        entity.components.push(component as GameKitComponent);
      }

      await fileIO.writeScene(filename, scene);
      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    },
  );

  server.tool(
    "add_rigid_body",
    "Add a RigidBody component to an entity",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID"),
      mass: z.number().positive().default(1).describe("Mass in kg"),
      isKinematic: z.boolean().default(false).describe("Kinematic bodies are not affected by forces"),
      gravityScale: z.number().default(1).describe("Gravity multiplier"),
      drag: z.number().min(0).max(1).default(0).describe("Linear damping (0-1)"),
      useGravity: z.boolean().default(true).describe("Whether gravity applies"),
      initialVelocity: z.object({ x: z.number(), y: z.number() }).optional().describe("Starting velocity"),
    },
    async ({ scenePath, entityId, mass, isKinematic, gravityScale, drag, useGravity, initialVelocity }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }

      const existing = entity.components.find((c) => c.type === "RigidBody");
      if (existing) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Entity already has a RigidBody component" }) }],
          isError: true,
        };
      }

      entity.components.push({
        type: "RigidBody",
        velocity: initialVelocity ?? { x: 0, y: 0 },
        angularVelocity: 0,
        mass,
        drag,
        isKinematic,
        gravityScale,
        useGravity,
      } as GameKitComponent);

      await fileIO.writeScene(filename, scene);
      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    },
  );

  server.tool(
    "set_collision_layer",
    "Set collision layer and mask for an entity's collider",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID"),
      layer: z.number().int().optional().describe("Collision layer bitmask"),
      mask: z.number().int().optional().describe("Collision mask bitmask"),
    },
    async ({ scenePath, entityId, layer, mask }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }

      const collider = entity.components.find(
        (c): c is AabbColliderComponent | CircleColliderComponent | PolygonColliderComponent =>
          c.type === "AabbCollider" || c.type === "CircleCollider" || c.type === "PolygonCollider"
      );

      if (!collider) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Entity has no collider component" }) }],
          isError: true,
        };
      }

      if (layer !== undefined) (collider as Record<string, unknown>).layer = layer;
      if (mask !== undefined) (collider as Record<string, unknown>).mask = mask;

      await fileIO.writeScene(filename, scene);
      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    },
  );

  server.tool(
    "set_trigger",
    "Set a collider as a trigger (overlap-only, no collision response)",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID"),
      isTrigger: z.boolean().describe("Whether the collider should be a trigger"),
    },
    async ({ scenePath, entityId, isTrigger }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }

      const circleCollider = entity.components.find(
        (c): c is CircleColliderComponent => c.type === "CircleCollider"
      );
      const aabbCollider = entity.components.find(
        (c): c is AabbColliderComponent => c.type === "AabbCollider"
      );
      const polygonCollider = entity.components.find(
        (c): c is PolygonColliderComponent => c.type === "PolygonCollider"
      );

      if (!circleCollider && !aabbCollider && !polygonCollider) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Entity has no collider" }) }],
          isError: true,
        };
      }

      if (circleCollider) {
        circleCollider.isTrigger = isTrigger;
      }
      if (aabbCollider) {
        Object.assign(aabbCollider, { isTrigger });
      }
      if (polygonCollider) {
        Object.assign(polygonCollider, { isTrigger });
      }

      await fileIO.writeScene(filename, scene);
      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    },
  );

  server.tool(
    "raycast",
    "Cast a ray from origin in direction and return the first entity hit",
    {
      scenePath: z.string().describe("Scene filename"),
      originX: z.number().describe("Ray origin X"),
      originY: z.number().describe("Ray origin Y"),
      directionX: z.number().describe("Ray direction X (will be normalized)"),
      directionY: z.number().describe("Ray direction Y (will be normalized)"),
      maxDistance: z.number().positive().optional().describe("Maximum ray distance"),
      mask: z.number().int().optional().describe("Collision mask filter"),
    },
    async ({ scenePath, originX, originY, directionX, directionY, maxDistance, mask }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const hit = raycast(
        { x: originX, y: originY },
        { x: directionX, y: directionY },
        scene.entities,
        { maxDistance, mask },
      );

      if (!hit) {
        return {
          content: [{ type: "text", text: JSON.stringify({ hit: null }) }],
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(hit, null, 2) }],
      };
    },
  );

  server.tool(
    "query_overlaps",
    "List all entities with colliders overlapping a given point or area",
    {
      scenePath: z.string().describe("Scene filename"),
      pointX: z.number().describe("Query point X"),
      pointY: z.number().describe("Query point Y"),
      radius: z.number().min(0).default(0).describe("Query radius (0 = point query)"),
      mask: z.number().int().optional().describe("Collision mask filter"),
    },
    async ({ scenePath, pointX, pointY, radius, mask }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const origin = { x: pointX, y: pointY };
      const overlaps: { entityId: string; colliderType: string }[] = [];

      for (const entity of scene.entities) {
        const transform = entity.components.find((c: any) => c.type === "Transform") as any;
        if (!transform) continue;

        const aabbComp = entity.components.find((c: any): c is AabbColliderComponent => c.type === "AabbCollider");
        const circleComp = entity.components.find((c: any): c is CircleColliderComponent => c.type === "CircleCollider");

        if (mask !== undefined) {
          const layer = aabbComp?.layer ?? circleComp?.layer ?? 1;
          if ((mask & layer) === 0) continue;
        }

        if (aabbComp) {
          const ex = transform.position.x + aabbComp.offset.x;
          const ey = transform.position.y + aabbComp.offset.y;
          const ew = aabbComp.size.x * transform.scale.x;
          const eh = aabbComp.size.y * transform.scale.y;
          if (radius > 0) {
            const closestX = Math.max(ex, Math.min(origin.x, ex + ew));
            const closestY = Math.max(ey, Math.min(origin.y, ey + eh));
            const dx = origin.x - closestX;
            const dy = origin.y - closestY;
            if (dx * dx + dy * dy <= radius * radius) {
              overlaps.push({ entityId: entity.id, colliderType: "AabbCollider" });
            }
          } else {
            if (origin.x >= ex && origin.x <= ex + ew && origin.y >= ey && origin.y <= ey + eh) {
              overlaps.push({ entityId: entity.id, colliderType: "AabbCollider" });
            }
          }
        }

        if (circleComp) {
          const cx = transform.position.x + circleComp.offset.x;
          const cy = transform.position.y + circleComp.offset.y;
          const cr = circleComp.radius * Math.max(transform.scale.x, transform.scale.y);
          const dx = origin.x - cx;
          const dy = origin.y - cy;
          const queryR = cr + radius;
          if (dx * dx + dy * dy <= queryR * queryR) {
            overlaps.push({ entityId: entity.id, colliderType: "CircleCollider" });
          }
        }
      }

      return {
        content: [{ type: "text", text: JSON.stringify(overlaps, null, 2) }],
      };
    },
  );
}
