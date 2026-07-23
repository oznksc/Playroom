import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  createId,
  resolveGameRules,
  type GameRuleHazard,
  type GameRuleObjective,
  type GameRulesConfig,
} from "@gamekit/schema";
import type { FileIO } from "../utils/file-io.js";

function ensureRules(scene: { gameRules?: GameRulesConfig | null }): GameRulesConfig {
  scene.gameRules = resolveGameRules(scene.gameRules);
  return scene.gameRules;
}

export function registerGameRulesTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "set_game_rules",
    "Merge partial game rules onto a scene (lives, fall, objectives, hazards, onWin/onLose). Arrays replace when provided.",
    {
      scenePath: z.string().describe("Scene filename, e.g. main.scene.json"),
      rules: z
        .record(z.unknown())
        .describe("Partial GameRulesConfig fields to merge (scalars overwrite; pass full arrays to replace lists)"),
    },
    async ({ scenePath, rules }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const current = ensureRules(scene);
      const next = resolveGameRules({ ...current, ...rules } as GameRulesConfig);
      scene.gameRules = next;
      await fileIO.writeScene(filename, scene);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            scenePath: filename,
            objectives: next.objectives.length,
            hazards: next.hazards.length,
            onWin: next.onWin,
            onLose: next.onLose,
          }),
        }],
      };
    },
  );

  server.tool(
    "add_objective",
    "Append a win objective to scene.gameRules.objectives",
    {
      scenePath: z.string(),
      type: z
        .enum(["collect", "reach", "survive", "variable", "manual"])
        .describe("Objective type"),
      id: z.string().optional().describe("Objective id (auto-generated if omitted)"),
      tag: z.string().optional().describe("For collect/reach"),
      entityId: z.string().optional().describe("For reach by entity id"),
      count: z.number().optional().describe("For collect (0 = all tagged)"),
      seconds: z.number().optional().describe("For survive"),
      key: z.string().optional().describe("For variable"),
      op: z.enum(["eq", "gte", "lte", "truthy"]).optional(),
      value: z.unknown().optional(),
    },
    async (args) => {
      const filename = fileIO.resolveScenePath(args.scenePath);
      const scene = await fileIO.readScene(filename);
      const gr = ensureRules(scene);
      const id = args.id?.trim() || createId("obj");
      const objective = {
        id,
        type: args.type,
        ...(args.tag !== undefined ? { tag: args.tag } : {}),
        ...(args.entityId !== undefined ? { entityId: args.entityId } : {}),
        ...(args.count !== undefined ? { count: args.count } : {}),
        ...(args.seconds !== undefined ? { seconds: args.seconds } : {}),
        ...(args.key !== undefined ? { key: args.key } : {}),
        ...(args.op !== undefined ? { op: args.op } : {}),
        ...(args.value !== undefined ? { value: args.value } : {}),
      } as GameRuleObjective;
      if (args.type === "collect" && objective.tag == null) objective.tag = "coin";
      if (args.type === "reach" && objective.tag == null && objective.entityId == null) {
        objective.tag = "goal";
      }
      gr.objectives = [...gr.objectives, objective];
      scene.gameRules = gr;
      await fileIO.writeScene(filename, scene);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ success: true, objective, total: gr.objectives.length }),
        }],
      };
    },
  );

  server.tool(
    "add_hazard",
    "Append a hazard to scene.gameRules.hazards (fall or tagContact)",
    {
      scenePath: z.string(),
      type: z.enum(["fall", "tagContact"]).describe("Hazard type"),
      id: z.string().optional(),
      tag: z.string().optional().describe("For tagContact (default hazard)"),
      onTrigger: z
        .enum(["respawn", "gameOver", "actions"])
        .optional()
        .describe("Default gameOver for fall, respawn for tagContact"),
      cooldown: z.number().optional().describe("tagContact cooldown seconds"),
      fallY: z.number().optional(),
      fallMargin: z.number().optional(),
      enabled: z.boolean().optional(),
    },
    async (args) => {
      const filename = fileIO.resolveScenePath(args.scenePath);
      const scene = await fileIO.readScene(filename);
      const gr = ensureRules(scene);
      const id = args.id?.trim() || createId(args.type);
      const hazard = {
        id,
        type: args.type,
        enabled: args.enabled !== false,
      } as GameRuleHazard;
      if (args.type === "fall") {
        hazard.onTrigger = args.onTrigger ?? gr.onFall ?? "gameOver";
        if (args.fallY !== undefined) hazard.fallY = args.fallY;
        if (args.fallMargin !== undefined) hazard.fallMargin = args.fallMargin;
        gr.fallDeathEnabled = true;
        if (args.onTrigger === "respawn" || args.onTrigger === "gameOver") {
          gr.onFall = args.onTrigger;
        }
      } else {
        hazard.tag = args.tag ?? "hazard";
        hazard.onTrigger = args.onTrigger ?? "respawn";
        hazard.cooldown = args.cooldown ?? 0.45;
      }
      // Replace existing same-id or same-type fall hazard
      gr.hazards = gr.hazards.filter(
        (h) => h.id !== id && !(args.type === "fall" && h.type === "fall"),
      );
      gr.hazards.push(hazard);
      scene.gameRules = gr;
      await fileIO.writeScene(filename, scene);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ success: true, hazard, total: gr.hazards.length }),
        }],
      };
    },
  );

  server.tool(
    "set_entity_tags",
    "Set or merge gameplay tags on an entity (coin, goal, hazard, checkpoint)",
    {
      scenePath: z.string(),
      entityId: z.string(),
      tags: z.array(z.string().min(1)).describe("Tags to set (replaces unless merge=true)"),
      merge: z.boolean().optional().describe("If true, append unique tags (default false = replace)"),
    },
    async ({ scenePath, entityId, tags, merge }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }
      if (merge) {
        const set = new Set([...(entity.tags ?? []), ...tags]);
        entity.tags = [...set];
      } else {
        entity.tags = tags.length > 0 ? tags : undefined;
      }
      await fileIO.writeScene(filename, scene);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ success: true, entityId, tags: entity.tags ?? [] }),
        }],
      };
    },
  );
}
