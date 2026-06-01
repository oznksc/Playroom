import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FileIO } from "../utils/file-io.js";

export function registerGravityTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "set_gravity",
    "Set the gravity vector for the project",
    {
      x: z.number().describe("Gravity X component (usually 0)"),
      y: z.number().describe("Gravity Y component (positive = downward)"),
    },
    async ({ x, y }) => {
      const project = await fileIO.readProject();
      const sceneFile = project.scenes[0] ?? "main.scene.json";
      const filename = fileIO.resolveScenePath(sceneFile);
      const scene = await fileIO.readScene(filename);

      scene.gravity = { x, y };
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, gravity: { x, y } }) }],
      };
    },
  );
}
