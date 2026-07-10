import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createEmptyScene, createEntity, createProject, projectToJson, sceneToJson } from "@gamekit/schema";
import { createMcpServer } from "../src/server.js";

let tmpDir: string;
let server: ReturnType<typeof createMcpServer>;

beforeEach(async () => {
  tmpDir = join(tmpdir(), `gamekit-mcp-sim-test-${randomUUID()}`);
  const gkDir = join(tmpDir, "gamekit");
  await mkdir(join(gkDir, "scenes"), { recursive: true });
  await mkdir(join(gkDir, "assets"), { recursive: true });
  await writeFile(join(gkDir, "project.json"), projectToJson(createProject("Sim")));

  const scene = createEmptyScene("Main");
  const player = createEntity("Player", { x: 40, y: 40 });
  player.components.push({
    type: "AabbCollider",
    offset: { x: 0, y: 0 },
    size: { x: 32, y: 32 },
    isStatic: false,
  });
  player.components.push({
    type: "PlayerController",
    speed: 200,
    jumpVelocity: 400,
    gravity: 1800,
  });
  scene.entities.push(player);
  await writeFile(join(gkDir, "scenes", "main.scene.json"), sceneToJson(scene));

  server = createMcpServer(tmpDir);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("simulate_runtime_step", () => {
  it("returns entity summaries after N steps without writeBack", async () => {
    const tool = (server as any)._registeredTools.simulate_runtime_step;
    const result = await tool.handler({
      scenePath: "main.scene.json",
      steps: 20,
      right: true,
    });
    const body = JSON.parse(result.content[0].text);
    expect(body.ok).toBe(true);
    expect(body.steps).toBe(20);
    expect(body.writeBack).toBe(false);
    expect(body.entities.length).toBe(1);
    expect(body.entities[0].position.x).toBeGreaterThan(40);
  });
});

describe("persistence path", () => {
  it("writes state under gamekit/ not gamekit/gamekit/", async () => {
    const setTool = (server as any)._registeredTools.set_persistent_var;
    await setTool.handler({ key: "coins", value: 3 });
    const getTool = (server as any)._registeredTools.get_persistent_var;
    const result = await getTool.handler({ key: "coins" });
    const body = JSON.parse(result.content[0].text);
    expect(body.value).toBe(3);

    const { readFile } = await import("node:fs/promises");
    const state = JSON.parse(await readFile(join(tmpDir, "gamekit", "state.json"), "utf8"));
    expect(state.coins).toBe(3);
  });
});
