import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createEntity, createId, type GameKitComponent } from "@gamekit/schema";
import { ComponentInputSchema, ComponentTypeSchema } from "../schemas/component.js";
import type { FileIO } from "../utils/file-io.js";

export function registerEntityTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "add_entity",
    "Add a new entity to a scene. Returns the created entity with its auto-generated ID. Components are optional; if omitted the entity has no components. Each component object must include a 'type' field (Transform, Sprite, AabbCollider, etc.). An entity cannot have two components of the same type.",
    {
      scenePath: z.string().describe("Scene filename including .scene.json extension (e.g., 'main.scene.json'). Resolves relative to gamekit/scenes/."),
      name: z.string().describe("Entity name (does not need to be unique)"),
      components: z.array(ComponentInputSchema).optional().describe("Optional array of component objects. Each must include a 'type' field (Transform, Sprite, AabbCollider, etc.). An entity cannot have two components of the same type."),
    },
    async ({ scenePath, name, components }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const entity = createEntity(name);
      if (components && components.length > 0) {
        entity.components = components as GameKitComponent[];
      }

      scene.entities.push(entity);
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    },
  );

  server.tool(
    "remove_entity",
    "Remove an entity from a scene by ID. This operation is not undoable. Any other entity referencing this entity (e.g., CameraFollow targetId) will retain the stale reference. Use list_entities to find valid IDs.",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID to remove"),
    },
    async ({ scenePath, entityId }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const index = scene.entities.findIndex((e) => e.id === entityId);
      if (index === -1) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity "${entityId}" not found in scene "${scenePath}". Use list_entities to see available entity IDs.` }) }],
          isError: true,
        };
      }

      const removed = scene.entities.splice(index, 1)[0];
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, removed: removed.name }) }],
      };
    },
  );

  server.tool(
    "update_entity",
    "Update an entity's properties. Currently only the 'name' field can be updated. At least one optional property must be provided; otherwise this is a no-op. Use list_entities to find valid IDs.",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID to update"),
      name: z.string().optional().describe("New entity name"),
    },
    async ({ scenePath, entityId, name }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity "${entityId}" not found in scene "${scenePath}". Use list_entities to see available entity IDs.` }) }],
          isError: true,
        };
      }

      if (name) {
        entity.name = name;
      }

      await fileIO.writeScene(filename, scene);
      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    },
  );

  server.tool(
    "add_component",
    "Add a component to an entity. The entity must not already have a component of the same type (use update_component to modify existing ones). Valid types: Transform, Sprite, AabbCollider, CircleCollider, PolygonCollider, PlayerController, RigidBody, CameraFollow, Animation, Tilemap, Text, AudioSource, AudioListener, Tween, FollowPath, StateMachine, Script, ParticleSystem. Returns the full updated entity.",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID"),
      component: ComponentInputSchema.describe("Component to add"),
    },
    async ({ scenePath, entityId, component }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity "${entityId}" not found in scene "${scenePath}". Use list_entities to see available entity IDs.` }) }],
          isError: true,
        };
      }

      const existing = entity.components.find((c) => c.type === component.type);
      if (existing) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity "${entity.name}" already has a ${component.type} component. Use update_component to modify it, or remove_component first.` }) }],
          isError: true,
        };
      }

      entity.components.push(component as GameKitComponent);
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    },
  );

  server.tool(
    "update_component",
    "Merge properties into an existing component on an entity. Pass only the fields you want to change; all other fields remain unchanged. The 'type' field cannot be changed. For CameraFollow, the targetId is validated against existing entity IDs. Use list_components to see what the entity currently has.",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID"),
      componentType: ComponentTypeSchema.describe("Component type to update"),
      props: z.record(z.unknown()).describe("Properties to update"),
    },
    async ({ scenePath, entityId, componentType, props }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity "${entityId}" not found in scene "${scenePath}". Use list_entities to see available entity IDs.` }) }],
          isError: true,
        };
      }

      const component = entity.components.find((c) => c.type === componentType);
      if (!component) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity "${entity.name}" has no ${componentType} component. Use add_component to add one, or list_components to see available components.` }) }],
          isError: true,
        };
      }

      Object.assign(component, props);

      if (
        componentType === "CameraFollow" &&
        "targetId" in props &&
        typeof props.targetId === "string"
      ) {
        const targetExists = scene.entities.some((e) => e.id === props.targetId);
        if (!targetExists) {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Target entity "${props.targetId}" not found in scene "${scenePath}". Use list_entities to see available entity IDs.` }) }],
            isError: true,
          };
        }
      }

      await fileIO.writeScene(filename, scene);
      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    },
  );

  server.tool(
    "remove_component",
    "Remove a component from an entity by type. This is not undoable. Removing essential components (e.g., Transform) may cause runtime errors. Use list_components to see available component types on the entity.",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID"),
      componentType: ComponentTypeSchema.describe("Component type to remove"),
    },
    async ({ scenePath, entityId, componentType }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity "${entityId}" not found in scene "${scenePath}". Use list_entities to see available entity IDs.` }) }],
          isError: true,
        };
      }

      const index = entity.components.findIndex((c) => c.type === componentType);
      if (index === -1) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity "${entity.name}" has no ${componentType} component. Use list_components to see available components.` }) }],
          isError: true,
        };
      }

      entity.components.splice(index, 1);
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, removed: componentType, entity: entity.name }) }],
      };
    },
  );
}
