import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createEmptyScene, createEntity, createProject, projectToJson, sceneToJson } from "@gamekit/schema";
import { createMcpServer } from "../src/server.js";

let root: string;
let server: ReturnType<typeof createMcpServer>;
let entityId: string;

beforeEach(async () => {
  root = join(tmpdir(), `gamekit-mcp-behavior-${randomUUID()}`);
  await mkdir(join(root, "gamekit", "scenes"), { recursive: true });
  await mkdir(join(root, "gamekit", "assets"), { recursive: true });
  await writeFile(join(root, "gamekit", "project.json"), projectToJson(createProject("Behavior Test")));
  const scene = createEmptyScene("Main");
  const entity = createEntity("Robot", { x: 10, y: 20 });
  entityId = entity.id;
  scene.entities.push(entity);
  await writeFile(join(root, "gamekit", "scenes", "main.scene.json"), sceneToJson(scene));
  server = createMcpServer(root);
});

afterEach(async () => rm(root, { recursive: true, force: true }));

describe("behavior tool handlers", () => {
  it("adds tween, path, state machine, and script components", async () => {
    const call = async (name: string, input: Record<string, unknown>) => {
      const tool = (server as any)._registeredTools[name];
      const result = await tool.handler({ scenePath: "main.scene.json", entityId, ...input });
      expect(result.isError, name).not.toBe(true);
    };

    await call("add_tween", { tween: { property: "position.x", startValue: 0, endValue: 10, duration: 1, easing: "linear", loop: false, pingPong: false } });
    await call("add_path", { followPath: { points: [{ x: 0, y: 0 }, { x: 20, y: 20 }], speed: 10, loop: true } });
    await call("add_state_machine", { stateMachine: { initialState: "idle", states: [{ name: "idle", on: {} }] } });
    await call("add_script", { script: { handlers: [{ event: "start", actions: [] }] } });
  });
});
