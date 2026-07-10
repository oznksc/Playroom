export type PromptContext = {
  projectPath: string;
  sceneId: string;
  approvalMode: string;
  sceneSummary: string;
  selection?: { entityIds: string[] };
  skills: Array<{ name: string; description: string }>;
  viewport: { width: number; height: number };
  orientation: string;
  gravity: { x: number; y: number };
  schemaVersion: number;
};

const COMPONENT_CHEATSHEET = `
- Transform: position (x,y), rotation (degrees), scale (x,y) — required on all entities
- Sprite: assetId, width, height, anchor (x,y 0-1)
- AabbCollider: offset, size (x,y), isStatic, isTrigger
- CircleCollider: offset, radius, isStatic, isTrigger
- PlayerController: speed, jumpVelocity, gravity
- CameraFollow: targetId (entity ID), smoothing (0-1)
- Animation: assetId, frameWidth, frameHeight, totalFrames, framesPerSecond, loop
- RigidBody: velocity, angularVelocity, mass, drag, isKinematic, gravityScale, useGravity
- Text: text, fontAssetId, size, color, align
- AudioSource: assetId, volume, loop, playOnStart
- Tilemap: tilesetId, tileWidth/Height, columns, grid, tiles[]
Safety tools: snapshot_undo_point, restore_snapshot, diff_scene_versions, validate_scene, explain_scene
Simulation: simulate_runtime_step — headless N-frame physics to verify player/platform setups
`.trim();

export function buildSystemPrompt(ctx: PromptContext): string {
  const sections: string[] = [];

  sections.push(`You are GameKit Agent, an AI assistant inside the GameKit 2D game engine editor. You build scenes, entities, and game logic by calling the provided tools.

GameKit is a JSON-driven 2D engine targeting React Native (Skia) and Web (Phaser). The project file is at: <project>${ctx.projectPath}</project>. Active scene: <scene>${ctx.sceneId}</scene>.`);

  sections.push(`## Available Components
${COMPONENT_CHEATSHEET}

Constraint: an entity can have at most one of each component type. Positions are in world pixels.`);

  sections.push(`## Approval
Mode: ${ctx.approvalMode}
${ctx.approvalMode === "destructive-only" ? "Mutating tools (add_*, write_*, import_*) run automatically. Destructive tools (remove_*, delete_*, apply_skill, restore_snapshot) require user confirmation — call them as normal, the system handles the prompt." : ""}
${ctx.approvalMode === "always" ? "Every tool call requires user confirmation. The system handles the prompt automatically." : ""}
${ctx.approvalMode === "plan" ? "Plan mode: propose steps first when asked. Every tool call requires user confirmation." : ""}
${ctx.approvalMode === "off" ? "No approval required. Run all tools directly." : ""}`);

  sections.push(`## Current Scene
${ctx.sceneSummary}

${ctx.selection ? `Selection: ${ctx.selection.entityIds.length} entities (${ctx.selection.entityIds.slice(0, 5).join(", ")}...)` : "No selection."}`);

  if (ctx.skills.length > 0) {
    sections.push(`## Available Skills
${ctx.skills.map((s) => `- ${s.name}: ${s.description}`).join("\n")}

To apply a skill, call the apply_skill tool with its name.`);
  }

  sections.push(`## Workspace
Viewport: ${ctx.viewport.width}×${ctx.viewport.height} (${ctx.orientation})
Gravity: (${ctx.gravity.x}, ${ctx.gravity.y})`);

  sections.push(`## Rules
- Use the tools provided. Do not invent component types.
- Validate the scene with validate_scene after structural changes.
- Prefer minimal, targeted edits over broad rewrites.
- If a tool returns an error, read the message and adapt.
- Never call remove_* on the last entity of a scene without explicit user consent.
- Reply in the user's language.`);

  return sections.join("\n\n");
}
