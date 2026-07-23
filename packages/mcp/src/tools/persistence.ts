import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FileIO } from "../utils/file-io.js";
import type { GameSavePayload, ScriptAction } from "@gamekit/schema";
import { findLevelForScene } from "@gamekit/schema";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

export function registerPersistenceTools(server: McpServer, fileIO: FileIO): void {
  const gamekitDir = join(fileIO.projectRoot, "gamekit");
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

  async function buildSavePayload(): Promise<GameSavePayload> {
    const project = await fileIO.readProject();
    const persistentState = await readState();
    const currentSceneId = project.activeScene ?? null;
    const currentLevel = findLevelForScene(project.levels ?? [], currentSceneId);
    return {
      version: 1,
      persistentState,
      levels: project.levels.map((l) => ({ id: l.id, unlocked: l.unlocked })),
      currentSceneId,
      currentLevelId: currentLevel?.id ?? null,
    };
  }

  async function restoreFromPayload(payload: GameSavePayload): Promise<void> {
    await writeState(payload.persistentState);
    const project = await fileIO.readProject();
    for (const level of project.levels) {
      const saved = payload.levels.find((l) => l.id === level.id);
      if (saved) level.unlocked = saved.unlocked;
    }
    if (payload.currentSceneId) project.activeScene = payload.currentSceneId;
    await fileIO.writeProject(project);
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
    "Save the current game state (persistent vars + levels + active scene) to a slot",
    {
      slotName: z.string().describe("Name of the save slot"),
    },
    async ({ slotName }) => {
      try {
        await mkdir(savesDir, { recursive: true });
        const payload = await buildSavePayload();
        const slotPath = join(savesDir, `${slotName}.json`);
        await writeFile(slotPath, JSON.stringify(payload, null, 2));
        return {
          content: [{ type: "text", text: JSON.stringify({
            success: true,
            slotName,
            levelsUnlocked: payload.levels.filter((l) => l.unlocked).length,
            currentScene: payload.currentSceneId,
          }) }],
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
    "Load the game state from a save slot (restores persistent vars + levels + active scene)",
    {
      slotName: z.string().describe("Name of the save slot"),
    },
    async ({ slotName }) => {
      const slotPath = join(savesDir, `${slotName}.json`);
      try {
        const content = await readFile(slotPath, "utf-8");
        const payload = JSON.parse(content) as GameSavePayload;
        await restoreFromPayload(payload);
        return {
          content: [{ type: "text", text: JSON.stringify({
            success: true,
            slotName,
            levelsUnlocked: payload.levels.filter((l) => l.unlocked).length,
            currentScene: payload.currentSceneId,
          }) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Save slot "${slotName}" not found or invalid: ${(err as Error).message}` }) }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "set_level_unlocked",
    "Set a level's unlocked flag in project.json",
    {
      levelId: z.string().describe("Level id"),
      unlocked: z.boolean().describe("Whether the level is unlocked"),
    },
    async ({ levelId, unlocked }) => {
      const project = await fileIO.readProject();
      const level = project.levels.find((l) => l.id === levelId);
      if (!level) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Level not found: ${levelId}` }) }],
          isError: true,
        };
      }
      level.unlocked = unlocked;
      await fileIO.writeProject(project);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, levelId, unlocked }) }],
      };
    },
  );

  server.tool(
    "complete_level",
    "Unlock the next level after the given level id (by order) in project.json",
    {
      levelId: z.string().describe("Completed level id"),
    },
    async ({ levelId }) => {
      const project = await fileIO.readProject();
      const sorted = [...project.levels].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex((l) => l.id === levelId);
      if (index === -1) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Level not found: ${levelId}` }) }],
          isError: true,
        };
      }
      const next = sorted[index + 1];
      if (!next) {
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, unlocked: null, message: "No next level" }) }],
        };
      }
      next.unlocked = true;
      await fileIO.writeProject(project);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, unlocked: next.id, name: next.name }) }],
      };
    },
  );

  server.tool(
    "set_level_on_complete",
    "Set or clear a level's onComplete action list (runs after scene win / completeLevel)",
    {
      levelId: z.string().describe("Level id"),
      actions: z
        .array(
          z
            .object({ type: z.string().min(1) })
            .passthrough(),
        )
        .describe("Script actions, e.g. [{ type: 'completeLevel' }, { type: 'unlockLevel', levelId: 'boss' }]"),
    },
    async ({ levelId, actions }) => {
      const project = await fileIO.readProject();
      const level = project.levels.find((l) => l.id === levelId);
      if (!level) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Level not found: ${levelId}` }) }],
          isError: true,
        };
      }
      if (actions.length === 0) {
        delete level.onComplete;
      } else {
        level.onComplete = actions as ScriptAction[];
      }
      await fileIO.writeProject(project);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            levelId,
            onComplete: level.onComplete ?? [],
          }),
        }],
      };
    },
  );

  server.tool(
    "set_level_rules",
    "Set partial game rules on a level (merged under scene.gameRules when that level is active)",
    {
      levelId: z.string().describe("Level id"),
      rules: z
        .record(z.unknown())
        .describe("Partial GameRulesConfig fields, e.g. { lives: 5, winMessage: 'Stage clear!' }"),
      clear: z.boolean().optional().describe("If true, remove level.rules entirely"),
    },
    async ({ levelId, rules, clear }) => {
      const project = await fileIO.readProject();
      const level = project.levels.find((l) => l.id === levelId);
      if (!level) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Level not found: ${levelId}` }) }],
          isError: true,
        };
      }
      if (clear) {
        delete level.rules;
      } else {
        level.rules = { ...(level.rules ?? {}), ...rules } as typeof level.rules;
      }
      await fileIO.writeProject(project);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ success: true, levelId, rules: level.rules ?? null }),
        }],
      };
    },
  );
}
