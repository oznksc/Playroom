import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createId, type GuiNode } from "@gamekit/schema";
import { GuiNodeInputSchema, GuiNodeTypeSchema } from "../schemas/gui.js";
import type { FileIO } from "../utils/file-io.js";

export function registerGuiTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "list_gui_nodes",
    "List all GUI overlay nodes in a scene",
    {
      scenePath: z.string().describe("Scene filename"),
    },
    async ({ scenePath }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const nodes = scene.gui?.nodes ?? [];
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            sceneId: scene.id,
            sceneName: scene.name,
            nodeCount: nodes.length,
            nodes
          }, null, 2)
        }],
      };
    },
  );

  server.tool(
    "add_gui_node",
    "Add a GUI overlay node (Text, Button, or Image) to a scene",
    {
      scenePath: z.string().describe("Scene filename"),
      node: GuiNodeInputSchema.describe("GUI node to add"),
    },
    async ({ scenePath, node }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      if (!scene.gui) {
        scene.gui = { nodes: [] };
      }

      const newNode: GuiNode = {
        ...node,
        id: createId(node.type),
      } as GuiNode;

      scene.gui.nodes.push(newNode);
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify(newNode, null, 2) }],
      };
    },
  );

  server.tool(
    "update_gui_node",
    "Update properties of a GUI overlay node in a scene",
    {
      scenePath: z.string().describe("Scene filename"),
      nodeId: z.string().describe("GUI node ID to update"),
      props: z.record(z.unknown()).describe("Properties to update"),
    },
    async ({ scenePath, nodeId, props }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const nodes = scene.gui?.nodes ?? [];
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `GUI node not found: ${nodeId}` }) }],
          isError: true,
        };
      }

      // Prevent changing type or id
      const { type, id, ...safeProps } = props;
      Object.assign(node, safeProps);

      await fileIO.writeScene(filename, scene);
      return {
        content: [{ type: "text", text: JSON.stringify(node, null, 2) }],
      };
    },
  );

  server.tool(
    "remove_gui_node",
    "Remove a GUI overlay node from a scene",
    {
      scenePath: z.string().describe("Scene filename"),
      nodeId: z.string().describe("GUI node ID to remove"),
    },
    async ({ scenePath, nodeId }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const nodes = scene.gui?.nodes ?? [];
      const index = nodes.findIndex((n) => n.id === nodeId);
      if (index === -1) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `GUI node not found: ${nodeId}` }) }],
          isError: true,
        };
      }

      const removed = nodes.splice(index, 1)[0];
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, removed: removed.id, type: removed.type }) }],
      };
    },
  );
}
