import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createEntity, createId, type GameKitComponent } from "@gamekit/schema";
import { ComponentInputSchema, ComponentTypeSchema } from "../schemas/component.js";
import type { FileIO } from "../utils/file-io.js";

export function registerEntityTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "add_entity",
    "Add a new entity to a scene",
    {
      scenePath: z.string().describe("Scene filename"),
      name: z.string().describe("Entity name"),
      components: z.array(ComponentInputSchema).optional().describe("Initial components"),
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
    "Remove an entity from a scene",
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
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
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
    "Update entity properties (name)",
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
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
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
    "Add a component to an entity",
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
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }

      const existing = entity.components.find((c) => c.type === component.type);
      if (existing) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Component already exists: ${component.type}` }) }],
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
    "Update component properties",
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
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }

      const component = entity.components.find((c) => c.type === componentType);
      if (!component) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Component not found: ${componentType}` }) }],
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
            content: [{ type: "text", text: JSON.stringify({ error: `Target entity not found: ${props.targetId}` }) }],
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
    "Remove a component from an entity",
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
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }

      const index = entity.components.findIndex((c) => c.type === componentType);
      if (index === -1) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Component not found: ${componentType}` }) }],
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
