import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  createEmptyScene,
  createEntity,
  createProject,
  projectToJson,
  sceneToJson,
} from "@gamekit/schema";
import { createMcpServer } from "../src/server.js";
import {
  listRecipes,
  loadRecipe,
  applyRecipeToScene,
  substituteParams,
  pruneScriptActions,
} from "../src/recipes/index.js";

let root: string;
let server: ReturnType<typeof createMcpServer>;

beforeEach(async () => {
  root = join(tmpdir(), `gamekit-mcp-recipes-${randomUUID()}`);
  await mkdir(join(root, "gamekit", "scenes"), { recursive: true });
  await mkdir(join(root, "gamekit", "assets"), { recursive: true });
  await writeFile(join(root, "gamekit", "project.json"), projectToJson(createProject("Recipes Test")));

  const scene = createEmptyScene("Main");
  const coin = createEntity("Coin", { x: 200, y: 150 });
  scene.entities.push(coin);
  await writeFile(join(root, "gamekit", "scenes", "main.scene.json"), sceneToJson(scene));

  server = createMcpServer(root);
});

afterEach(async () => rm(root, { recursive: true, force: true }));

function tool(name: string) {
  return (server as any)._registeredTools[name];
}

describe("recipe loader", () => {
  it("lists seeded recipes across categories", async () => {
    const all = await listRecipes();
    expect(all.length).toBeGreaterThanOrEqual(20);
    expect(all.some((r) => r.id === "sparkle")).toBe(true);
    expect(all.some((r) => r.id === "collect-on-touch")).toBe(true);
    expect(all.some((r) => r.id === "platformer-wasd-jump")).toBe(true);
  });

  it("filters by category and tags", async () => {
    const effects = await listRecipes({ category: "effect" });
    expect(effects.every((r) => r.category === "effect")).toBe(true);
    expect(effects.length).toBeGreaterThanOrEqual(5);

    const pickups = await listRecipes({ tags: ["pickup"] });
    expect(pickups.some((r) => r.id === "collect-on-touch" || r.id === "sparkle")).toBe(true);
  });

  it("loads a full recipe definition", async () => {
    const recipe = await loadRecipe("bob-idle");
    expect(recipe).not.toBeNull();
    expect(recipe!.components[0]!.type).toBe("Tween");
    expect(recipe!.params.duration).toBeDefined();
  });
});

describe("recipe apply engine", () => {
  it("substitutes params including typed numbers", () => {
    const result = substituteParams(
      { type: "Tween", startValue: "{{startY}}", duration: "{{duration}}", label: "y={{startY}}" },
      { startY: 150, duration: 1.2 },
    ) as Record<string, unknown>;
    expect(result.startValue).toBe(150);
    expect(result.duration).toBe(1.2);
    expect(result.label).toBe("y=150");
  });

  it("prunes unresolved optional playSound actions", () => {
    const pruned = pruneScriptActions({
      type: "Script",
      handlers: [
        {
          event: "onTriggerEnter",
          actions: [
            { type: "setVariable", key: "score", value: 1 },
            { type: "playSound", assetId: "{{soundAssetId}}" },
            { type: "destroyEntity" },
          ],
        },
      ],
    }) as {
      handlers: Array<{ actions: Array<{ type: string }> }>;
    };
    expect(pruned.handlers[0]!.actions.map((a) => a.type)).toEqual([
      "setVariable",
      "destroyEntity",
    ]);
  });

  it("applies collect-on-touch to an entity", async () => {
    const recipe = await loadRecipe("collect-on-touch");
    expect(recipe).not.toBeNull();

    const scene = createEmptyScene("Main");
    const coin = createEntity("Coin", { x: 200, y: 150 });
    scene.entities.push(coin);

    const result = applyRecipeToScene(scene, recipe!, {
      entityId: coin.id,
      params: { scoreValue: 10 },
    });

    expect(result.appliedComponents).toContain("AabbCollider");
    expect(result.appliedComponents).toContain("Script");
    const script = coin.components.find((c) => c.type === "Script");
    expect(script).toBeDefined();
    if (script?.type === "Script") {
      const actions = script.handlers[0]!.actions;
      expect(actions.some((a) => a.type === "setVariable" && a.value === 10)).toBe(true);
      expect(actions.some((a) => a.type === "destroyEntity")).toBe(true);
      // optional sound pruned when not provided
      expect(actions.some((a) => a.type === "playSound")).toBe(false);
    }
  });

  it("applies scene-level input gesture recipes", async () => {
    const recipe = await loadRecipe("platformer-wasd-jump");
    expect(recipe).not.toBeNull();

    const scene = createEmptyScene("Main");
    const result = applyRecipeToScene(scene, recipe!);
    expect(result.appliedInputActions).toEqual(
      expect.arrayContaining(["move_left", "move_right", "jump"]),
    );
    expect(scene.inputMap?.bindings.length).toBeGreaterThanOrEqual(3);
  });

  it("defaults camera follow targetId to the entity", async () => {
    const recipe = await loadRecipe("camera-follow-player");
    const scene = createEmptyScene("Main");
    const player = createEntity("Player", { x: 100, y: 200 });
    scene.entities.push(player);

    applyRecipeToScene(scene, recipe!, { entityId: player.id });
    const cam = player.components.find((c) => c.type === "CameraFollow");
    expect(cam).toBeDefined();
    if (cam?.type === "CameraFollow") {
      expect(cam.targetId).toBe(player.id);
    }
  });
});

describe("recipe MCP tools", () => {
  it("list_recipes returns catalog entries", async () => {
    const result = await tool("list_recipes").handler({});
    const payload = JSON.parse(result.content[0].text);
    expect(payload.count).toBeGreaterThanOrEqual(20);
    expect(payload.recipes.some((r: { id: string }) => r.id === "sparkle")).toBe(true);
  });

  it("describe_recipe returns full recipe", async () => {
    const result = await tool("describe_recipe").handler({ recipeId: "sparkle" });
    const payload = JSON.parse(result.content[0].text);
    expect(payload.id).toBe("sparkle");
    expect(payload.components[0].type).toBe("ParticleSystem");
  });

  it("apply_recipe writes components to the scene", async () => {
    const sceneBefore = JSON.parse(
      await (await import("node:fs/promises")).readFile(
        join(root, "gamekit", "scenes", "main.scene.json"),
        "utf8",
      ),
    );
    const entityId = sceneBefore.entities[0].id;

    const result = await tool("apply_recipe").handler({
      recipeId: "sparkle",
      scenePath: "main.scene.json",
      entityId,
    });
    const payload = JSON.parse(result.content[0].text);
    expect(payload.success).toBe(true);
    expect(payload.appliedComponents).toContain("ParticleSystem");

    const sceneAfter = JSON.parse(
      await (await import("node:fs/promises")).readFile(
        join(root, "gamekit", "scenes", "main.scene.json"),
        "utf8",
      ),
    );
    const entity = sceneAfter.entities.find((e: { id: string }) => e.id === entityId);
    expect(entity.components.some((c: { type: string }) => c.type === "ParticleSystem")).toBe(true);
  });

  it("rejects entity recipes without entityId", async () => {
    const result = await tool("apply_recipe").handler({
      recipeId: "spin",
      scenePath: "main.scene.json",
    });
    expect(result.isError).toBe(true);
  });

  it("rejects unknown recipes", async () => {
    const result = await tool("describe_recipe").handler({ recipeId: "nope" });
    expect(result.isError).toBe(true);
  });
});
