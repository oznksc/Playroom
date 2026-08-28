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
  tmpDir = join(tmpdir(), `gamekit-mcp-compose-${randomUUID()}`);
  const gkDir = join(tmpDir, "gamekit");
  await mkdir(join(gkDir, "scenes"), { recursive: true });
  await mkdir(join(gkDir, "assets"), { recursive: true });
  await writeFile(join(gkDir, "project.json"), projectToJson(createProject("Compose")));
  await writeFile(join(gkDir, "scenes", "main.scene.json"), sceneToJson(createEmptyScene("Main")));
  server = createMcpServer(tmpDir);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("compose tools", () => {
  it("sets a sprite, fits a collider, and wires the camera", async () => {
    const spawned = await call("add_entity", { scenePath: "main.scene.json", name: "Hero" });
    const id = spawned.data.id;

    const sprite = await call("set_sprite", {
      scenePath: "main.scene.json",
      entityId: id,
      assetId: "hero",
      width: 64,
      height: 32,
    });
    expect(sprite.data.sprite.width).toBe(64);

    const fitted = await call("fit_collider_to_sprite", {
      scenePath: "main.scene.json",
      entityId: id,
      isStatic: false,
    });
    expect(fitted.data.fitted).toEqual({ width: 64, height: 32 });

    const cam = await call("wire_camera_follow", {
      scenePath: "main.scene.json",
      targetId: id,
      smoothing: 0.2,
    });
    expect(cam.data.camera.targetId).toBe(id);
    expect(cam.data.camera.smoothing).toBe(0.2);
  });

  it("spawns a grid of collectibles and copies them", async () => {
    const grid = await call("spawn_grid", {
      scenePath: "main.scene.json",
      role: "collectible",
      columns: 2,
      rows: 2,
      origin: { x: 40, y: 80 },
      gap: 8,
    });
    expect(grid.data.count).toBe(4);
    expect(grid.data.entities[0].tags).toContain("coin");

    const ids = grid.data.entities.map((e: { id: string }) => e.id);
    const copied = await call("copy_entities", {
      scenePath: "main.scene.json",
      entityIds: [ids[0]],
      offset: { x: 100, y: 0 },
    });
    expect(copied.data.copied).toHaveLength(1);
    expect(copied.data.copied[0].id).not.toBe(ids[0]);
  });

  it("adds a script handler and catalogs actions", async () => {
    const catalog = await call("list_script_catalog", {});
    expect(catalog.data.events).toContain("triggerEnter");
    expect(catalog.data.actions.some((a: { type: string }) => a.type === "destroyEntity")).toBe(
      true
    );

    const types = await call("list_component_types", {});
    expect(types.data.components.some((c: { type: string }) => c.type === "Sprite")).toBe(true);

    const entity = await call("spawn_role", { scenePath: "main.scene.json", role: "collectible" });
    const script = await call("add_script_handler", {
      scenePath: "main.scene.json",
      entityId: entity.data.entity.id,
      event: "triggerEnter",
      actions: [{ type: "destroyEntity" }],
    });
    expect(script.data.handlerCount).toBe(1);
  });

  it("sets viewport, clones a scene, and adds a level", async () => {
    const view = await call("set_viewport", {
      scenePath: "main.scene.json",
      width: 1280,
      height: 720,
      background: "#112233",
    });
    expect(view.data.viewport).toMatchObject({ width: 1280, height: 720, background: "#112233" });

    const clone = await call("clone_scene", { scenePath: "main.scene.json", name: "Level Two" });
    expect(clone.data.filename).toBe("level-two.scene.json");

    const levels = await call("list_levels", {});
    expect(levels.data.count).toBeGreaterThan(0);

    const added = await call("add_level", { name: "Bonus", sceneIds: ["level-two"] });
    expect(added.data.level.sceneIds).toEqual(["level-two"]);
  });

  it("replaces asset refs and flips scale", async () => {
    const entity = await call("spawn_role", {
      scenePath: "main.scene.json",
      role: "platform",
      assetId: "wood",
    });
    const swapped = await call("replace_asset_refs", {
      scenePath: "main.scene.json",
      fromAssetId: "wood",
      toAssetId: "stone",
    });
    expect(swapped.data.replacements).toBeGreaterThan(0);

    const flipped = await call("flip_entity", {
      scenePath: "main.scene.json",
      entityId: entity.data.entity.id,
      axis: "x",
    });
    expect(flipped.data.scale.x).toBe(-1);
  });
});
