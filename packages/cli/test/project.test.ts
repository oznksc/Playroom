import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { generateAssetRegistry, importAsset, initProject, readProject, readScene } from "../src/project.js";

describe("project files", () => {
  it("initializes project folders and validates starter scene", async () => {
    const root = await mkdtemp(join(tmpdir(), "gamekit-"));

    const result = await initProject(root, { name: "Fixture" });
    const scene = await readScene(root);
    const project = await readProject(root);
    const menu = await readScene(root, "menu.scene.json");
    const settings = await readScene(root, "settings.scene.json");

    expect(result.projectPath.endsWith("gamekit/project.json")).toBe(true);
    expect(scene.entities.some((entity) => entity.id === "player")).toBe(true);
    expect(project.activeScene).toBe("menu.scene.json");
    expect(project.scenes).toContain("menu.scene.json");
    expect(project.scenes).toContain("settings.scene.json");
    expect(project.guiComponents.length).toBeGreaterThanOrEqual(4);
    expect(menu.id).toBe("menu");
    expect(menu.gui.nodes.some((n) => n.id === "btn-play")).toBe(true);
    expect(settings.id).toBe("settings");
    expect(result.activeScenePath.endsWith("menu.scene.json")).toBe(true);
  });

  it("init is idempotent and does not overwrite menu shell", async () => {
    const root = await mkdtemp(join(tmpdir(), "gamekit-"));
    await initProject(root, { name: "Fixture" });
    const menuPath = join(root, "gamekit/scenes/menu.scene.json");
    const custom = await readFile(menuPath, "utf8");
    const mutated = custom.replace("Fixture", "CustomTitle");
    await writeFile(menuPath, mutated);
    await initProject(root, { name: "Other" });
    const after = await readFile(menuPath, "utf8");
    expect(after).toContain("CustomTitle");
  });

  it("imports assets and generates Expo-compatible registry", async () => {
    const root = await mkdtemp(join(tmpdir(), "gamekit-"));
    const source = join(root, "Player Icon.svg");
    await writeFile(source, "<svg xmlns=\"http://www.w3.org/2000/svg\" />");

    const asset = await importAsset(root, source);
    const registry = await generateAssetRegistry(root);
    const registryText = await readFile(join(root, registry), "utf8");

    expect(asset.id).toBe("player-icon");
    expect(registryText).toContain("\"player-icon\": require(\"../assets/player-icon.svg\")");
  });
});
