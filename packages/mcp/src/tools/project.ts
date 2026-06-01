import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FileIO } from "../utils/file-io.js";

export function registerProjectTools(server: McpServer, fileIO: FileIO): void {
  server.tool("get_project", "Read and return project.json", {}, async () => {
    const project = await fileIO.readProject();
    return {
      content: [{ type: "text", text: JSON.stringify(project, null, 2) }],
    };
  });

  server.tool(
    "update_project",
    "Update project.json fields",
    {
      name: z.string().optional().describe("New project name"),
      scenes: z.array(z.string()).optional().describe("New scenes list"),
      levels: z.array(z.unknown()).optional().describe("New levels list"),
    },
    async ({ name, scenes, levels }) => {
      const project = await fileIO.readProject();

      if (name !== undefined) {
        project.name = name;
      }
      if (scenes !== undefined) {
        project.scenes = scenes;
      }
      if (levels !== undefined) {
        project.levels = levels as typeof project.levels;
      }

      await fileIO.writeProject(project);
      return {
        content: [{ type: "text", text: JSON.stringify(project, null, 2) }],
      };
    },
  );
}
