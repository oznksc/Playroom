import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { generateAssetRegistry, importAsset, initProject, readScene } from "../src/project.js";

describe("project files", () => {
  it("initializes project folders and validates starter scene", async () => {
    const root = await mkdtemp(join(tmpdir(), "gamekit-"));

    const result = await initProject(root, { name: "Fixture" });
    const scene = await readScene(root);

    expect(result.projectPath.endsWith("gamekit/project.json")).toBe(true);
    expect(scene.entities.some((entity) => entity.id === "player")).toBe(true);
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
