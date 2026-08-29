import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FileIO } from "../utils/file-io.js";
import { join } from "node:path";
import { readdir, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

export function registerSaveTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "list_saves",
    "List all saved game slots and states in the project",
    {},
    async () => {
      const savesDir = join(fileIO.projectRoot, "gamekit", "saves");
      if (!existsSync(savesDir)) {
        return {
          content: [{ type: "text", text: JSON.stringify({ slots: [] }, null, 2) }],
        };
      }

      try {
        const files = await readdir(savesDir);
        const slots = files
          .filter((f) => f.endsWith(".json"))
          .map((f) => f.replace(/\.json$/, ""));

        return {
          content: [{ type: "text", text: JSON.stringify({ slots }, null, 2) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: String(err) }) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get_save",
    "Retrieve the game save state for a slot",
    {
      slot: z.string().default("default").describe("Save slot identifier"),
    },
    async ({ slot }) => {
      const filePath = join(fileIO.projectRoot, "gamekit", "saves", `${slot}.json`);
      if (!existsSync(filePath)) {
        return {
          content: [
            { type: "text", text: JSON.stringify({ error: `Save slot not found: ${slot}` }) },
          ],
          isError: true,
        };
      }

      try {
        const content = await readFile(filePath, "utf-8");
        const parsed = JSON.parse(content);
        const data = parsed.data ?? parsed;
        const timestamp = parsed.timestamp;
        return {
          content: [{ type: "text", text: JSON.stringify({ slot, timestamp, data }, null, 2) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: String(err) }) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "set_save",
    "Save game state data to a slot",
    {
      slot: z.string().default("default").describe("Save slot identifier"),
      data: z.record(z.unknown()).describe("Game state key-value data to persist"),
    },
    async ({ slot, data }) => {
      const savesDir = join(fileIO.projectRoot, "gamekit", "saves");
      if (!existsSync(savesDir)) {
        await mkdir(savesDir, { recursive: true });
      }

      const filePath = join(savesDir, `${slot}.json`);
      const payload = {
        slot,
        timestamp: Date.now(),
        data,
      };

      await writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, slot, savedAt: payload.timestamp }, null, 2) }],
      };
    }
  );

  server.tool(
    "delete_save",
    "Delete a saved game slot",
    {
      slot: z.string().describe("Save slot identifier to delete"),
    },
    async ({ slot }) => {
      const filePath = join(fileIO.projectRoot, "gamekit", "saves", `${slot}.json`);
      if (!existsSync(filePath)) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Save slot not found: ${slot}` }) }],
          isError: true,
        };
      }

      await rm(filePath, { force: true });
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, deletedSlot: slot }, null, 2) }],
      };
    }
  );
}
