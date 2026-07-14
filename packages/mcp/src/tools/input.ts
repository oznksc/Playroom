import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FileIO } from "../utils/file-io.js";
import { InputActionBindingSchema } from "../schemas/input.js";
import { DEFAULT_INPUT_MAP } from "@gamekit/schema";

export function registerInputTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "define_input_action",
    "Add or update an input action binding on the active scene",
    {
      scenePath: z.string().describe("Scene filename (e.g., 'main.scene.json')"),
      action: z.string().min(1).describe("Action name (e.g., 'move_left', 'jump', 'fire')"),
      keys: z.array(z.string()).optional().describe("Keyboard keys (e.g., ['Space', 'w', 'W'])"),
      touchControl: z.enum(["left", "right", "jump"]).optional().describe("Virtual touch button"),
      gamepad: z.string().optional().describe("Gamepad binding (e.g., 'A', 'LEFT_STICK_X')"),
    },
    async ({ scenePath, action, keys, touchControl, gamepad }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const bindings = scene.inputMap?.bindings ?? [];
      const existing = bindings.findIndex((b) => b.action === action);

      const binding: Record<string, unknown> = {
        action,
        keys: keys ?? [],
        ...(touchControl ? { touchControl } : {}),
        ...(gamepad ? { gamepad } : {}),
      };

      if (existing >= 0) {
        bindings[existing] = { ...bindings[existing], ...binding } as any;
      } else {
        bindings.push(binding as any);
      }

      scene.inputMap = { bindings };
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, action, binding }, null, 2) }],
      };
    },
  );

  server.tool(
    "get_input_map",
    "Read the input action bindings from a scene",
    {
      scenePath: z.string().describe("Scene filename (e.g., 'main.scene.json')"),
    },
    async ({ scenePath }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      return {
        content: [{ type: "text", text: JSON.stringify({
          scenePath: filename,
          inputMap: scene.inputMap ?? DEFAULT_INPUT_MAP,
        }, null, 2) }],
      };
    },
  );
}
