import { describe, expect, it } from "vitest";
import { createMcpServer } from "../src/server.js";

describe("MCP tool registration", () => {
  it("keeps every registered tool backed by a callable handler", () => {
    const server = createMcpServer(process.cwd());
    const tools = (server as unknown as {
      _registeredTools: Record<string, { handler?: unknown }>;
    })._registeredTools;
    const names = Object.keys(tools);

    expect(names.length).toBeGreaterThanOrEqual(40);
    for (const name of names) {
      expect(typeof tools[name]?.handler, name).toBe("function");
    }

    expect(names).toEqual(expect.arrayContaining([
      "validate_project",
      "validate_scene",
      "add_collider",
      "add_text",
      "add_light",
      "add_nine_slice",
      "simulate_runtime_step",
      "suggest_components",
      "apply_skill",
      "list_recipes",
      "describe_recipe",
      "apply_recipe",
      "set_game_rules",
      "add_objective",
      "add_hazard",
      "set_entity_tags",
      "set_level_on_complete",
    ]));
  });
});
