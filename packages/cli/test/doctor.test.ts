import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  createEmptyScene,
  createMenuScene,
  createPrefab,
  createProject,
  createSettingsScene,
  createStarterGameplayScene,
  projectToJson,
  sceneToJson,
  prefabToJson,
} from "@gamekit/schema";
import { runDoctor } from "../src/doctor.js";

let root: string;

beforeEach(async () => {
  root = join(tmpdir(), `playroom-doctor-${randomUUID()}`);
  const gk = join(root, "gamekit");
  await mkdir(join(gk, "scenes"), { recursive: true });
  await mkdir(join(gk, "assets"), { recursive: true });
  const project = createProject("Doctor");
  await writeFile(join(gk, "project.json"), projectToJson(project));
  await writeFile(join(gk, "scenes", "menu.scene.json"), sceneToJson(createMenuScene("Doctor")));
  await writeFile(join(gk, "scenes", "settings.scene.json"), sceneToJson(createSettingsScene()));
  await writeFile(join(gk, "scenes", "main.scene.json"), sceneToJson(createStarterGameplayScene()));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("runDoctor", () => {
  it("passes a minimal valid project", async () => {
    const report = await runDoctor(root);
    expect(report.ok).toBe(true);
    expect(report.summary.errors).toBe(0);
    expect(report.summary.scenes).toBe(3);
  });

  it("flags missing asset files", async () => {
    const project = createProject("Doctor");
    project.assets.push({ id: "missing-sprite", file: "nope.png", kind: "image" });
    await writeFile(join(root, "gamekit", "project.json"), projectToJson(project));

    const report = await runDoctor(root);
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "ASSET_FILE_MISSING")).toBe(true);
  });

  it("flags NO_PROJECT when project.json is missing", async () => {
    await rm(join(root, "gamekit", "project.json"));
    const report = await runDoctor(root);
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "NO_PROJECT")).toBe(true);
  });

  it("flags PROJECT_PARSE on malformed JSON", async () => {
    await writeFile(join(root, "gamekit", "project.json"), "{ broken");
    const report = await runDoctor(root);
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "PROJECT_PARSE")).toBe(true);
  });

  it("flags PROJECT_INVALID on bad schemaVersion", async () => {
    await writeFile(join(root, "gamekit", "project.json"), JSON.stringify({ schemaVersion: 99, name: "X", scenes: [], assets: [], levels: [] }));
    const report = await runDoctor(root);
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "PROJECT_INVALID")).toBe(true);
  });

  it("flags NO_SCENES_DIR when scenes directory is missing", async () => {
    await rm(join(root, "gamekit", "scenes"), { recursive: true });
    const report = await runDoctor(root);
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "NO_SCENES_DIR")).toBe(true);
  });

  it("flags SCENE_MISSING when listed scene file does not exist", async () => {
    const project = createProject("Doctor");
    project.scenes.push("ghost.scene.json");
    await writeFile(join(root, "gamekit", "project.json"), projectToJson(project));

    const report = await runDoctor(root);
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "SCENE_MISSING")).toBe(true);
  });

  it("flags SCENE_ORPHAN for unlisted scene files", async () => {
    await writeFile(join(root, "gamekit", "scenes", "extra.scene.json"), sceneToJson(createEmptyScene("Extra")));
    const report = await runDoctor(root);
    expect(report.issues.some((i) => i.code === "SCENE_ORPHAN")).toBe(true);
  });

  it("flags SCENE_INVALID for malformed scene JSON", async () => {
    await writeFile(join(root, "gamekit", "scenes", "bad.scene.json"), "{ broken");
    const report = await runDoctor(root);
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "SCENE_PARSE" || i.code === "SCENE_INVALID")).toBe(true);
  });

  it("flags ASSET_UNREGISTERED for scene references to unknown assets", async () => {
    const scene = createEmptyScene("Main");
    scene.entities.push({
      id: "e1", name: "E",
      components: [{ type: "Sprite", assetId: "unknown-asset", width: 16, height: 16, anchor: { x: 0.5, y: 0.5 } }],
    });
    await writeFile(join(root, "gamekit", "scenes", "main.scene.json"), sceneToJson(scene));

    const report = await runDoctor(root);
    expect(report.issues.some((i) => i.code === "ASSET_UNREGISTERED")).toBe(true);
  });

  it("flags ASSET_UNUSED for assets not referenced by any scene", async () => {
    const project = createProject("Doctor");
    project.assets.push({ id: "unused", file: "unused.png", kind: "image" });
    await writeFile(join(root, "gamekit", "project.json"), projectToJson(project));

    const report = await runDoctor(root);
    expect(report.issues.some((i) => i.code === "ASSET_UNUSED")).toBe(true);
  });

  it("flags ASSET_DUPLICATE for duplicate asset IDs", async () => {
    const project = createProject("Doctor");
    project.assets.push({ id: "dup", file: "a.png", kind: "image" });
    project.assets.push({ id: "dup", file: "b.png", kind: "image" });
    await writeFile(join(root, "gamekit", "project.json"), projectToJson(project));

    const report = await runDoctor(root);
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "ASSET_DUPLICATE")).toBe(true);
  });

  it("flags ASSET_ORPHAN_ON_DISK for files not in project.assets", async () => {
    await writeFile(join(root, "gamekit", "assets", "orphan.png"), "fake");
    const report = await runDoctor(root);
    expect(report.issues.some((i) => i.code === "ASSET_ORPHAN_ON_DISK")).toBe(true);
  });

  it("flags LEVEL_SCENE_MISSING for levels referencing nonexistent scenes", async () => {
    const project = createProject("Doctor");
    project.levels = [{ id: "l1", name: "Level 1", order: 1, sceneIds: ["nope.scene.json"], unlocked: true }];
    await writeFile(join(root, "gamekit", "project.json"), projectToJson(project));

    const report = await runDoctor(root);
    expect(report.issues.some((i) => i.code === "LEVEL_SCENE_MISSING")).toBe(true);
  });

  it("flags ACTIVE_SCENE_MISSING for nonexistent activeScene", async () => {
    const project = createProject("Doctor");
    project.activeScene = "ghost.scene.json";
    await writeFile(join(root, "gamekit", "project.json"), projectToJson(project));

    const report = await runDoctor(root);
    expect(report.issues.some((i) => i.code === "ACTIVE_SCENE_MISSING")).toBe(true);
  });

  it("flags TRANSITION_TARGET_MISSING for bad transition targets", async () => {
    const project = createProject("Doctor");
    project.transitions = [{ id: "t1", name: "To Boss", toSceneId: "boss.scene.json", type: "fade", duration: 0.5 }];
    await writeFile(join(root, "gamekit", "project.json"), projectToJson(project));

    const report = await runDoctor(root);
    expect(report.issues.some((i) => i.code === "TRANSITION_TARGET_MISSING")).toBe(true);
  });

  it("valid transition target produces no issue", async () => {
    const project = createProject("Doctor");
    project.scenes = ["main.scene.json", "boss.scene.json"];
    project.levels = [{ id: "l1", name: "Level 1", order: 1, sceneIds: ["main.scene.json"], unlocked: true }];
    project.transitions = [{ id: "t1", name: "To Boss", toSceneId: "boss.scene.json", type: "fade", duration: 0.5 }];
    await writeFile(join(root, "gamekit", "project.json"), projectToJson(project));
    await writeFile(join(root, "gamekit", "scenes", "boss.scene.json"), sceneToJson(createEmptyScene("Boss")));

    const report = await runDoctor(root);
    expect(report.issues.some((i) => i.code === "TRANSITION_TARGET_MISSING")).toBe(false);
  });

  it("flags PREFAB_INVALID for malformed prefab JSON", async () => {
    await mkdir(join(root, "gamekit", "prefabs"), { recursive: true });
    await writeFile(join(root, "gamekit", "prefabs", "bad.prefab.json"), "{ broken");
    const report = await runDoctor(root);
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "PREFAB_PARSE" || i.code === "PREFAB_INVALID")).toBe(true);
  });

  it("valid prefab produces no issue", async () => {
    await mkdir(join(root, "gamekit", "prefabs"), { recursive: true });
    const prefab = createPrefab("Coin", [{ type: "Transform", position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } }]);
    await writeFile(join(root, "gamekit", "prefabs", "coin.prefab.json"), prefabToJson(prefab));

    const report = await runDoctor(root);
    expect(report.issues.some((i) => i.code === "PREFAB_INVALID" || i.code === "PREFAB_PARSE")).toBe(false);
  });

  it("reports prefabs count in summary", async () => {
    await mkdir(join(root, "gamekit", "prefabs"), { recursive: true });
    const prefab = createPrefab("Coin", []);
    await writeFile(join(root, "gamekit", "prefabs", "coin.prefab.json"), prefabToJson(prefab));

    const report = await runDoctor(root);
    expect(report.summary.prefabs).toBe(1);
  });
});
