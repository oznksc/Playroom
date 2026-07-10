import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { simulateSceneSteps } from "@gamekit/runtime/simulate";
import type { FileIO } from "../utils/file-io.js";

export function registerSimulateTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "simulate_runtime_step",
    "Headless-simulate a scene for N fixed physics steps and return entity positions/velocities (does not write to disk unless writeBack is true)",
    {
      scenePath: z.string().describe("Scene filename, e.g. main.scene.json"),
      steps: z.number().int().min(1).max(600).describe("Number of fixed timesteps (1/60s each)"),
      left: z.boolean().optional().describe("Hold move_left for all steps"),
      right: z.boolean().optional().describe("Hold move_right for all steps"),
      jump: z.boolean().optional().describe("Hold jump for all steps"),
      writeBack: z
        .boolean()
        .optional()
        .describe("If true, write the simulated scene back to disk (default false)"),
    },
    async ({ scenePath, steps, left, right, jump, writeBack }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const result = simulateSceneSteps(scene, {
        steps,
        input: { left: left ?? false, right: right ?? false, jump: jump ?? false },
      });

      if (writeBack) {
        await fileIO.writeScene(filename, result.scene);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                ok: true,
                scenePath: filename,
                steps: result.steps,
                writeBack: writeBack === true,
                entities: result.entitySummaries,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
