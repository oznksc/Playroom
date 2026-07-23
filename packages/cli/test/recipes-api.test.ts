import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createEmptyScene, createEntity, createProject, projectToJson, sceneToJson } from "@gamekit/schema";
import { applyRecipe, listRecipes, describeRecipe } from "../src/project.js";

let root: string;
let entityId: string;

beforeEach(async () => {
  root = join(tmpdir(), `playroom-cli-recipes-${randomUUID()}`);
  const gk = join(root, "gamekit");
  await mkdir(join(gk, "scenes"), { recursive: true });
  await mkdir(join(gk, "assets"), { recursive: true });
  await writeFile(join(gk, "project.json"), projectToJson(createProject("Recipes")));

  const scene = createEmptyScene("Main");
  const coin = createEntity("Coin", { x: 200, y: 150 });
  entityId = coin.id;
  scene.entities.push(coin);
  await writeFile(join(gk, "scenes", "main.scene.json"), sceneToJson(scene));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("CLI recipes", () => {
  it("lists recipe catalog", async () => {
    const recipes = await listRecipes();
    expect(recipes.length).toBeGreaterThanOrEqual(20);
    expect(recipes.some((r) => r.category === "mechanic")).toBe(true);
  });

  it("describes a recipe", async () => {
    const recipe = await describeRecipe("spin");
    expect(recipe.id).toBe("spin");
    expect(recipe.category).toBe("animation");
  });

  it("applies a recipe to an entity and persists the scene", async () => {
    const result = await applyRecipe(root, "spin", {
      scenePath: "main.scene.json",
      entityId,
      params: { duration: 3 },
    });
    expect(result.appliedComponents).toContain("Tween");

    const scene = JSON.parse(
      await readFile(join(root, "gamekit", "scenes", "main.scene.json"), "utf8"),
    );
    const entity = scene.entities.find((e: { id: string }) => e.id === entityId);
    const tween = entity.components.find((c: { type: string }) => c.type === "Tween");
    expect(tween).toBeDefined();
    expect(tween.duration).toBe(3);
  });

  it("applies scene gesture recipes without entity", async () => {
    const result = await applyRecipe(root, "topdown-wasd", {
      scenePath: "main.scene.json",
    });
    expect(result.appliedInputActions).toContain("move_up");

    const scene = JSON.parse(
      await readFile(join(root, "gamekit", "scenes", "main.scene.json"), "utf8"),
    );
    expect(scene.inputMap.bindings.some((b: { action: string }) => b.action === "move_up")).toBe(
      true,
    );
  });
});
