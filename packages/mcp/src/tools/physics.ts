import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FileIO } from "../utils/file-io.js";
import { CircleColliderInputSchema, RigidBodyInputSchema } from "../schemas/component.js";
import type { AabbColliderComponent, CircleColliderComponent, PolygonColliderComponent, TransformComponent } from "@gamekit/schema";
import { GameKitComponentSchema } from "@gamekit/schema";
import { raycast } from "@gamekit/runtime/collision";

export function registerPhysicsTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "add_collider",
    "Add a physics collider to an entity. Only one collider per entity is allowed (AabbCollider, CircleCollider, or PolygonCollider). Conditional requirements: AabbCollider requires 'size' ({x,y} in pixels, both > 0); CircleCollider requires 'radius' (pixels, > 0); PolygonCollider requires 'points' (array of >=3 local-coordinate vertices). 'layer' and 'mask' are integer bitmasks for collision filtering. Returns the updated entity.",
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
          content: [{ type: "text", text: JSON.stringify({ error: `Entity "${entityId}" not found in scene "${scenePath}". Use list_entities to see available entity IDs.` }) }],
          isError: true,
        };
      }

      const existingCollider = entity.components.find(
        (c) => c.type === "AabbCollider" || c.type === "CircleCollider" || c.type === "PolygonCollider"
      );
      if (existingCollider) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity "${entity.name}" already has a ${existingCollider.type}. Use remove_component first to replace it.` }) }],
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
        entity.components.push(GameKitComponentSchema.parse(component));
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
        entity.components.push(GameKitComponentSchema.parse(component));
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
        entity.components.push(GameKitComponentSchema.parse(component));
      }

      await fileIO.writeScene(filename, scene);
      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    },
  );

  server.tool(
    "add_rigid_body",
    "Add a RigidBody to an entity for physics simulation. Only one RigidBody per entity is allowed. Dynamic bodies (isKinematic=false) respond to forces, gravity, and collisions. Kinematic bodies (isKinematic=true) move only via code. gravityScale: 0=float, 1=normal, 2=double. drag: 0=no air resistance, 1=full stop. Returns the updated entity.",
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
          content: [{ type: "text", text: JSON.stringify({ error: `Entity "${entityId}" not found in scene "${scenePath}". Use list_entities to see available entity IDs.` }) }],
          isError: true,
        };
      }

      const existing = entity.components.find((c) => c.type === "RigidBody");
      if (existing) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity "${entity.name}" already has a RigidBody component. Use remove_component first to replace it.` }) }],
          isError: true,
        };
      }

      entity.components.push(GameKitComponentSchema.parse({
        type: "RigidBody",
        velocity: initialVelocity ?? { x: 0, y: 0 },
        angularVelocity: 0,
        mass,
        drag,
        isKinematic,
        gravityScale,
        useGravity,
      }));

      await fileIO.writeScene(filename, scene);
      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    },
  );

  server.tool(
    "set_collision_layer",
    "Set collision layer and/or mask bitmasks on an entity's existing collider. The entity must have an AabbCollider, CircleCollider, or PolygonCollider. Bitmask logic: collision occurs when (A.mask & B.layer) != 0 AND (B.mask & A.layer) != 0. Example: layer=1, mask=3 means this entity is on layer 1 and collides with layers 1 and 2.",
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
          content: [{ type: "text", text: JSON.stringify({ error: `Entity "${entityId}" not found in scene "${scenePath}". Use list_entities to see available entity IDs.` }) }],
          isError: true,
        };
      }

      const collider = entity.components.find(
        (c): c is AabbColliderComponent | CircleColliderComponent | PolygonColliderComponent =>
          c.type === "AabbCollider" || c.type === "CircleCollider" || c.type === "PolygonCollider"
      );

      if (!collider) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity "${entity.name}" has no collider component. Use add_collider to add one.` }) }],
          isError: true,
        };
      }

      if (layer !== undefined) collider.layer = layer;
      if (mask !== undefined) collider.mask = mask;

      await fileIO.writeScene(filename, scene);
      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    },
  );

  server.tool(
    "set_trigger",
    "Set a collider as a trigger on an entity. Trigger colliders detect overlaps but do not produce physical collision responses (objects pass through). The entity must already have a collider (AabbCollider, CircleCollider, or PolygonCollider).",
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
          content: [{ type: "text", text: JSON.stringify({ error: `Entity "${entityId}" not found in scene "${scenePath}". Use list_entities to see available entity IDs.` }) }],
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
          content: [{ type: "text", text: JSON.stringify({ error: `Entity "${entity.name}" has no collider component. Use add_collider to add one.` }) }],
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
    "Cast a ray in the scene and return the first entity with a collider that intersects it. Direction vector is auto-normalized. Returns { hit: null } if nothing is hit, otherwise returns hit info with entityId, point, normal, and distance. Entities without colliders are ignored. maxDistance limits ray length in pixels (omit for unlimited). mask filters by collision layer bitmask.",
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
    "Query all entities whose colliders overlap a given point or circular area. radius=0 performs a point-in-collider test; radius>0 finds all colliders within that distance in pixels of the point. Returns an array of { entityId, colliderType } objects. Entities without a Transform or collider are ignored.",
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
        const transform = entity.components.find((c): c is TransformComponent => c.type === "Transform");
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
