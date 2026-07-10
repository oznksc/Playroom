import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FileIO } from "../utils/file-io.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export function registerPersistenceTools(server: McpServer, fileIO: FileIO): void {
  // assetsDir is <project>/gamekit/assets → state lives in <project>/gamekit/
  const gamekitDir = fileIO.assetsDir.replace(/[/\\]assets$/, "");
  const statePath = join(gamekitDir, "state.json");
  const savesDir = join(gamekitDir, "saves");

  async function readState(): Promise<Record<string, unknown>> {
    try {
      const content = await readFile(statePath, "utf-8");
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  async function writeState(state: Record<string, unknown>): Promise<void> {
    await writeFile(statePath, JSON.stringify(state, null, 2));
  }

  server.tool(
    "set_persistent_var",
    "Set a persistent global state variable",
    {
      key: z.string().describe("State variable key"),
      value: z.unknown().describe("State variable value"),
    },
    async ({ key, value }) => {
      const state = await readState();
      state[key] = value;
      await writeState(state);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, key, value }) }],
      };
    }
  );

  server.tool(
    "get_persistent_var",
    "Get a persistent global state variable",
    {
      key: z.string().describe("State variable key"),
    },
    async ({ key }) => {
      const state = await readState();
      return {
        content: [{ type: "text", text: JSON.stringify({ key, value: state[key] ?? null }) }],
      };
    }
  );

  server.tool(
    "save_game",
    "Save the current persistent state to a slot",
    {
      slotName: z.string().describe("Name of the save slot"),
    },
    async ({ slotName }) => {
      const state = await readState();
      try {
        await mkdir(savesDir, { recursive: true });
        const slotPath = join(savesDir, `${slotName}.json`);
        await writeFile(slotPath, JSON.stringify(state, null, 2));
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, slotName }) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: (err as Error).message }) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "load_game",
    "Load the persistent state from a save slot",
    {
      slotName: z.string().describe("Name of the save slot"),
    },
    async ({ slotName }) => {
      const slotPath = join(savesDir, `${slotName}.json`);
      try {
        const content = await readFile(slotPath, "utf-8");
        const state = JSON.parse(content);
        await writeState(state);
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, slotName, state }) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Save slot "${slotName}" not found or invalid: ${(err as Error).message}` }) }],
          isError: true,
        };
      }
    }
  );
}
