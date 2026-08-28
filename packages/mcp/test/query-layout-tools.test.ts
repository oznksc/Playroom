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
  tmpDir = join(tmpdir(), `gamekit-mcp-query-layout-${randomUUID()}`);
  const gkDir = join(tmpDir, "gamekit");
  await mkdir(join(gkDir, "scenes"), { recursive: true });
  await mkdir(join(gkDir, "assets"), { recursive: true });
  await writeFile(join(gkDir, "project.json"), projectToJson(createProject("Query Layout")));
  await writeFile(join(gkDir, "scenes", "main.scene.json"), sceneToJson(createEmptyScene("Main")));
  server = createMcpServer(tmpDir);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("query tools", () => {
  it("lists, gets, and filters spawned entities", async () => {
    const player = await call("spawn_role", {
      scenePath: "main.scene.json",
      role: "player",
      name: "Hero",
      position: { x: 80, y: 120 },
    });
    expect(player.data.success).toBe(true);
    expect(
      player.data.entity.components.find((c: { type: string }) => c.type === "CameraFollow")
        .targetId
    ).toBe(player.data.entity.id);

    await call("spawn_role", {
      scenePath: "main.scene.json",
      role: "collectible",
      name: "Coin",
      position: { x: 200, y: 120 },
    });

    const listed = await call("list_entities", { scenePath: "main.scene.json" });
    expect(listed.data.count).toBe(2);
    expect(listed.data.entities.map((e: { name: string }) => e.name)).toEqual(["Hero", "Coin"]);

    const components = await call("list_components", {
      scenePath: "main.scene.json",
      entityId: player.data.entity.id,
    });
    expect(components.data.components.map((c: { type: string }) => c.type)).toContain(
      "PlayerController"
    );

    const full = await call("get_entity", {
      scenePath: "main.scene.json",
      entityId: player.data.entity.id,
    });
    expect(full.data.id).toBe(player.data.entity.id);

    const tagged = await call("query_entities", { scenePath: "main.scene.json", tag: "coin" });
    expect(tagged.data.count).toBe(1);
    expect(tagged.data.entities[0].name).toBe("Coin");

    const byType = await call("query_entities", {
      scenePath: "main.scene.json",
      componentType: "PlayerController",
    });
    expect(byType.data.count).toBe(1);
    expect(byType.data.entities[0].name).toBe("Hero");
  });

  it("inspects layout for off-screen entities", async () => {
    await call("spawn_role", {
      scenePath: "main.scene.json",
      role: "platform",
      position: { x: 5000, y: 5000 },
    });
    const audit = await call("inspect_layout", { scenePath: "main.scene.json" });
    expect(audit.data.entityCount).toBe(1);
    expect(audit.data.entities[0].issues).toContain("off-screen");
  });

  it("returns an error for a missing entity", async () => {
    const result = await call("get_entity", { scenePath: "main.scene.json", entityId: "missing" });
    expect(result.isError).toBe(true);
    expect(result.data.error).toContain("list_entities");
  });
});

describe("layout tools", () => {
  it("duplicates, arranges in a row, and places relative", async () => {
    const block = await call("spawn_role", {
      scenePath: "main.scene.json",
      role: "platform",
      name: "Block",
      position: { x: 100, y: 200 },
    });
    const sourceId = block.data.entity.id;

    const dup = await call("duplicate_entity", {
      scenePath: "main.scene.json",
      entityId: sourceId,
      count: 2,
      offset: { x: 0, y: 0 },
    });
    expect(dup.data.created).toHaveLength(2);

    const ids = [sourceId, ...dup.data.created.map((e: { id: string }) => e.id)];
    const laid = await call("layout_entities", {
      scenePath: "main.scene.json",
      entityIds: ids,
      mode: "row",
      origin: { x: 10, y: 40 },
      gap: 8,
    });
    expect(laid.data.success).toBe(true);
    const first = laid.data.arranged[0];
    const second = laid.data.arranged[1];
    expect(second.bounds.minX).toBeGreaterThan(first.bounds.maxX);

    const relative = await call("place_relative", {
      scenePath: "main.scene.json",
      entityId: ids[1],
      targetId: ids[0],
      side: "right",
      gap: 16,
    });
    expect(relative.data.success).toBe(true);
    expect(relative.data.entity.bounds.minX).toBeCloseTo(relative.data.target.bounds.maxX + 16, 5);
  });

  it("nudges transform and reorders draw order", async () => {
    const a = await call("spawn_role", {
      scenePath: "main.scene.json",
      role: "obstacle",
      name: "A",
      position: { x: 10, y: 10 },
    });
    const b = await call("spawn_role", {
      scenePath: "main.scene.json",
      role: "obstacle",
      name: "B",
      position: { x: 20, y: 20 },
    });

    await call("set_transform", {
      scenePath: "main.scene.json",
      entityId: a.data.entity.id,
      position: { x: 5, y: 0 },
      relative: true,
    });
    const moved = await call("get_entity", {
      scenePath: "main.scene.json",
      entityId: a.data.entity.id,
    });
    expect(
      moved.data.components.find((c: { type: string }) => c.type === "Transform").position
    ).toEqual({ x: 15, y: 10 });

    const reordered = await call("reorder_entity", {
      scenePath: "main.scene.json",
      entityId: a.data.entity.id,
      to: "front",
    });
    expect(reordered.data.order[reordered.data.order.length - 1].id).toBe(a.data.entity.id);
    expect(reordered.data.order[0].id).toBe(b.data.entity.id);
  });
});
