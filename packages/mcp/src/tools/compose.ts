import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  GameKitComponentSchema,
  createId,
  type AabbColliderComponent,
  type CameraFollowComponent,
  type CircleColliderComponent,
  type GameKitComponent,
  type GameKitEntity,
  type ScriptComponent,
  type SpriteComponent,
  type TextComponent,
} from "@gamekit/schema";
import type { FileIO } from "../utils/file-io.js";
import { toolJson } from "../utils/result.js";
import { ENTITY_ROLES, buildRoleEntity, getRoleDescription } from "../utils/roles.js";
import { findEntity, getTransform, summarizeEntity } from "../utils/entity-query.js";
import { ComponentTypeSchema } from "../schemas/component.js";

const SCRIPT_EVENTS = [
  "start",
  "update",
  "triggerEnter",
  "triggerExit",
  "collisionEnter",
  "collisionExit",
  "tap",
  "longPress",
  "swipeUp",
  "swipeDown",
  "swipeLeft",
  "swipeRight",
  "pinch",
] as const;

const SCRIPT_ACTIONS = [
  { type: "playSound", fields: ["assetId"] },
  { type: "switchScene", fields: ["sceneId"] },
  { type: "nextScene", fields: [] },
  { type: "nextLevel", fields: [] },
  { type: "unlockLevel", fields: ["levelId"] },
  { type: "completeLevel", fields: ["levelId?"] },
  { type: "destroyEntity", fields: ["entityId?"] },
  { type: "setVariable", fields: ["key", "value"] },
  { type: "incrementVariable", fields: ["key", "by?"] },
  { type: "applyImpulse", fields: ["force.x", "force.y"] },
  { type: "transitionState", fields: ["state"] },
  { type: "win", fields: ["message?"] },
  { type: "lose", fields: ["message?"] },
  { type: "gameOver", fields: ["message?"] },
  { type: "respawn", fields: [] },
  { type: "completeObjective", fields: ["objectiveId"] },
  { type: "setLives", fields: ["lives"] },
  { type: "addLives", fields: ["by"] },
  { type: "setCheckpoint", fields: ["x?", "y?", "point?"] },
] as const;

const COMPONENT_CATALOG: Array<{ type: string; fields: string; notes: string }> = [
  { type: "Transform", fields: "position, rotation, scale", notes: "Required on every entity" },
  { type: "Sprite", fields: "assetId, width, height, anchor", notes: "Primary visual" },
  {
    type: "AabbCollider",
    fields: "offset, size, isStatic, isTrigger, layer, mask",
    notes: "One collider type per entity",
  },
  {
    type: "CircleCollider",
    fields: "offset, radius, isStatic, isTrigger, layer, mask",
    notes: "One collider type per entity",
  },
  {
    type: "PolygonCollider",
    fields: "offset, points, isStatic, isTrigger",
    notes: "Convex; one collider type per entity",
  },
  {
    type: "PlayerController",
    fields: "speed, jumpVelocity, gravity",
    notes: "gravity 0 = top-down 4-way",
  },
  { type: "CameraFollow", fields: "targetId, smoothing", notes: "smoothing 0–1 exponential lerp" },
  {
    type: "RigidBody",
    fields: "velocity, mass, drag, isKinematic, gravityScale, useGravity",
    notes: "Needed for impulses",
  },
  {
    type: "Animation",
    fields: "assetId, frameWidth, frameHeight, totalFrames, framesPerSecond, loop",
    notes: "Sprite sheet",
  },
  {
    type: "Tilemap",
    fields: "tilesetId, tileWidth/Height, columns, grid, tiles, solid",
    notes: "solid = static tiles",
  },
  {
    type: "Text",
    fields: "text, fontAssetId, size, color, align, width?",
    notes: "width enables wrap",
  },
  {
    type: "AudioSource",
    fields: "assetId, volume, loop, playOnStart, minDistance?, maxDistance?",
    notes: "Spatial if listener present",
  },
  { type: "AudioListener", fields: "enabled", notes: "One per scene typical" },
  {
    type: "Tween",
    fields: "property, startValue, endValue, duration, easing, loop, pingPong",
    notes: "Prefer recipes when possible",
  },
  { type: "FollowPath", fields: "points, speed, loop", notes: "Patrol / moving platform" },
  { type: "StateMachine", fields: "initialState, states[]", notes: "enter/exit/on/duration" },
  { type: "Script", fields: "handlers[{event, actions}]", notes: "See list_script_catalog" },
  {
    type: "ParticleSystem",
    fields: "maxParticles, emissionRate, lifetime, speed, colors, sizes",
    notes: "Prefer effect recipes",
  },
  { type: "Light2D", fields: "kind, range, intensity, color", notes: "point or spot" },
  {
    type: "NineSlice",
    fields: "assetId, width, height, left/right/top/bottom",
    notes: "UI panels, stretchy platforms",
  },
];

