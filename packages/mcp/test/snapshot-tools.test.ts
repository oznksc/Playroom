import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createEmptyScene, createProject, createEntity, projectToJson, sceneToJson } from "@gamekit/schema";
import { createMcpServer } from "../src/server.js";

let tmpDir: string;
let server: ReturnType<typeof createMcpServer>;

beforeEach(async () => {
  tmpDir = join(tmpdir(), `gamekit-mcp-snapshot-test-${randomUUID()}`);
  const gkDir = join(tmpDir, "gamekit");
  const scenesDir = join(gkDir, "scenes");
  const assetsDir = join(gkDir, "assets");

  await mkdir(scenesDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });

  const project = createProject("Snapshot Project");
  await writeFile(join(gkDir, "project.json"), projectToJson(project));

  const scene = createEmptyScene("Main");
  scene.entities.push(createEntity("Hero", { x: 10, y: 20 }));
  await writeFile(join(scenesDir, "main.scene.json"), sceneToJson(scene));

  server = createMcpServer(tmpDir);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("snapshot tools", () => {
  it("creates and restores a scene snapshot", async () => {
    const snapTool = (server as any)._registeredTools.snapshot_undo_point;
    const snapResult = await snapTool.handler({ scenePath: "main.scene.json" });
    const snap = JSON.parse(snapResult.content[0].text) as { snapshotId: string };
    expect(snap.snapshotId).toMatch(/^snap_/);

    // Mutate scene on disk
    const scenePath = join(tmpDir, "gamekit", "scenes", "main.scene.json");
    const scene = createEmptyScene("Main");
    scene.entities.push(createEntity("Villain", { x: 99, y: 99 }));
    await writeFile(scenePath, sceneToJson(scene));

    const restoreTool = (server as any)._registeredTools.restore_snapshot;
    const restoreResult = await restoreTool.handler({ snapshotId: snap.snapshotId });
    const restored = JSON.parse(restoreResult.content[0].text) as { success: boolean };
    expect(restored.success).toBe(true);

    const after = JSON.parse(await readFile(scenePath, "utf8"));
    expect(after.entities).toHaveLength(1);
    expect(after.entities[0].name).toBe("Hero");
  });

  it("diffs two snapshots", async () => {
    const snapTool = (server as any)._registeredTools.snapshot_undo_point;
    const a = JSON.parse((await snapTool.handler({ scenePath: "main.scene.json" })).content[0].text);

    const scenePath = join(tmpDir, "gamekit", "scenes", "main.scene.json");
    const scene = createEmptyScene("Main");
    scene.entities.push(createEntity("Hero", { x: 50, y: 20 }));
    await writeFile(scenePath, sceneToJson(scene));
    const b = JSON.parse((await snapTool.handler({ scenePath: "main.scene.json" })).content[0].text);

    const diffTool = (server as any)._registeredTools.diff_scene_versions;
    const diffResult = await diffTool.handler({ from: a.snapshotId, to: b.snapshotId });
    const diff = JSON.parse(diffResult.content[0].text);
    expect(Array.isArray(diff.patches)).toBe(true);
    expect(diff.patches.length).toBeGreaterThan(0);
  });

  it("explain_scene summarizes entities", async () => {
    const tool = (server as any)._registeredTools.explain_scene;
    const result = await tool.handler({ scenePath: "main.scene.json" });
    const body = JSON.parse(result.content[0].text);
    expect(body.entityCount).toBe(1);
    expect(body.componentCounts.Transform).toBe(1);
  });
});
