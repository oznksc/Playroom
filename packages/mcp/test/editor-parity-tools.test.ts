import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createEmptyScene, createProject, projectToJson, sceneToJson } from "@gamekit/schema";
import { createMcpServer } from "../src/server.js";

let tmpDir: string;
let server: ReturnType<typeof createMcpServer>;

function tool(name: string): {
  handler: (args: unknown) => Promise<{ content: Array<{ text: string }>; isError?: boolean }>;
} {
  const registered = (
    server as unknown as { _registeredTools: Record<string, { handler?: unknown }> }
  )._registeredTools[name];
  if (!registered?.handler) throw new Error(`Tool not registered: ${name}`);
  return registered as {
    handler: (args: unknown) => Promise<{ content: Array<{ text: string }>; isError?: boolean }>;
  };
}

async function call(name: string, args: unknown): Promise<{ isError?: boolean; data: any }> {
  const result = await tool(name).handler(args);
  return { isError: result.isError, data: JSON.parse(result.content[0].text) };
}

beforeEach(async () => {
  tmpDir = join(tmpdir(), `gamekit-mcp-parity-${randomUUID()}`);
  const gkDir = join(tmpDir, "gamekit");
  await mkdir(join(gkDir, "scenes"), { recursive: true });
  await mkdir(join(gkDir, "assets"), { recursive: true });
  await writeFile(join(gkDir, "project.json"), projectToJson(createProject("Parity")));
  await writeFile(join(gkDir, "scenes", "main.scene.json"), sceneToJson(createEmptyScene("Main")));
  server = createMcpServer(tmpDir);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("editor parity tools", () => {
  it("maps editor panels and upserts inspector components", async () => {
    const caps = await call("list_editor_capabilities", {});
    expect(caps.data.panels.Inspector).toContain("upsert_component");
    expect(caps.data.panels.Timeline).toContain("upsert_timeline_track");

    const entity = await call("add_entity", { scenePath: "main.scene.json", name: "Hero" });
    const id = entity.data.id;
    const sprite = await call("upsert_component", {
      scenePath: "main.scene.json",
      entityId: id,
      component: { type: "Sprite", assetId: "hero", width: 40, height: 40 },
    });
    expect(sprite.data.component.assetId).toBe("hero");

    const player = await call("set_player_controller", {
      scenePath: "main.scene.json",
      entityId: id,
      speed: 250,
      gravity: 0,
    });
    expect(player.data.component.speed).toBe(250);
    expect(player.data.component.gravity).toBe(0);
  });

  it("authors timeline, world settings, input, and rules", async () => {
    const entity = await call("spawn_role", { scenePath: "main.scene.json", role: "platform" });
    const id = entity.data.entity.id;

    const track = await call("upsert_timeline_track", {
      scenePath: "main.scene.json",
      entityId: id,
      property: "position.x",
      keyframes: [
        { time: 0, value: 0 },
        { time: 1, value: 120, easing: "easeInOut" },
      ],
    });
    expect(track.data.track.keyframes).toHaveLength(2);
    expect(track.data.duration).toBe(1);

    const world = await call("get_scene_settings", { scenePath: "main.scene.json" });
    expect(world.data.viewport).toBeTruthy();

    await call("set_responsive", {
      scenePath: "main.scene.json",
      mode: "scale",
      orientation: "landscape",
    });
    await call("set_safe_area", {
      scenePath: "main.scene.json",
      enabled: true,
      padding: { top: 20 },
    });

    const preset = await call("apply_input_preset", {
      scenePath: "main.scene.json",
      preset: "topdown",
    });
    expect(preset.data.actions).toContain("move_up");

    const rules = await call("get_game_rules", { scenePath: "main.scene.json" });
    expect(rules.data.rules.lives).toBeGreaterThan(0);
    await call("set_spawn_point", { scenePath: "main.scene.json", x: 80, y: 200 });
    await call("set_outcome_actions", {
      scenePath: "main.scene.json",
      which: "onWin",
      actions: [{ type: "completeLevel" }],
    });

    const anim = await call("set_animation", {
      scenePath: "main.scene.json",
      entityId: id,
      assetId: "plat-sheet",
      totalFrames: 4,
    });
    expect(anim.data.component.totalFrames).toBe(4);
  });

  it("removes a level", async () => {
    const added = await call("add_level", { name: "Temp", sceneIds: ["main"] });
    const removed = await call("remove_level", { levelId: added.data.level.id });
    expect(removed.data.removed).toBe(added.data.level.id);
  });
});
