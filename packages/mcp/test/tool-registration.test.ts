import { describe, expect, it } from "vitest";
import { createMcpServer } from "../src/server.js";

describe("MCP tool registration", () => {
  it("keeps every registered tool backed by a callable handler", () => {
    const server = createMcpServer(process.cwd());
    const tools = (
      server as unknown as {
        _registeredTools: Record<string, { handler?: unknown }>;
      }
    )._registeredTools;
    const names = Object.keys(tools);

    expect(names.length).toBeGreaterThanOrEqual(40);
    for (const name of names) {
      expect(typeof tools[name]?.handler, name).toBe("function");
    }

    expect(names).toEqual(
      expect.arrayContaining([
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
        "list_entities",
        "list_components",
        "get_entity",
        "query_entities",
        "inspect_layout",
        "set_transform",
        "place_relative",
        "layout_entities",
        "duplicate_entity",
        "reorder_entity",
        "spawn_role",
        "list_component_types",
        "list_script_catalog",
        "set_sprite",
        "fit_collider_to_sprite",
        "wire_camera_follow",
        "spawn_grid",
        "copy_entities",
        "add_script_handler",
        "paint_tiles",
        "set_viewport",
        "clone_scene",
        "list_levels",
        "add_level",
        "update_level",
        "list_editor_capabilities",
        "upsert_component",
        "get_timeline",
        "upsert_timeline_track",
        "get_scene_settings",
        "set_responsive",
        "set_safe_area",
        "get_game_rules",
        "apply_input_preset",
        "remove_input_action",
        "remove_level",
        "import_image",
        "set_player_controller",
        "set_animation",
      ])
    );
  });
});
