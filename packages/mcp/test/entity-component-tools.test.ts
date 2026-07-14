import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createEmptyScene, createProject, projectToJson, sceneToJson } from "@gamekit/schema";
import { createMcpServer } from "../src/server.js";

let tmpDir: string;
let server: ReturnType<typeof createMcpServer>;

function tool(name: string): { handler: (args: any) => Promise<any> } {
  const registered = (server as any)._registeredTools[name];
  if (!registered) throw new Error(`Tool not registered: ${name}`);
  return registered;
}

async function call(name: string, args: any): Promise<any> {
  const result = await tool(name).handler(args);
  return { result, data: JSON.parse(result.content[0].text) };
}

beforeEach(async () => {
  tmpDir = join(tmpdir(), `gamekit-mcp-entity-comp-${randomUUID()}`);
  const gkDir = join(tmpDir, "gamekit");
  await mkdir(join(gkDir, "scenes"), { recursive: true });
  await mkdir(join(gkDir, "assets"), { recursive: true });

  await writeFile(join(gkDir, "project.json"), projectToJson(createProject("Test Project")));
  await writeFile(join(gkDir, "scenes", "main.scene.json"), sceneToJson(createEmptyScene("Main")));

  server = createMcpServer(tmpDir);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("entity tool handlers", () => {
  it("adds an entity and persists it", async () => {
    const { data } = await call("add_entity", { scenePath: "main.scene.json", name: "Player" });
    expect(data.name).toBe("Player");
    expect(data.id).toBeTruthy();

    const { data: scene } = await call("get_scene", { path: "main.scene.json" });
    expect(scene.entities).toHaveLength(1);
    expect(scene.entities[0].name).toBe("Player");
  });

  it("adds an entity with initial components", async () => {
    const { data } = await call("add_entity", {
      scenePath: "main.scene.json",
      name: "Box",
      components: [
        { type: "Transform", position: { x: 10, y: 20 }, rotation: 0, scale: { x: 1, y: 1 } },
      ],
    });
    expect(data.components).toHaveLength(1);
    expect(data.components[0].type).toBe("Transform");
  });

  it("updates an entity name", async () => {
    const { data: entity } = await call("add_entity", { scenePath: "main.scene.json", name: "Old" });
    const { data } = await call("update_entity", {
      scenePath: "main.scene.json",
      entityId: entity.id,
      name: "New",
    });
    expect(data.name).toBe("New");
  });

  it("removes an entity", async () => {
    const { data: entity } = await call("add_entity", { scenePath: "main.scene.json", name: "Temp" });
    const { data } = await call("remove_entity", {
      scenePath: "main.scene.json",
      entityId: entity.id,
    });
    expect(data.success).toBe(true);

    const { data: scene } = await call("get_scene", { path: "main.scene.json" });
    expect(scene.entities).toHaveLength(0);
  });

  it("returns an error when updating a missing entity", async () => {
    const { result, data } = await call("update_entity", {
      scenePath: "main.scene.json",
      entityId: "does-not-exist",
      name: "X",
    });
    expect(result.isError).toBe(true);
    expect(data.error).toContain("Entity not found");
  });

  it("returns an error when removing a missing entity", async () => {
    const { result, data } = await call("remove_entity", {
      scenePath: "main.scene.json",
      entityId: "nope",
    });
    expect(result.isError).toBe(true);
    expect(data.error).toContain("Entity not found");
  });
});

describe("component tool handlers", () => {
  it("adds a component to an entity", async () => {
    const { data: entity } = await call("add_entity", { scenePath: "main.scene.json", name: "Ball" });
    const { data } = await call("add_component", {
      scenePath: "main.scene.json",
      entityId: entity.id,
      component: { type: "CircleCollider", offset: { x: 0, y: 0 }, radius: 16, isStatic: false, isTrigger: false },
    });
    const cc = data.components.find((c: any) => c.type === "CircleCollider");
    expect(cc.radius).toBe(16);
  });

  it("rejects a duplicate component type", async () => {
    const { data: entity } = await call("add_entity", { scenePath: "main.scene.json", name: "Ball" });
    const comp = { type: "CircleCollider", offset: { x: 0, y: 0 }, radius: 8, isStatic: false, isTrigger: false };
    await call("add_component", { scenePath: "main.scene.json", entityId: entity.id, component: comp });
    const { result, data } = await call("add_component", {
      scenePath: "main.scene.json",
      entityId: entity.id,
      component: comp,
    });
    expect(result.isError).toBe(true);
    expect(data.error).toContain("already exists");
  });

  it("updates component properties", async () => {
    const { data: entity } = await call("add_entity", { scenePath: "main.scene.json", name: "Ball" });
    await call("add_component", {
      scenePath: "main.scene.json",
      entityId: entity.id,
      component: { type: "CircleCollider", offset: { x: 0, y: 0 }, radius: 8, isStatic: false, isTrigger: false },
    });
    const { data } = await call("update_component", {
      scenePath: "main.scene.json",
      entityId: entity.id,
      componentType: "CircleCollider",
      props: { radius: 32 },
    });
    const cc = data.components.find((c: any) => c.type === "CircleCollider");
    expect(cc.radius).toBe(32);
  });

  it("removes a component", async () => {
    const { data: entity } = await call("add_entity", { scenePath: "main.scene.json", name: "Ball" });
    await call("add_component", {
      scenePath: "main.scene.json",
      entityId: entity.id,
      component: { type: "CircleCollider", offset: { x: 0, y: 0 }, radius: 8, isStatic: false, isTrigger: false },
    });
    const { data } = await call("remove_component", {
      scenePath: "main.scene.json",
      entityId: entity.id,
      componentType: "CircleCollider",
    });
    expect(data.success).toBe(true);

    const { data: scene } = await call("get_scene", { path: "main.scene.json" });
    expect(scene.entities[0].components.some((c: any) => c.type === "CircleCollider")).toBe(false);
  });

  it("returns an error when updating a missing component", async () => {
    const { data: entity } = await call("add_entity", { scenePath: "main.scene.json", name: "Ball" });
    const { result, data } = await call("update_component", {
      scenePath: "main.scene.json",
      entityId: entity.id,
      componentType: "RigidBody",
      props: { mass: 5 },
    });
    expect(result.isError).toBe(true);
    expect(data.error).toContain("Component not found");
  });
});
