import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createProject, projectToJson } from "@gamekit/schema";
import { applySkill, listSkills } from "../src/project.js";

let root: string;

beforeEach(async () => {
  root = join(tmpdir(), `playroom-cli-skills-${randomUUID()}`);
  const gk = join(root, "gamekit");
  await mkdir(join(gk, "scenes"), { recursive: true });
  await mkdir(join(gk, "assets"), { recursive: true });
  await writeFile(join(gk, "project.json"), projectToJson(createProject("Skills")));
  // empty main so apply can add another scene
  await writeFile(
    join(gk, "scenes", "main.scene.json"),
    JSON.stringify({
      schemaVersion: 1,
      id: "main",
      name: "Main",
      viewport: { width: 390, height: 844, background: "#000" },
      gravity: { x: 0, y: 1800 },
      assets: [],
      entities: [],
      responsive: {
        mode: "scale",
        referenceWidth: 390,
        referenceHeight: 844,
        orientation: "portrait",
        safeArea: { enabled: true, padding: { top: 0, bottom: 0, left: 0, right: 0 } },
      },
      timeline: { tracks: [], duration: 0, loop: false, playing: false },
      gui: { nodes: [], componentInstances: [] },
    }),
  );
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("CLI skills", () => {
  it("lists skill templates", async () => {
    const skills = await listSkills();
    expect(skills.length).toBeGreaterThan(0);
    expect(skills.some((s) => s.id === "platformer")).toBe(true);
  });

  it("applies platformer skill with assets and stable scene id", async () => {
    const result = await applySkill(root, "platformer");
    expect(result.entityCount).toBeGreaterThan(0);
    expect(result.filename).toBe("platformer.scene.json");
    expect(result.sceneId).toBe("platformer");
    expect(result.assetsCopied.length).toBeGreaterThan(0);

    const scene = JSON.parse(
      await readFile(join(root, "gamekit", "scenes", result.filename), "utf8"),
    );
    expect(scene.id).toBe("platformer");
    expect(scene.entities.length).toBe(result.entityCount);
    expect(scene.entities.some((e: { id: string }) => e.id === "game-controller")).toBe(true);

    const project = JSON.parse(await readFile(join(root, "gamekit", "project.json"), "utf8"));
    expect(project.scenes).toContain(result.filename);
    expect(project.assets.some((a: { id: string }) => a.id === "player")).toBe(true);
  });
});
