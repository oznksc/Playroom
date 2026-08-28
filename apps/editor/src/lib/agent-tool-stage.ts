import type { AgentToolCallStatus } from "./agent-schemas.js";

export type ToolStageKind =
  | "read"
  | "write"
  | "destructive"
  | "search"
  | "layout"
  | "physics"
  | "simulate"
  | "validate"
  | "asset"
  | "recipe"
  | "skill"
  | "scene"
  | "entity"
  | "gui"
  | "prefab"
  | "snapshot"
  | "input"
  | "rules"
  | "generic";

export type ToolStageMotion = "none" | "spin" | "pulse" | "bounce" | "sweep";

export type ToolStageDef = {
  kind: ToolStageKind;
  label: string;
  /** Animation used only while status === "running" (or waiting for approval). */
  runningMotion: ToolStageMotion;
};

const KIND_LABEL: Record<ToolStageKind, string> = {
  read: "Read",
  write: "Edit",
  destructive: "Remove",
  search: "Search",
  layout: "Layout",
  physics: "Physics",
  simulate: "Simulate",
  validate: "Validate",
  asset: "Asset",
  recipe: "Recipe",
  skill: "Skill",
  scene: "Scene",
  entity: "Entity",
  gui: "GUI",
  prefab: "Prefab",
  snapshot: "Snapshot",
  input: "Input",
  rules: "Rules",
  generic: "Tool",
};

const KIND_MOTION: Record<ToolStageKind, ToolStageMotion> = {
  read: "pulse",
  write: "spin",
  destructive: "spin",
  search: "bounce",
  layout: "sweep",
  physics: "spin",
  simulate: "bounce",
  validate: "pulse",
  asset: "pulse",
  recipe: "spin",
  skill: "spin",
  scene: "pulse",
  entity: "bounce",
  gui: "pulse",
  prefab: "pulse",
  snapshot: "pulse",
  input: "bounce",
  rules: "pulse",
  generic: "spin",
};

const EXACT_KIND: Record<string, ToolStageKind> = {
  list_entities: "read",
  list_components: "read",
  get_entity: "read",
  get_scene: "read",
  get_project: "read",
  get_active_scene: "read",
  list_scenes: "read",
  explain_scene: "read",
  query_entities: "search",
  search_project: "search",
  find_unused_assets: "search",
  inspect_layout: "layout",
  set_transform: "layout",
  place_relative: "layout",
  layout_entities: "layout",
  reorder_entity: "layout",
  spawn_role: "entity",
  duplicate_entity: "entity",
  add_entity: "entity",
  update_entity: "entity",
  add_component: "write",
  update_component: "write",
  remove_entity: "destructive",
  remove_component: "destructive",
  delete_scene: "destructive",
  remove_asset: "destructive",
  remove_prefab: "destructive",
  list_assets: "asset",
  add_asset: "asset",
  regenerate_manifest: "asset",
  list_recipes: "recipe",
  describe_recipe: "recipe",
  apply_recipe: "recipe",
  list_skills: "skill",
  apply_skill: "skill",
  list_prefabs: "prefab",
  create_prefab: "prefab",
  instantiate_prefab: "prefab",
  simulate_runtime_step: "simulate",
  validate_scene: "validate",
  validate_project: "validate",
  run_doctor: "validate",
  suggest_components: "read",
  raycast: "physics",
  query_overlaps: "physics",
  add_collider: "physics",
  set_collision_layer: "physics",
  set_trigger: "physics",
  snapshot_undo_point: "snapshot",
  restore_snapshot: "snapshot",
  diff_scene_versions: "snapshot",
  load_scene: "scene",
  create_scene: "scene",
  define_scene_transition: "scene",
  set_game_rules: "rules",
  add_objective: "rules",
  add_hazard: "rules",
  set_entity_tags: "rules",
  batch_apply_edit: "write",
  set_sprite: "asset",
  fit_collider_to_sprite: "physics",
  wire_camera_follow: "entity",
  set_text: "write",
  add_script_handler: "write",
  spawn_grid: "entity",
  copy_entities: "entity",
  move_entities: "layout",
  flip_entity: "layout",
  replace_asset_refs: "asset",
  copy_component: "write",
  list_component_types: "read",
  list_script_catalog: "read",
  paint_tiles: "write",
  paint_tile: "write",
  add_tilemap: "write",
  set_viewport: "scene",
  clone_scene: "scene",
  set_gravity: "physics",
  list_levels: "read",
  add_level: "rules",
  update_level: "rules",
  remove_level: "destructive",
  list_editor_capabilities: "read",
  upsert_component: "write",
  set_player_controller: "entity",
  set_rigid_body: "physics",
  set_animation: "write",
  set_follow_path: "write",
  add_fsm_state: "write",
  add_audio_listener: "write",
  remove_script_handler: "destructive",
  get_timeline: "read",
  set_timeline: "write",
  upsert_timeline_track: "write",
  remove_timeline_track: "destructive",
  get_scene_settings: "read",
  set_responsive: "scene",
  set_safe_area: "scene",
  get_game_rules: "read",
  set_spawn_point: "rules",
  set_outcome_actions: "rules",
  remove_objective: "rules",
  remove_hazard: "rules",
  remove_input_action: "input",
  apply_input_preset: "input",
  import_image: "asset",
  set_tilemap_solid: "write",
  get_audit_log: "read",
  query_audit_log: "read",
};

function inferKind(tool: string): ToolStageKind {
  const exact = EXACT_KIND[tool];
  if (exact) return exact;
  if (tool.startsWith("remove_") || tool.startsWith("delete_")) return "destructive";
  if (tool.includes("gui")) return "gui";
  if (tool.includes("prefab")) return "prefab";
  if (tool.includes("recipe")) return "recipe";
  if (tool.includes("skill")) return "skill";
  if (tool.includes("snapshot")) return "snapshot";
  if (tool.includes("asset")) return "asset";
  if (tool.includes("input") || tool.includes("gesture")) return "input";
  if (tool.includes("rule") || tool.includes("hazard") || tool.includes("objective"))
    return "rules";
  if (
    tool.includes("collider") ||
    tool.includes("rigid") ||
    tool.includes("gravity") ||
    tool.includes("physics") ||
    tool.includes("impulse")
  ) {
    return "physics";
  }
  if (tool.includes("simulate")) return "simulate";
  if (tool.includes("validate") || tool.includes("doctor")) return "validate";
  if (
    tool.includes("layout") ||
    tool.includes("transform") ||
    tool.includes("place") ||
    tool.includes("align")
  ) {
    return "layout";
  }
  if (tool.includes("scene")) return "scene";
  if (tool.startsWith("list_") || tool.startsWith("get_") || tool.startsWith("explain_"))
    return "read";
  if (tool.startsWith("search_") || tool.startsWith("find_") || tool.startsWith("query_"))
    return "search";
  if (tool.includes("entity") || tool.includes("component")) return "entity";
  return "generic";
}

export function resolveToolStage(tool: string): ToolStageDef {
  const kind = inferKind(tool);
  return {
    kind,
    label: KIND_LABEL[kind],
    runningMotion: KIND_MOTION[kind],
  };
}

export function motionForStatus(stage: ToolStageDef, status: AgentToolCallStatus): ToolStageMotion {
  if (status === "running") return stage.runningMotion;
  if (status === "needs-approval") return "pulse";
  return "none";
}

export function statusLabel(status: AgentToolCallStatus): string {
  switch (status) {
    case "running":
      return "Working";
    case "ok":
      return "Done";
    case "error":
      return "Failed";
    case "needs-approval":
      return "Waiting";
    case "cancelled":
      return "Stopped";
  }
}
