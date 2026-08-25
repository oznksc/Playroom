import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FileIO } from "../utils/file-io.js";
import { DEFAULT_INPUT_MAP, type InputActionBinding } from "@gamekit/schema";

const INPUT_PRESETS: Record<string, InputActionBinding[]> = {
  platformer: DEFAULT_INPUT_MAP.bindings,
  topdown: [
    { action: "move_left", keys: ["ArrowLeft", "a", "A"], touchControl: "left", gamepad: "LEFT_STICK_X_NEG" },
    { action: "move_right", keys: ["ArrowRight", "d", "D"], touchControl: "right", gamepad: "LEFT_STICK_X_POS" },
    { action: "move_up", keys: ["ArrowUp", "w", "W"], gamepad: "LEFT_STICK_Y_NEG" },
    { action: "move_down", keys: ["ArrowDown", "s", "S"], gamepad: "LEFT_STICK_Y_POS" },
    { action: "fire", keys: ["j", "J"], touchControl: "fire", gamepad: "B" },
    { action: "action", keys: ["k", "K"], touchControl: "action", gamepad: "X" },
  ],
  shooter: [
    ...DEFAULT_INPUT_MAP.bindings,
  ],
};

export function registerInputTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "define_input_action",
    "Add or update an input action binding on the active scene",
    {
      scenePath: z.string().describe("Scene filename (e.g., 'main.scene.json')"),
      action: z.string().min(1).describe("Action name (e.g., 'move_left', 'jump', 'fire')"),
      keys: z.array(z.string()).optional().describe("Keyboard keys (e.g., ['Space', 'w', 'W'])"),
      touchControl: z
        .enum(["left", "right", "jump", "fire", "action"])
        .optional()
        .describe("Virtual touch control: left/right for stick, jump/fire/action for on-screen buttons"),
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

  server.tool(
    "remove_input_action",
    "Remove an input action binding from the scene (Input Map editor).",
    {
      scenePath: z.string(),
      action: z.string().min(1),
    },
    async ({ scenePath, action }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const bindings = scene.inputMap?.bindings ?? [];
      const next = bindings.filter((b) => b.action !== action);
      if (next.length === bindings.length) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Action "${action}" not found.` }) }],
          isError: true,
        };
      }
      scene.inputMap = { bindings: next };
      await fileIO.writeScene(filename, scene);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, removed: action, remaining: next.map((b) => b.action) }, null, 2) }],
      };
    },
  );

  server.tool(
    "apply_input_preset",
    "Replace the scene input map with a built-in preset (platformer, topdown, shooter). Prefer apply_recipe for extra gesture packs.",
    {
      scenePath: z.string(),
      preset: z.enum(["platformer", "topdown", "shooter"]),
    },
    async ({ scenePath, preset }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      scene.inputMap = { bindings: structuredClone(INPUT_PRESETS[preset]) };
      await fileIO.writeScene(filename, scene);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, preset, actions: scene.inputMap.bindings.map((b) => b.action) }, null, 2),
          },
        ],
      };
    },
  );
}
