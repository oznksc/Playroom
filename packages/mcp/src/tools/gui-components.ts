import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createGuiComponent, createGuiComponentInstance, createId } from "@gamekit/schema";
import { GuiNodeInputSchema } from "../schemas/gui.js";
import type { FileIO } from "../utils/file-io.js";

export function registerGuiComponentTools(server: McpServer, fileIO: FileIO): void {

  // ── Definition tools (operate on project.json) ──

  server.tool(
    "list_gui_components",
    "List all reusable GUI component definitions in the project",
    {},
    async () => {
      const project = await fileIO.readProject();
      const components = project.guiComponents ?? [];
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ componentCount: components.length, components }, null, 2)
        }],
      };
    },
  );

  server.tool(
    "get_gui_component",
    "Get a specific GUI component definition with its nodes",
    {
      componentId: z.string().describe("Component ID"),
    },
    async ({ componentId }) => {
      const project = await fileIO.readProject();
      const component = (project.guiComponents ?? []).find((c) => c.id === componentId);
      if (!component) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Component not found: ${componentId}` }) }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(component, null, 2) }],
      };
    },
  );

  server.tool(
    "create_gui_component",
    "Create a new reusable GUI component definition (empty, add nodes with add_node_to_component)",
    {
      name: z.string().describe("Component name (e.g. 'HUD', 'Pause Menu')"),
    },
    async ({ name }) => {
      const project = await fileIO.readProject();
      if (!project.guiComponents) project.guiComponents = [];

      const component = createGuiComponent(name);
      project.guiComponents.push(component);
      await fileIO.writeProject(project);

      return {
        content: [{ type: "text", text: JSON.stringify(component, null, 2) }],
      };
    },
  );

  server.tool(
    "update_gui_component",
    "Update a GUI component definition's metadata (name)",
    {
      componentId: z.string().describe("Component ID to update"),
      props: z.record(z.unknown()).describe("Properties to update (name)"),
    },
    async ({ componentId, props }) => {
      const project = await fileIO.readProject();
      const component = (project.guiComponents ?? []).find((c) => c.id === componentId);
      if (!component) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Component not found: ${componentId}` }) }],
          isError: true,
        };
      }

      if (typeof props.name === "string") component.name = props.name;
      await fileIO.writeProject(project);

      return {
        content: [{ type: "text", text: JSON.stringify(component, null, 2) }],
      };
    },
  );

  server.tool(
    "delete_gui_component",
    "Delete a GUI component definition (instances in scenes will become orphaned)",
    {
      componentId: z.string().describe("Component ID to delete"),
    },
    async ({ componentId }) => {
      const project = await fileIO.readProject();
      const components = project.guiComponents ?? [];
      const index = components.findIndex((c) => c.id === componentId);
      if (index === -1) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Component not found: ${componentId}` }) }],
          isError: true,
        };
      }

      const removed = components.splice(index, 1)[0];
      project.guiComponents = components;
      await fileIO.writeProject(project);

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, removed: removed.name, id: removed.id }) }],
      };
    },
  );

  server.tool(
    "add_node_to_component",
    "Add a GUI node (Text, Button, or Image) to a component definition",
    {
      componentId: z.string().describe("Component ID"),
      node: GuiNodeInputSchema.describe("GUI node to add to the component"),
    },
    async ({ componentId, node }) => {
      const project = await fileIO.readProject();
      const component = (project.guiComponents ?? []).find((c) => c.id === componentId);
      if (!component) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Component not found: ${componentId}` }) }],
          isError: true,
        };
      }

      const newNode = { ...node, id: createId(node.type) };
      component.nodes.push(newNode as any);
      await fileIO.writeProject(project);

      return {
        content: [{ type: "text", text: JSON.stringify(newNode, null, 2) }],
      };
    },
  );

  server.tool(
    "update_node_in_component",
    "Update a GUI node's properties within a component definition",
    {
      componentId: z.string().describe("Component ID"),
      nodeId: z.string().describe("Node ID within the component"),
      props: z.record(z.unknown()).describe("Properties to update"),
    },
    async ({ componentId, nodeId, props }) => {
      const project = await fileIO.readProject();
      const component = (project.guiComponents ?? []).find((c) => c.id === componentId);
      if (!component) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Component not found: ${componentId}` }) }],
          isError: true,
        };
      }

      const node = component.nodes.find((n) => n.id === nodeId);
      if (!node) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Node not found: ${nodeId}` }) }],
          isError: true,
        };
      }

      const { id, type, ...safeProps } = props;
      Object.assign(node, safeProps);
      await fileIO.writeProject(project);

      return {
        content: [{ type: "text", text: JSON.stringify(node, null, 2) }],
      };
    },
  );

  server.tool(
    "remove_node_from_component",
    "Remove a GUI node from a component definition",
    {
      componentId: z.string().describe("Component ID"),
      nodeId: z.string().describe("Node ID to remove"),
    },
    async ({ componentId, nodeId }) => {
      const project = await fileIO.readProject();
      const component = (project.guiComponents ?? []).find((c) => c.id === componentId);
      if (!component) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Component not found: ${componentId}` }) }],
          isError: true,
        };
      }

      const index = component.nodes.findIndex((n) => n.id === nodeId);
      if (index === -1) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Node not found: ${nodeId}` }) }],
          isError: true,
        };
      }

      const removed = component.nodes.splice(index, 1)[0];
      await fileIO.writeProject(project);

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, removed: removed.id, type: removed.type }) }],
      };
    },
  );

  // ── Instance tools (operate on scene files) ──

  server.tool(
    "list_component_instances",
    "List all GUI component instances placed in a scene",
    {
      scenePath: z.string().describe("Scene filename"),
    },
    async ({ scenePath }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const project = await fileIO.readProject();

      const instances = scene.gui?.componentInstances ?? [];
      const componentMap = new Map((project.guiComponents ?? []).map((c) => [c.id, c]));

      const enriched = instances.map((inst) => ({
        ...inst,
        component: componentMap.get(inst.componentId)?.name ?? "(missing)"
      }));

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ instanceCount: instances.length, instances: enriched }, null, 2)
        }],
      };
    },
  );

  server.tool(
    "add_component_instance",
    "Place a GUI component instance in a scene",
    {
      scenePath: z.string().describe("Scene filename"),
      componentId: z.string().describe("Component definition ID to instantiate"),
      x: z.number().default(0).describe("X position offset"),
      y: z.number().default(0).describe("Y position offset"),
    },
    async ({ scenePath, componentId, x, y }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const project = await fileIO.readProject();

      const component = (project.guiComponents ?? []).find((c) => c.id === componentId);
      if (!component) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Component not found: ${componentId}` }) }],
          isError: true,
        };
      }

      if (!scene.gui) scene.gui = { nodes: [], componentInstances: [] };
      if (!scene.gui.componentInstances) scene.gui.componentInstances = [];

      const instance = createGuiComponentInstance(componentId, { x, y });
      scene.gui.componentInstances.push(instance);
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify({ instance, component: component.name }, null, 2) }],
      };
    },
  );

  server.tool(
    "update_component_instance",
    "Update a GUI component instance's properties (position, visibility, node overrides)",
    {
      scenePath: z.string().describe("Scene filename"),
      instanceId: z.string().describe("Instance ID to update"),
      props: z.record(z.unknown()).describe("Properties to update (x, y, visible, interactive, nodeOverrides)"),
    },
    async ({ scenePath, instanceId, props }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const instances = scene.gui?.componentInstances ?? [];
      const instance = instances.find((i) => i.id === instanceId);
      if (!instance) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Instance not found: ${instanceId}` }) }],
          isError: true,
        };
      }

      const { id, componentId, ...safeProps } = props;
      Object.assign(instance, safeProps);
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify(instance, null, 2) }],
      };
    },
  );

  server.tool(
    "remove_component_instance",
    "Remove a GUI component instance from a scene",
    {
      scenePath: z.string().describe("Scene filename"),
      instanceId: z.string().describe("Instance ID to remove"),
    },
    async ({ scenePath, instanceId }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const instances = scene.gui?.componentInstances ?? [];
      const index = instances.findIndex((i) => i.id === instanceId);
      if (index === -1) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Instance not found: ${instanceId}` }) }],
          isError: true,
        };
      }

      const removed = instances.splice(index, 1)[0];
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, removed: removed.id, componentId: removed.componentId }) }],
      };
    },
  );
}
