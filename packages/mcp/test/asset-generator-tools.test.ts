import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createEmptyScene, createProject, projectToJson, sceneToJson } from "@gamekit/schema";
import { createMcpServer } from "../src/server.js";

let tmpDir: string;
let server: ReturnType<typeof createMcpServer>;

function tool(name: string): { handler: (args: any) => Promise<any> } {
  const registered = (server as any)._registeredTools[name];
  if (!registered) throw new Error(`Tool not registered: ${name}`);
  return registered;
}

async function call(name: string, args: any = {}): Promise<any> {
  const result = await tool(name).handler(args);
  return { result, data: JSON.parse(result.content[0].text) };
}

beforeEach(async () => {
  tmpDir = join(tmpdir(), `gamekit-mcp-asset-gen-${randomUUID()}`);
  const gkDir = join(tmpDir, "gamekit");
  await mkdir(join(gkDir, "scenes"), { recursive: true });
  await mkdir(join(gkDir, "assets"), { recursive: true });

  const project = createProject("Test Project");
  project.scenes = ["main.scene.json"];
  await writeFile(join(gkDir, "project.json"), projectToJson(project));
  await writeFile(join(gkDir, "scenes", "main.scene.json"), sceneToJson(createEmptyScene("Main")));

  server = createMcpServer(tmpDir);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("Asset Generator MCP Tools", () => {
  it("lists available generator presets", async () => {
    const { data } = await call("list_asset_generator_presets");
    expect(data.sfxPresets).toContain("jump");
    expect(data.sfxPresets).toContain("coin");
    expect(data.musicPresets).toContain("chiptune_adventure");
    expect(data.palettes).toContain("pico8");
    expect(data.characterArchetypes).toContain("hero");
  });

  it("generates a sprite and optionally spawns it into the active scene", async () => {
    const { data } = await call("generate_sprite", {
      id: "coin-gold",
      category: "item",
      archetype: "coin",
      palette: "pico8",
      size: 32,
      autoSpawn: true,
    });

    expect(data.success).toBe(true);
    expect(data.assetId).toBe("coin-gold");
    expect(data.file).toBe("coin-gold.png");
    expect(data.spawnedEntityId).toBeDefined();

    // Verify asset on disk
    const assetPath = join(tmpDir, "gamekit", "assets", "coin-gold.png");
    const fileBytes = await readFile(assetPath);
    expect(fileBytes.length).toBeGreaterThan(50);

    // Verify entity in scene
    const sceneContent = JSON.parse(await readFile(join(tmpDir, "gamekit", "scenes", "main.scene.json"), "utf8"));
    const entity = sceneContent.entities.find((e: any) => e.id === data.spawnedEntityId);
    expect(entity).toBeDefined();
    expect(entity.components.some((c: any) => c.type === "Sprite" && c.assetId === "coin-gold")).toBe(true);
  });

  it("generates an animated character spritesheet with Animation component", async () => {
    const { data } = await call("generate_character_spritesheet", {
      id: "hero-walk",
      archetype: "hero",
      animation: "walk",
      frameCount: 4,
      frameSize: 32,
      fps: 8,
      autoSpawn: true,
    });

    expect(data.success).toBe(true);
    expect(data.totalFrames).toBe(4);
    expect(data.framesPerSecond).toBe(8);
    expect(data.spawnedEntityId).toBeDefined();

    const sceneContent = JSON.parse(await readFile(join(tmpDir, "gamekit", "scenes", "main.scene.json"), "utf8"));
    const entity = sceneContent.entities.find((e: any) => e.id === data.spawnedEntityId);
    expect(entity).toBeDefined();
    const animComp = entity.components.find((c: any) => c.type === "Animation");
    expect(animComp).toBeDefined();
    expect(animComp.totalFrames).toBe(4);
  });

  it("generates a sound effect and registers audio asset", async () => {
    const { data } = await call("generate_sound_effect", {
      id: "sfx-laser",
      preset: "laser",
      volume: 0.8,
    });

    expect(data.success).toBe(true);
    expect(data.file).toBe("sfx-laser.wav");

    const projectContent = JSON.parse(await readFile(join(tmpDir, "gamekit", "project.json"), "utf8"));
    const asset = projectContent.assets.find((a: any) => a.id === "sfx-laser");
    expect(asset).toBeDefined();
    expect(asset.kind).toBe("audio");
  });

  it("generates music track and attaches BGM audio source", async () => {
    const { data } = await call("generate_music_track", {
      id: "bgm-dungeon",
      preset: "chill_dungeon",
      durationSec: 2.0,
      attachAsBgm: true,
    });

    expect(data.success).toBe(true);
    expect(data.file).toBe("bgm-dungeon.wav");
    expect(data.bgmEntityId).toBeDefined();

    const sceneContent = JSON.parse(await readFile(join(tmpDir, "gamekit", "scenes", "main.scene.json"), "utf8"));
    const bgmEntity = sceneContent.entities.find((e: any) => e.id === data.bgmEntityId);
    expect(bgmEntity).toBeDefined();
    const audioComp = bgmEntity.components.find((c: any) => c.type === "AudioSource");
    expect(audioComp).toBeDefined();
    expect(audioComp.assetId).toBe("bgm-dungeon");
    expect(audioComp.loop).toBe(true);
  });

  it("analyzes natural language asset prompts", async () => {
    const { data } = await call("analyze_asset_prompt", {
      prompt: "cyberpunk ninja jumping with glowing laser sword",
    });

    expect(data.category).toBe("character");
    expect(data.archetype).toBe("ninja");
    expect(data.palette).toBe("cyberpunk");
    expect(data.animationAction).toBe("jump");
  });

  it("enhances minimal asset generation prompts", async () => {
    const { data } = await call("enhance_asset_prompt", {
      prompt: "hero knight",
      category: "character",
    });

    expect(data.original).toBe("hero knight");
    expect(data.enhanced).toContain("pixel art");
  });

  it("generates 4 multi-variation preview candidates", async () => {
    const { data } = await call("generate_asset_variations", {
      prompt: "golden magic ring",
      category: "item",
      count: 4,
    });

    expect(data.success).toBe(true);
    expect(data.count).toBe(4);
    expect(data.variations.length).toBe(4);
    expect(data.variations[0].dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(data.variations[0].seed).toBeDefined();
  });

  it("generates a procedural tileset asset", async () => {
    const { data } = await call("generate_tileset", {
      id: "tileset-cyber",
      theme: "cyberpunk",
      palette: "cyberpunk",
      tileSize: 16,
      columns: 4,
      rows: 4,
    });

    expect(data.success).toBe(true);
    expect(data.assetId).toBe("tileset-cyber");
    expect(data.totalTiles).toBe(16);
    expect(data.file).toBe("tileset-cyber.png");

    const assetPath = join(tmpDir, "gamekit", "assets", "tileset-cyber.png");
    const fileBytes = await readFile(assetPath);
    expect(fileBytes.length).toBeGreaterThan(100);
  });

  it("generates a full cohesive thematic game asset pack", async () => {
    const { data } = await call("generate_asset_pack", {
      packName: "dungeon-pack",
      theme: "dungeon",
      autoSpawn: true,
    });

    expect(data.success).toBe(true);
    expect(data.packName).toBe("dungeon-pack");
    expect(data.assetCount).toBe(8); // hero, enemy, coin, tileset, 3 sfx, bgm
    expect(data.spawnedEntities.length).toBeGreaterThanOrEqual(4);

    const projectContent = JSON.parse(await readFile(join(tmpDir, "gamekit", "project.json"), "utf8"));
    expect(projectContent.assets.length).toBe(8);
  });
});