function visualSize(entity: GameKitEntity): { width: number; height: number } | null {
  const sprite = entity.components.find((c): c is SpriteComponent => c.type === "Sprite");
  if (sprite) return { width: sprite.width, height: sprite.height };
  const nine = entity.components.find((c) => c.type === "NineSlice");
  if (nine) return { width: nine.width, height: nine.height };
  const text = entity.components.find((c): c is TextComponent => c.type === "Text");
  if (text)
    return {
      width: text.width ?? text.size * Math.max(1, text.text.length * 0.6),
      height: text.size,
    };
  return null;
}

function remapAssetId(comp: GameKitComponent, fromId: string, toId: string): boolean {
  let changed = false;
  if ("assetId" in comp && comp.assetId === fromId) {
    (comp as { assetId: string }).assetId = toId;
    changed = true;
  }
  if ("tilesetId" in comp && (comp as { tilesetId: string }).tilesetId === fromId) {
    (comp as { tilesetId: string }).tilesetId = toId;
    changed = true;
  }
  if ("fontAssetId" in comp && (comp as { fontAssetId: string }).fontAssetId === fromId) {
    (comp as { fontAssetId: string }).fontAssetId = toId;
    changed = true;
  }
  return changed;
}

export function registerComposeTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "list_component_types",
    "Catalog of valid GameKit component types and their main fields. Use instead of inventing types.",
    {},
    async () => toolJson({ count: COMPONENT_CATALOG.length, components: COMPONENT_CATALOG })
  );

  server.tool(
    "list_script_catalog",
    "Catalog of Script events and action types the runtime actually executes. Use before add_script_handler.",
    {},
    async () =>
      toolJson({
        events: SCRIPT_EVENTS,
        actions: SCRIPT_ACTIONS,
        notes: [
          "An entity may have one Script component with many handlers.",
          "triggerEnter/Exit require a collider with isTrigger true.",
          "collisionEnter requires a solid collider (isTrigger false).",
          "applyImpulse requires a RigidBody on the same entity.",
        ],
      })
  );

  server.tool(
    "set_sprite",
    "Create or update the Sprite on an entity (assetId, size, anchor). Does not touch colliders — call fit_collider_to_sprite after resizing.",
    {
      scenePath: z.string(),
      entityId: z.string(),
      assetId: z.string().optional(),
      width: z.number().positive().optional(),
      height: z.number().positive().optional(),
      anchor: z.object({ x: z.number(), y: z.number() }).optional(),
    },
    async ({ scenePath, entityId, assetId, width, height, anchor }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const entity = findEntity(scene, entityId);
      if (!entity) return toolJson({ error: `Entity "${entityId}" not found.` }, true);
      let sprite = entity.components.find((c): c is SpriteComponent => c.type === "Sprite");
      if (!sprite) {
        sprite = GameKitComponentSchema.parse({
          type: "Sprite",
          assetId: assetId ?? "player",
          width: width ?? 48,
          height: height ?? 48,
          anchor: anchor ?? { x: 0.5, y: 0.5 },
        }) as SpriteComponent;
        entity.components.push(sprite);
      } else {
        if (assetId) sprite.assetId = assetId;
        if (width !== undefined) sprite.width = width;
        if (height !== undefined) sprite.height = height;
        if (anchor) sprite.anchor = { ...anchor };
      }
      await fileIO.writeScene(filename, scene);
      return toolJson({ success: true, entity: summarizeEntity(entity), sprite });
    }
  );

  server.tool(
    "fit_collider_to_sprite",
    "Resize the entity's collider to match Sprite/NineSlice size (AABB size or Circle radius). Adds an AABB if no collider exists.",
    {
      scenePath: z.string(),
      entityId: z.string(),
      isTrigger: z.boolean().optional().describe("Set trigger flag when adding or updating"),
      isStatic: z.boolean().optional(),
    },
    async ({ scenePath, entityId, isTrigger, isStatic }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const entity = findEntity(scene, entityId);
      if (!entity) return toolJson({ error: `Entity "${entityId}" not found.` }, true);
      const size = visualSize(entity);
      if (!size)
        return toolJson(
          { error: "Entity has no Sprite/NineSlice/Text to fit against. Call set_sprite first." },
          true
        );

      const aabb = entity.components.find(
        (c): c is AabbColliderComponent => c.type === "AabbCollider"
      );
      const circle = entity.components.find(
        (c): c is CircleColliderComponent => c.type === "CircleCollider"
      );
      const polygon = entity.components.find((c) => c.type === "PolygonCollider");
      if (polygon && !aabb && !circle) {
        return toolJson(
          {
            error: "Entity has a PolygonCollider; resize its points with update_component instead.",
          },
          true
        );
      }

      if (aabb) {
        aabb.size = { x: size.width, y: size.height };
        aabb.offset = { x: 0, y: 0 };
        if (isTrigger !== undefined) aabb.isTrigger = isTrigger;
        if (isStatic !== undefined) aabb.isStatic = isStatic;
      } else if (circle) {
        circle.radius = Math.max(size.width, size.height) / 2;
        circle.offset = { x: 0, y: 0 };
        if (isTrigger !== undefined) circle.isTrigger = isTrigger;
        if (isStatic !== undefined) circle.isStatic = isStatic;
      } else {
        entity.components.push(
          GameKitComponentSchema.parse({
            type: "AabbCollider",
            offset: { x: 0, y: 0 },
            size: { x: size.width, y: size.height },
            isStatic: isStatic ?? false,
            isTrigger: isTrigger ?? false,
          })
        );
      }
      await fileIO.writeScene(filename, scene);
      return toolJson({ success: true, fitted: size, entity: summarizeEntity(entity) });
    }
  );

  server.tool(
    "wire_camera_follow",
    "Add or update CameraFollow so the camera tracks targetId. If entityId is omitted, CameraFollow is placed on the target itself.",
    {
      scenePath: z.string(),
      targetId: z.string().describe("Entity the camera should follow"),
      entityId: z
        .string()
        .optional()
        .describe("Entity that receives CameraFollow (defaults to targetId)"),
      smoothing: z.number().min(0).max(1).optional().describe("0–1 exponential lerp (default 0.1)"),
    },
    async ({ scenePath, targetId, entityId, smoothing }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const target = findEntity(scene, targetId);
      if (!target) return toolJson({ error: `Target "${targetId}" not found.` }, true);
      const hostId = entityId ?? targetId;
      const host = findEntity(scene, hostId);
      if (!host) return toolJson({ error: `Host "${hostId}" not found.` }, true);
      let cam = host.components.find((c): c is CameraFollowComponent => c.type === "CameraFollow");
      if (!cam) {
        cam = GameKitComponentSchema.parse({
          type: "CameraFollow",
          targetId,
          smoothing: smoothing ?? 0.1,
        }) as CameraFollowComponent;
        host.components.push(cam);
      } else {
        cam.targetId = targetId;
        if (smoothing !== undefined) cam.smoothing = smoothing;
      }
      await fileIO.writeScene(filename, scene);
      return toolJson({ success: true, hostId, camera: cam });
    }
  );

  server.tool(
    "set_text",
    "Create or update a Text component on an entity (HUD labels, signs).",
    {
      scenePath: z.string(),
      entityId: z.string(),
      text: z.string(),
      size: z.number().optional(),
      color: z.string().optional(),
      align: z.enum(["left", "center", "right"]).optional(),
      fontAssetId: z.string().optional(),
      width: z.number().positive().optional(),
    },
    async ({ scenePath, entityId, text, size, color, align, fontAssetId, width }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const entity = findEntity(scene, entityId);
      if (!entity) return toolJson({ error: `Entity "${entityId}" not found.` }, true);
      let label = entity.components.find((c): c is TextComponent => c.type === "Text");
      if (!label) {
        label = GameKitComponentSchema.parse({
          type: "Text",
          text,
          fontAssetId: fontAssetId ?? "",
          size: size ?? 16,
          color: color ?? "#ffffff",
          align: align ?? "left",
          ...(width !== undefined ? { width } : {}),
        }) as TextComponent;
        entity.components.push(label);
      } else {
        label.text = text;
        if (size !== undefined) label.size = size;
        if (color !== undefined) label.color = color;
        if (align !== undefined) label.align = align;
        if (fontAssetId !== undefined) label.fontAssetId = fontAssetId;
        if (width !== undefined) label.width = width;
      }
      await fileIO.writeScene(filename, scene);
      return toolJson({ success: true, text: label });
    }
  );

  server.tool(
    "add_script_handler",
    "Append (or replace) a Script handler on an entity. Creates the Script component if missing. Use list_script_catalog for valid events/actions.",
    {
      scenePath: z.string(),
      entityId: z.string(),
      event: z.string().min(1).describe("e.g. triggerEnter, collisionEnter, update, start"),
      actions: z
        .array(z.object({ type: z.string().min(1) }).catchall(z.unknown()))
        .min(1)
        .describe("Script actions, each with a type field"),
      replace: z
        .boolean()
        .optional()
        .describe("If true, replace existing handlers for this event (default false = append)"),
    },
    async ({ scenePath, entityId, event, actions, replace }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const entity = findEntity(scene, entityId);
      if (!entity) return toolJson({ error: `Entity "${entityId}" not found.` }, true);
      let script = entity.components.find((c): c is ScriptComponent => c.type === "Script");
      if (!script) {
        script = GameKitComponentSchema.parse({ type: "Script", handlers: [] }) as ScriptComponent;
        entity.components.push(script);
      }
      const handler = { event, actions };
      if (replace) {
        script.handlers = script.handlers.filter((h) => h.event !== event);
      }
      script.handlers.push(handler);
      await fileIO.writeScene(filename, scene);
      return toolJson({ success: true, handler, handlerCount: script.handlers.length });
    }
  );

  server.tool(
    "spawn_grid",
    "Spawn a grid of role-kit entities (collectible, platform, obstacle, …). Faster than looping spawn_role. Origin is the top-left cell position.",
    {
      scenePath: z.string(),
      role: z.enum(ENTITY_ROLES),
      columns: z.number().int().min(1).max(32),
      rows: z.number().int().min(1).max(32),
      origin: z
        .object({ x: z.number(), y: z.number() })
        .describe("World position of the first cell"),
      gap: z.number().optional().describe("Extra pixels between cell bounds (default 8)"),
      cell: z
        .object({ x: z.number(), y: z.number() })
        .optional()
        .describe("Cell size override; default uses the role sprite size"),
      namePrefix: z.string().optional(),
      assetId: z.string().optional(),
      tags: z.array(z.string()).optional(),
    },
    async ({ scenePath, role, columns, rows, origin, gap, cell, namePrefix, assetId, tags }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const prototype = buildRoleEntity({ role, position: origin, assetId, tags });
      const sprite = prototype.components.find((c): c is SpriteComponent => c.type === "Sprite");
      const cellW = cell?.x ?? sprite?.width ?? 48;
      const cellH = cell?.y ?? sprite?.height ?? 48;
      const spacing = gap ?? 8;
      const created: GameKitEntity[] = [];
      let n = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          n += 1;
          const entity = buildRoleEntity({
            role,
            name: `${namePrefix ?? prototype.name} ${n}`,
            position: {
              x: origin.x + col * (cellW + spacing),
              y: origin.y + row * (cellH + spacing),
            },
            assetId,
            tags,
          });
          scene.entities.push(entity);
          created.push(entity);
        }
      }
      await fileIO.writeScene(filename, scene);
      return toolJson({
        success: true,
        role,
        description: getRoleDescription(role),
        count: created.length,
        entities: created.map(summarizeEntity),
      });
    }
  );

  server.tool(
    "copy_entities",
    "Deep-copy entities into the same scene or another scene with a position offset. New IDs are minted; CameraFollow targets are remapped when the target is in the copied set.",
    {
      scenePath: z.string().describe("Source scene"),
      entityIds: z.array(z.string()).min(1),
      toScenePath: z.string().optional().describe("Destination scene (defaults to source)"),
      offset: z.object({ x: z.number(), y: z.number() }).optional(),
    },
    async ({ scenePath, entityIds, toScenePath, offset }) => {
      const srcName = fileIO.resolveScenePath(scenePath);
      const dstName = fileIO.resolveScenePath(toScenePath ?? scenePath);
      const sourceScene = await fileIO.readScene(srcName);
      const destScene = dstName === srcName ? sourceScene : await fileIO.readScene(dstName);
      const delta = offset ?? { x: 0, y: 0 };
      const idMap = new Map<string, string>();
      const clones: GameKitEntity[] = [];

      for (const id of entityIds) {
        const source = findEntity(sourceScene, id);
        if (!source) return toolJson({ error: `Entity "${id}" not found in ${srcName}.` }, true);
        const clone: GameKitEntity = {
          id: createId(source.name),
          name: source.name,
          components: structuredClone(source.components),
          ...(source.tags ? { tags: [...source.tags] } : {}),
        };
        const transform = getTransform(clone);
        if (transform) {
          transform.position = {
            x: transform.position.x + delta.x,
            y: transform.position.y + delta.y,
          };
        }
        idMap.set(source.id, clone.id);
        clones.push(clone);
      }

      for (const clone of clones) {
        for (const comp of clone.components) {
          if (comp.type === "CameraFollow") {
            const mapped = idMap.get(comp.targetId);
            if (mapped) comp.targetId = mapped;
          }
        }
        destScene.entities.push(clone);
      }

      await fileIO.writeScene(dstName, destScene);
      if (dstName !== srcName) {
        // source unchanged
      }
      return toolJson({
        success: true,
        from: srcName,
        to: dstName,
        copied: clones.map(summarizeEntity),
        idMap: Object.fromEntries(idMap),
      });
    }
  );

  server.tool(
    "move_entities",
    "Nudge many entities by the same world offset (or set a shared position). Prefer layout_entities for spacing.",
    {
      scenePath: z.string(),
      entityIds: z.array(z.string()).min(1),
      offset: z
        .object({ x: z.number(), y: z.number() })
        .optional()
        .describe("Added to each position"),
      position: z
        .object({ x: z.number(), y: z.number() })
        .optional()
        .describe("If set, every entity is moved to this point (stacks them)"),
    },
    async ({ scenePath, entityIds, offset, position }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const moved = [];
      for (const id of entityIds) {
        const entity = findEntity(scene, id);
        if (!entity) return toolJson({ error: `Entity "${id}" not found.` }, true);
        const transform = getTransform(entity);
        if (!transform)
          return toolJson({ error: `Entity "${entity.name}" has no Transform.` }, true);
        if (position) transform.position = { ...position };
        if (offset)
          transform.position = {
            x: transform.position.x + offset.x,
            y: transform.position.y + offset.y,
          };
        moved.push(summarizeEntity(entity));
      }
      await fileIO.writeScene(filename, scene);
      return toolJson({ success: true, moved });
    }
  );

  server.tool(
    "flip_entity",
    "Mirror an entity on X and/or Y by negating Transform.scale (sprite faces the other way).",
    {
      scenePath: z.string(),
      entityId: z.string(),
      axis: z.enum(["x", "y", "both"]).default("x"),
    },
    async ({ scenePath, entityId, axis }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const entity = findEntity(scene, entityId);
      if (!entity) return toolJson({ error: `Entity "${entityId}" not found.` }, true);
      const transform = getTransform(entity);
      if (!transform) return toolJson({ error: "No Transform." }, true);
      if (axis === "x" || axis === "both")
        transform.scale = { ...transform.scale, x: -transform.scale.x };
      if (axis === "y" || axis === "both")
        transform.scale = { ...transform.scale, y: -transform.scale.y };
      await fileIO.writeScene(filename, scene);
      return toolJson({ success: true, scale: transform.scale });
    }
  );

  server.tool(
    "replace_asset_refs",
    "Rewrite assetId / tilesetId / fontAssetId from one asset to another across a scene (or a subset of entities).",
    {
      scenePath: z.string(),
      fromAssetId: z.string(),
      toAssetId: z.string(),
      entityIds: z
        .array(z.string())
        .optional()
        .describe("Limit to these entities; omit for the whole scene"),
    },
    async ({ scenePath, fromAssetId, toAssetId, entityIds }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const targets = entityIds
        ? entityIds.map((id) => {
            const entity = findEntity(scene, id);
            if (!entity) throw new Error(`Entity "${id}" not found.`);
            return entity;
          })
        : scene.entities;
      let replacements = 0;
      try {
        for (const entity of targets) {
          for (const comp of entity.components) {
            if (remapAssetId(comp, fromAssetId, toAssetId)) replacements += 1;
          }
        }
      } catch (e) {
        return toolJson({ error: e instanceof Error ? e.message : String(e) }, true);
      }
      await fileIO.writeScene(filename, scene);
      return toolJson({ success: true, fromAssetId, toAssetId, replacements });
    }
  );

  server.tool(
    "copy_component",
    "Copy a component of a given type from one entity onto another (replaces the destination component of the same type if present).",
    {
      scenePath: z.string(),
      fromEntityId: z.string(),
      toEntityId: z.string(),
      componentType: ComponentTypeSchema,
    },
    async ({ scenePath, fromEntityId, toEntityId, componentType }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const from = findEntity(scene, fromEntityId);
      const to = findEntity(scene, toEntityId);
      if (!from) return toolJson({ error: `Source "${fromEntityId}" not found.` }, true);
      if (!to) return toolJson({ error: `Destination "${toEntityId}" not found.` }, true);
      const comp = from.components.find((c) => c.type === componentType);
      if (!comp) return toolJson({ error: `Source has no ${componentType}.` }, true);
      const clone = structuredClone(comp);
      const idx = to.components.findIndex((c) => c.type === componentType);
      if (idx >= 0) to.components[idx] = clone;
      else to.components.push(clone);
      await fileIO.writeScene(filename, scene);
      return toolJson({ success: true, copied: componentType, to: summarizeEntity(to) });
    }
  );
}
