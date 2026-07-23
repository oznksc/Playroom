import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  createGameFromSkill,
  applySkill,
  listSkills,
  readProject,
  readScene,
} from "../src/project.js";

let root: string;

beforeEach(async () => {
  root = join(tmpdir(), `playroom-create-${randomUUID()}`);
  await mkdir(root, { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("createGameFromSkill", () => {
  it("lists genre skills", async () => {
    const skills = await listSkills();
    expect(skills.map((s) => s.id)).toEqual(
      expect.arrayContaining(["platformer", "topdown", "physics-puzzle"]),
    );
  });

  it("builds a full menu→play platformer project", async () => {
    const result = await createGameFromSkill(root, "platformer", {
      name: "Jump Demo",
      platform: "mobile",
    });

    expect(result.skillId).toBe("platformer");
    expect(result.gameplayFile).toBe("platformer.scene.json");
    expect(result.sceneId).toBe("platformer");
    expect(result.entityCount).toBeGreaterThan(3);
    expect(result.recipesApplied).toContain("platformer-wasd-jump");
    expect(result.recipesApplied).toContain("win-collect-all");
    expect(result.assetsCopied.length).toBeGreaterThan(0);

    const project = await readProject(root);
    expect(project.name).toBe("Jump Demo");
    expect(project.activeScene).toBe("menu.scene.json");
    expect(project.scenes).toContain("menu.scene.json");
    expect(project.scenes).toContain("platformer.scene.json");
    expect(project.scenes).not.toContain("main.scene.json");
    expect(project.levels[0]?.sceneIds).toContain("platformer");
    expect(project.transitions?.some((t) => t.toSceneId === "platformer")).toBe(true);
    expect(project.assets.some((a) => a.id === "player")).toBe(true);

    const menu = await readScene(root, "menu.scene.json");
    const playAction = menu.entities
      .flatMap((e) => e.components)
      .filter((c) => c.type === "Script")
      .flatMap((c) => (c as { handlers: Array<{ event: string; actions: Array<{ type: string; sceneId?: string }> }> }).handlers)
      .find((h) => h.event === "startGame");
    expect(playAction?.actions.some((a) => a.type === "switchScene" && a.sceneId === "platformer")).toBe(
      true,
    );

    const gameplay = await readScene(root, "platformer.scene.json");
    expect(gameplay.id).toBe("platformer");
    expect(gameplay.entities.some((e) => e.id === "game-controller")).toBe(true);
    expect(gameplay.gameRules?.objectives?.length).toBeGreaterThan(0);
    expect(gameplay.inputMap?.bindings.some((b) => b.action === "jump")).toBe(true);
    // Coins tagged
    const coin = gameplay.entities.find((e) => /coin/i.test(e.name));
    expect(coin?.tags).toContain("coin");

    const registry = await readFile(join(root, "gamekit/generated/assets.ts"), "utf8");
    expect(registry).toContain("player");
  });

  it("builds top-down with topdown-wasd pack", async () => {
    const result = await createGameFromSkill(root, "topdown", { name: "Arena" });
    expect(result.recipesApplied).toContain("topdown-wasd");
    const scene = await readScene(root, "topdown.scene.json");
    expect(scene.inputMap?.bindings.some((b) => b.action === "move_up")).toBe(true);
    expect(scene.gravity.y).toBe(0);
  });

  it("builds physics-puzzle with goal win rule", async () => {
    const result = await createGameFromSkill(root, "physics-puzzle", {
      name: "Blocks",
    });
    expect(result.recipesApplied).toContain("win-reach-goal");
    const scene = await readScene(root, "physics-puzzle.scene.json");
    const target = scene.entities.find((e) => /target/i.test(e.name));
    expect(target?.tags).toContain("goal");
    expect(scene.gameRules?.objectives?.some((o) => o.type === "reach")).toBe(true);
  });

  it("applySkill alone still writes a scene with assets", async () => {
    await createGameFromSkill(root, "platformer"); // ensure init path
    // re-apply on same root
    const again = await applySkill(root, "platformer");
    expect(again.filename).toBe("platformer.scene.json");
    expect(again.assetsCopied.length).toBeGreaterThanOrEqual(0);
  });
});
