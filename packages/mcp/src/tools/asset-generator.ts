import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { regenerateAssetsManifest } from "../utils/assets-gen.js";
import type { FileIO } from "../utils/file-io.js";
import {
  generateSprite,
  generateSpriteVariations,
  generateCharacterSpritesheet,
  generateTileset,
  parseAiPrompt,
  enhanceAiPrompt,
  synthesizeSfx,
  synthesizeMusic,
  SFX_PRESETS,
  MUSIC_PRESETS,
  PALETTES,
  type SpriteCategory,
  type PaletteName,
  type SfxPreset,
  type MusicPreset,
  type MusicalKey,
  type MusicalScale,
  type AnimationAction,
} from "../generators/index.js";
import { createEntity, type AnimationComponent, type AudioSourceComponent, type SpriteComponent, type TransformComponent } from "@gamekit/schema";

export function registerAssetGeneratorTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "analyze_asset_prompt",
    "Asset Studio: Parse a natural language prompt using AI logic to recommend sprite category, archetype, palette, animation action, sfx preset, and music genre.",
    {
      prompt: z.string().describe("Natural language asset description (e.g. 'cyberpunk ninja jumping with katana', 'retro 8-bit gold coin', 'dark dungeon boss fight')"),
    },
    async ({ prompt }) => {
      const analysis = parseAiPrompt(prompt);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(analysis, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "enhance_asset_prompt",
    "Asset Studio: Expand a minimal prompt into a rich, stylized pixel art generation prompt with artistic directives.",
    {
      prompt: z.string().describe("Input short prompt to enhance"),
      category: z.enum(["character", "enemy", "item", "tile", "prop", "icon"]).optional().describe("Optional sprite category"),
    },
    async ({ prompt, category }) => {
      const enhanced = enhanceAiPrompt(prompt, category as SpriteCategory | undefined);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ original: prompt, enhanced }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "generate_asset_variations",
    "Asset Studio: Generate a 4-variation preview set from a prompt or archetype with data URLs and seeds for inspection/selection.",
    {
      prompt: z.string().optional().describe("Descriptive prompt for the asset"),
      category: z.enum(["character", "enemy", "item", "tile", "prop", "icon"]).optional().describe("Sprite category"),
      archetype: z.string().optional().describe("Archetype/subject keyword (e.g. 'knight', 'slime', 'sword', 'potion')"),
      palette: z.enum(["pico8", "gameboy", "cyberpunk", "nes", "pastel", "monochrome"]).optional().describe("Color palette style"),
      size: z.number().optional().describe("Pixel size (16, 24, 32, 48, 64 - default: 32)"),
      count: z.number().min(2).max(8).optional().describe("Number of variations to generate (default: 4)"),
    },
    async ({ prompt, category, archetype, palette, size, count }) => {
      const variations = generateSpriteVariations({
        prompt,
        category: category as SpriteCategory | undefined,
        archetype,
        palette: palette as PaletteName | undefined,
        size: size ?? 32,
        count: count ?? 4,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                count: variations.length,
                variations: variations.map((v) => ({
                  variationIndex: v.variationIndex,
                  seed: v.seed,
                  assetId: v.sprite.id,
                  category: v.sprite.category,
                  palette: v.sprite.palette,
                  width: v.sprite.width,
                  height: v.sprite.height,
                  dataUrl: v.sprite.dataUrl,
                })),
                message: `Generated ${variations.length} distinct variations. Use the chosen seed in 'generate_sprite' to register to project.`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "generate_sprite",
    "Asset Studio: Procedurally generate a 2D sprite image (PNG) and register it as an asset in the project. Can automatically spawn it as an entity in the scene.",
    {
      id: z.string().describe("Asset ID (kebab-case, e.g. 'hero-sprite', 'gold-coin', 'pine-tree')"),
      category: z.enum(["character", "enemy", "item", "tile", "prop", "icon"]).optional().describe("Sprite category"),
      archetype: z.string().optional().describe("Archetype/subject keyword (e.g. 'knight', 'slime', 'sword', 'potion', 'grass', 'chest')"),
      palette: z.enum(["pico8", "gameboy", "cyberpunk", "nes", "pastel", "monochrome"]).optional().describe("Color palette style"),
      size: z.number().optional().describe("Square pixel dimensions (16, 24, 32, 48, 64, 128 - default: 32)"),
      seed: z.number().optional().describe("Specific PRNG seed for deterministic generation"),
      prompt: z.string().optional().describe("Optional descriptive text prompt to guide generation"),
      scene: z.string().optional().describe("Scene filename (e.g. 'main.scene.json') if autoSpawn is true"),
      autoSpawn: z.boolean().optional().describe("If true, automatically creates an entity with Sprite in the scene"),
      position: z.object({ x: z.number(), y: z.number() }).optional().describe("World position if autoSpawn is true"),
    },
    async ({ id, category, archetype, palette, size, seed, prompt, scene, autoSpawn, position }) => {
      await mkdir(fileIO.assetsDir, { recursive: true });

      const sprite = generateSprite({
        id,
        category: category as SpriteCategory | undefined,
        archetype,
        palette: palette as PaletteName | undefined,
        size: size ?? 32,
        seed,
        prompt,
      });

      const fileName = `${id}.png`;
      const filePath = join(fileIO.assetsDir, fileName);
      await writeFile(filePath, sprite.buffer);

      const project = await fileIO.readProject();
      project.assets = project.assets.filter((a) => a.id !== id);
      project.assets.push({
        id,
        file: fileName,
        kind: "image",
        width: sprite.width,
        height: sprite.height,
      });

      await fileIO.writeProject(project);
      await regenerateAssetsManifest(fileIO.projectRoot, project);

      let spawnedEntityId: string | undefined;
      if (autoSpawn) {
        const sceneFile = fileIO.resolveScenePath(scene || "main.scene.json");
        try {
          const sceneData = await fileIO.readScene(sceneFile);
          const entity = createEntity(id);

          const transform: TransformComponent = {
            type: "Transform",
            position: position ?? { x: 300, y: 200 },
            rotation: 0,
            scale: { x: 1, y: 1 },
          };

          const spriteComp: SpriteComponent = {
            type: "Sprite",
            assetId: id,
            width: sprite.width,
            height: sprite.height,
            anchor: { x: 0.5, y: 0.5 },
          };

          entity.components = [transform, spriteComp];

          // Add collider for physical objects
          if (category === "character" || category === "enemy" || category === "item" || category === "tile") {
            entity.components.push({
              type: "AabbCollider",
              offset: { x: 0, y: 0 },
              size: { x: sprite.width, y: sprite.height },
              isStatic: category === "tile",
            });
          }

          sceneData.entities.push(entity);
          await fileIO.writeScene(sceneFile, sceneData);
          spawnedEntityId = entity.id;
        } catch {
          // Auto-spawn is best effort
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                assetId: id,
                file: fileName,
                width: sprite.width,
                height: sprite.height,
                category: sprite.category,
                palette: sprite.palette,
                spawnedEntityId,
                message: `Sprite "${id}" successfully generated and saved to gamekit/assets/${fileName}`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "generate_character_spritesheet",
    "Asset Studio: Procedurally generate an animated character spritesheet (PNG strip) and register it. Can automatically spawn an animated entity.",
    {
      id: z.string().describe("Asset ID (kebab-case, e.g. 'hero-walk', 'slime-jump', 'knight-attack')"),
      archetype: z.string().optional().describe("Character archetype (e.g. 'hero', 'knight', 'rogue', 'wizard', 'monster', 'slime', 'robot', 'alien')"),
      animation: z.enum(["idle", "walk", "run", "jump", "attack", "hurt", "die"]).optional().describe("Animation type (default: 'walk')"),
      frameCount: z.number().min(2).max(8).optional().describe("Number of animation frames (default: 4)"),
      frameSize: z.number().optional().describe("Frame width and height in pixels (16, 32, 48, 64 - default: 32)"),
      fps: z.number().optional().describe("Playback speed in frames per second (default: 8)"),
      palette: z.enum(["pico8", "gameboy", "cyberpunk", "nes", "pastel", "monochrome"]).optional().describe("Color palette style"),
      scene: z.string().optional().describe("Scene filename if autoSpawn is true"),
      autoSpawn: z.boolean().optional().describe("If true, automatically creates an entity with Animation component in the scene"),
      position: z.object({ x: z.number(), y: z.number() }).optional().describe("World position if autoSpawn is true"),
    },
    async ({ id, archetype, animation, frameCount, frameSize, fps, palette, scene, autoSpawn, position }) => {
      await mkdir(fileIO.assetsDir, { recursive: true });

      const sheet = generateCharacterSpritesheet({
        id,
        archetype,
        animation: animation as AnimationAction | undefined,
        frameCount,
        frameSize,
        fps,
        palette: palette as PaletteName | undefined,
      });

      const fileName = `${id}.png`;
      const filePath = join(fileIO.assetsDir, fileName);
      await writeFile(filePath, sheet.buffer);

      const project = await fileIO.readProject();
      project.assets = project.assets.filter((a) => a.id !== id);
      project.assets.push({
        id,
        file: fileName,
        kind: "image",
        width: sheet.sheetWidth,
        height: sheet.sheetHeight,
      });

      await fileIO.writeProject(project);
      await regenerateAssetsManifest(fileIO.projectRoot, project);

      let spawnedEntityId: string | undefined;
      if (autoSpawn) {
        const sceneFile = fileIO.resolveScenePath(scene || "main.scene.json");
        try {
          const sceneData = await fileIO.readScene(sceneFile);
          const entity = createEntity(id);

          const transform: TransformComponent = {
            type: "Transform",
            position: position ?? { x: 300, y: 200 },
            rotation: 0,
            scale: { x: 1, y: 1 },
          };

          const spriteComp: SpriteComponent = {
            type: "Sprite",
            assetId: id,
            width: sheet.frameWidth,
            height: sheet.frameHeight,
            anchor: { x: 0.5, y: 0.5 },
          };

          const animComp: AnimationComponent = {
            type: "Animation",
            assetId: id,
            frameWidth: sheet.frameWidth,
            frameHeight: sheet.frameHeight,
            totalFrames: sheet.totalFrames,
            framesPerSecond: sheet.framesPerSecond,
            loop: true,
          };

          entity.components = [transform, spriteComp, animComp];

          // Add collider & player controller for characters
          entity.components.push({
            type: "AabbCollider",
            offset: { x: 0, y: 0 },
            size: { x: sheet.frameWidth, y: sheet.frameHeight },
            isStatic: false,
          });

          sceneData.entities.push(entity);
          await fileIO.writeScene(sceneFile, sceneData);
          spawnedEntityId = entity.id;
        } catch {
          // Auto-spawn is best effort
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                assetId: id,
                file: fileName,
                frameWidth: sheet.frameWidth,
                frameHeight: sheet.frameHeight,
                totalFrames: sheet.totalFrames,
                framesPerSecond: sheet.framesPerSecond,
                animation: sheet.animation,
                archetype: sheet.archetype,
                spawnedEntityId,
                message: `Animated spritesheet "${id}" (${sheet.totalFrames} frames @ ${sheet.framesPerSecond} FPS) saved to gamekit/assets/${fileName}`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "generate_tileset",
    "Asset Studio: Procedurally generate a 2D tilemap tileset texture (PNG) with terrain, borders, and platforms, and register it as an asset.",
    {
      id: z.string().describe("Asset ID (kebab-case, e.g. 'tileset-grass', 'tileset-dungeon', 'tileset-cyberpunk')"),
      theme: z.enum(["grass", "stone", "brick", "dungeon", "scifi", "cyberpunk"]).optional().describe("Tileset theme"),
      palette: z.enum(["pico8", "gameboy", "cyberpunk", "nes", "pastel", "monochrome"]).optional().describe("Color palette style"),
      tileSize: z.number().optional().describe("Square pixel dimensions per tile (16, 24, 32 - default: 16)"),
      columns: z.number().optional().describe("Number of columns (default: 4)"),
      rows: z.number().optional().describe("Number of rows (default: 4)"),
      seed: z.number().optional().describe("PRNG seed"),
    },
    async ({ id, theme, palette, tileSize, columns, rows, seed }) => {
      await mkdir(fileIO.assetsDir, { recursive: true });

      const tileset = generateTileset({
        id,
        theme,
        palette: palette as PaletteName | undefined,
        tileSize,
        columns,
        rows,
        seed,
      });

      const fileName = `${id}.png`;
      const filePath = join(fileIO.assetsDir, fileName);
      await writeFile(filePath, tileset.buffer);

      const project = await fileIO.readProject();
      project.assets = project.assets.filter((a) => a.id !== id);
      project.assets.push({
        id,
        file: fileName,
        kind: "image",
        width: tileset.width,
        height: tileset.height,
      });

      await fileIO.writeProject(project);
      await regenerateAssetsManifest(fileIO.projectRoot, project);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                assetId: id,
                file: fileName,
                width: tileset.width,
                height: tileset.height,
                tileSize: tileset.tileSize,
                columns: tileset.columns,
                rows: tileset.rows,
                totalTiles: tileset.totalTiles,
                palette: tileset.palette,
                message: `Tileset "${id}" (${tileset.totalTiles} tiles of ${tileset.tileSize}x${tileset.tileSize}px) saved to gamekit/assets/${fileName}`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "generate_sound_effect",
    "Asset Studio: Procedurally synthesize a sound effect (SFX WAV audio) and register it as an audio asset. Can attach to an entity's AudioSource.",
    {
      id: z.string().describe("Asset ID (kebab-case, e.g. 'sfx-jump', 'sfx-coin', 'sfx-laser', 'sfx-explosion')"),
      preset: z.enum([
        "jump",
        "coin",
        "laser",
        "explosion",
        "hit",
        "powerup",
        "hurt",
        "ui_click",
        "defeat",
        "victory",
        "step",
        "whoosh",
        "teleport",
        "item_pickup",
      ]).describe("Sound effect preset type"),
      volume: z.number().min(0).max(1).optional().describe("Sound volume (0.0 to 1.0, default 0.8)"),
      scene: z.string().optional().describe("Scene filename if attaching to an entity"),
      attachToEntityId: z.string().optional().describe("Optional entity ID in scene to attach an AudioSource component with this sound"),
    },
    async ({ id, preset, volume, scene, attachToEntityId }) => {
      await mkdir(fileIO.assetsDir, { recursive: true });

      const wavBuffer = synthesizeSfx({
        preset: preset as SfxPreset,
        volume: volume ?? 0.8,
      });

      const fileName = `${id}.wav`;
      const filePath = join(fileIO.assetsDir, fileName);
      await writeFile(filePath, wavBuffer);

      const project = await fileIO.readProject();
      project.assets = project.assets.filter((a) => a.id !== id);
      project.assets.push({
        id,
        file: fileName,
        kind: "audio",
      });

      await fileIO.writeProject(project);
      await regenerateAssetsManifest(fileIO.projectRoot, project);

      let attachedToEntity = false;
      if (attachToEntityId) {
        const sceneFile = fileIO.resolveScenePath(scene || "main.scene.json");
        try {
          const sceneData = await fileIO.readScene(sceneFile);
          const entity = sceneData.entities.find((e) => e.id === attachToEntityId);
          if (entity) {
            const existingAudioIdx = entity.components.findIndex((c) => c.type === "AudioSource");
            const audioComp: AudioSourceComponent = {
              type: "AudioSource",
              assetId: id,
              volume: volume ?? 1,
              loop: false,
              playOnStart: false,
            };
            if (existingAudioIdx >= 0) {
              entity.components[existingAudioIdx] = audioComp;
            } else {
              entity.components.push(audioComp);
            }
            await fileIO.writeScene(sceneFile, sceneData);
            attachedToEntity = true;
          }
        } catch {
          // Best effort
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                assetId: id,
                file: fileName,
                preset,
                kind: "audio",
                attachedToEntity,
                message: `Sound effect "${id}" (${preset}) synthesized and saved to gamekit/assets/${fileName}`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "generate_music_track",
    "Asset Studio: Procedurally synthesize a background music (BGM WAV audio) track and register it as an audio asset. Can attach as looping scene BGM.",
    {
      id: z.string().describe("Asset ID (kebab-case, e.g. 'bgm-adventure', 'bgm-boss', 'bgm-dungeon')"),
      preset: z.enum([
        "chiptune_adventure",
        "boss_battle",
        "chill_dungeon",
        "cyberpunk_pulse",
        "retro_menu",
        "victory_fanfare",
        "spooky_night",
      ]).optional().describe("Music genre / mood preset"),
      bpm: z.number().optional().describe("Tempo in beats per minute (e.g. 120, 130, 145)"),
      durationSec: z.number().optional().describe("Loop duration in seconds (default: ~8s)"),
      key: z.enum(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]).optional().describe("Musical root key"),
      scale: z.enum(["major", "minor", "pentatonic", "dorian", "blues", "harmonic_minor"]).optional().describe("Musical scale"),
      scene: z.string().optional().describe("Scene filename if attachAsBgm is true"),
      attachAsBgm: z.boolean().optional().describe("If true, adds a looping AudioSource entity to the active scene"),
    },
    async ({ id, preset, bpm, durationSec, key, scale, scene, attachAsBgm }) => {
      await mkdir(fileIO.assetsDir, { recursive: true });

      const wavBuffer = synthesizeMusic({
        preset: preset as MusicPreset | undefined,
        bpm,
        durationSec,
        key: key as MusicalKey | undefined,
        scale: scale as MusicalScale | undefined,
      });

      const fileName = `${id}.wav`;
      const filePath = join(fileIO.assetsDir, fileName);
      await writeFile(filePath, wavBuffer);

      const project = await fileIO.readProject();
      project.assets = project.assets.filter((a) => a.id !== id);
      project.assets.push({
        id,
        file: fileName,
        kind: "audio",
      });

      await fileIO.writeProject(project);
      await regenerateAssetsManifest(fileIO.projectRoot, project);

      let bgmEntityId: string | undefined;
      if (attachAsBgm) {
        const sceneFile = fileIO.resolveScenePath(scene || "main.scene.json");
        try {
          const sceneData = await fileIO.readScene(sceneFile);
          let bgmEntity = sceneData.entities.find((e) => e.id === "bgm-music" || e.id === "audio-bgm");
          if (!bgmEntity) {
            bgmEntity = createEntity("bgm-music");
            bgmEntity.components.push({
              type: "Transform",
              position: { x: 0, y: 0 },
              rotation: 0,
              scale: { x: 1, y: 1 },
            });
            sceneData.entities.push(bgmEntity);
          }

          const existingAudioIdx = bgmEntity.components.findIndex((c) => c.type === "AudioSource");
          const audioComp: AudioSourceComponent = {
            type: "AudioSource",
            assetId: id,
            volume: 0.8,
            loop: true,
            playOnStart: true,
          };

          if (existingAudioIdx >= 0) {
            bgmEntity.components[existingAudioIdx] = audioComp;
          } else {
            bgmEntity.components.push(audioComp);
          }

          await fileIO.writeScene(sceneFile, sceneData);
          bgmEntityId = bgmEntity.id;
        } catch {
          // Best effort
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                assetId: id,
                file: fileName,
                preset: preset || "chiptune_adventure",
                kind: "audio",
                bgmEntityId,
                message: `Music track "${id}" synthesized and saved to gamekit/assets/${fileName}`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "generate_asset_pack",
    "Asset Studio: One-shot generator that produces a complete, cohesive thematic game asset pack (character spritesheet, enemy sprite, collectible item, terrain tileset, jump/coin/hit SFX, and BGM music loop) and registers everything.",
    {
      packName: z.string().describe("Asset pack name prefix (e.g. 'cyber-platformer', 'dungeon-crawler', 'retro-arcade')"),
      theme: z.enum(["cyberpunk", "dungeon", "fantasy", "arcade", "retro", "scifi"]).optional().describe("Overall visual & acoustic theme"),
      palette: z.enum(["pico8", "gameboy", "cyberpunk", "nes", "pastel", "monochrome"]).optional().describe("Color palette override"),
      scene: z.string().optional().describe("Scene filename to spawn entities into"),
      autoSpawn: z.boolean().optional().describe("If true, spawns player, enemy, and collectible entities into the scene"),
    },
    async ({ packName, theme = "cyberpunk", palette, scene, autoSpawn }) => {
      await mkdir(fileIO.assetsDir, { recursive: true });

      const chosenPalette: PaletteName = palette ?? (
        theme === "cyberpunk" || theme === "scifi" ? "cyberpunk" :
        theme === "retro" ? "gameboy" :
        theme === "arcade" ? "nes" :
        "pico8"
      );

      const generatedAssets: Array<{ id: string; file: string; kind: "image" | "audio" }> = [];

      // 1. Player Character Spritesheet
      const playerSheetId = `${packName}-hero-walk`;
      const playerSheet = generateCharacterSpritesheet({
        id: playerSheetId,
        archetype: theme === "cyberpunk" ? "robot" : theme === "dungeon" ? "knight" : "hero",
        animation: "walk",
        frameCount: 4,
        frameSize: 32,
        fps: 8,
        palette: chosenPalette,
      });
      const playerFile = `${playerSheetId}.png`;
      await writeFile(join(fileIO.assetsDir, playerFile), playerSheet.buffer);
      generatedAssets.push({ id: playerSheetId, file: playerFile, kind: "image" });

      // 2. Enemy Sprite
      const enemyId = `${packName}-enemy`;
      const enemySprite = generateSprite({
        id: enemyId,
        category: "enemy",
        archetype: theme === "dungeon" ? "goblin" : "slime",
        palette: chosenPalette,
        size: 32,
      });
      const enemyFile = `${enemyId}.png`;
      await writeFile(join(fileIO.assetsDir, enemyFile), enemySprite.buffer);
      generatedAssets.push({ id: enemyId, file: enemyFile, kind: "image" });

      // 3. Collectible Item
      const itemId = `${packName}-coin`;
      const itemSprite = generateSprite({
        id: itemId,
        category: "item",
        archetype: "coin",
        palette: chosenPalette,
        size: 24,
      });
      const itemFile = `${itemId}.png`;
      await writeFile(join(fileIO.assetsDir, itemFile), itemSprite.buffer);
      generatedAssets.push({ id: itemId, file: itemFile, kind: "image" });

      // 4. Tileset
      const tilesetId = `${packName}-tileset`;
      const tilesetTheme = theme === "cyberpunk" ? "cyberpunk" : theme === "dungeon" ? "dungeon" : "grass";
      const tileset = generateTileset({
        id: tilesetId,
        theme: tilesetTheme,
        palette: chosenPalette,
        tileSize: 16,
      });
      const tilesetFile = `${tilesetId}.png`;
      await writeFile(join(fileIO.assetsDir, tilesetFile), tileset.buffer);
      generatedAssets.push({ id: tilesetId, file: tilesetFile, kind: "image" });

      // 5. Sound Effects (jump, coin, hit)
      const sfxList: Array<{ id: string; preset: SfxPreset }> = [
        { id: `${packName}-sfx-jump`, preset: "jump" },
        { id: `${packName}-sfx-coin`, preset: "coin" },
        { id: `${packName}-sfx-hit`, preset: "hit" },
      ];
      for (const sfx of sfxList) {
        const wav = synthesizeSfx({ preset: sfx.preset, volume: 0.8 });
        const sfxFile = `${sfx.id}.wav`;
        await writeFile(join(fileIO.assetsDir, sfxFile), wav);
        generatedAssets.push({ id: sfx.id, file: sfxFile, kind: "audio" });
      }

      // 6. BGM Track
      const bgmId = `${packName}-bgm`;
      const musicPreset: MusicPreset = theme === "cyberpunk" ? "cyberpunk_pulse" : theme === "dungeon" ? "chill_dungeon" : "chiptune_adventure";
      const bgmWav = synthesizeMusic({ preset: musicPreset, durationSec: 4.0 });
      const bgmFile = `${bgmId}.wav`;
      await writeFile(join(fileIO.assetsDir, bgmFile), bgmWav);
      generatedAssets.push({ id: bgmId, file: bgmFile, kind: "audio" });

      // Register all assets into project
      const project = await fileIO.readProject();
      for (const gen of generatedAssets) {
        project.assets = project.assets.filter((a) => a.id !== gen.id);
        project.assets.push({
          id: gen.id,
          file: gen.file,
          kind: gen.kind,
        });
      }
      await fileIO.writeProject(project);
      await regenerateAssetsManifest(fileIO.projectRoot, project);

      // Auto spawn entities if requested
      const spawnedEntities: string[] = [];
      if (autoSpawn) {
        const sceneFile = fileIO.resolveScenePath(scene || "main.scene.json");
        try {
          const sceneData = await fileIO.readScene(sceneFile);

          // Player
          const playerEntity = createEntity("player");
          playerEntity.components = [
            { type: "Transform", position: { x: 200, y: 300 }, rotation: 0, scale: { x: 1, y: 1 } },
            { type: "Sprite", assetId: playerSheetId, width: 32, height: 32, anchor: { x: 0.5, y: 0.5 } },
            { type: "Animation", assetId: playerSheetId, frameWidth: 32, frameHeight: 32, totalFrames: 4, framesPerSecond: 8, loop: true },
            { type: "PlayerController", speed: 200, jumpVelocity: 400, gravity: 800 },
            { type: "AabbCollider", offset: { x: 0, y: 0 }, size: { x: 32, y: 32 }, isStatic: false },
          ];
          sceneData.entities.push(playerEntity);
          spawnedEntities.push(playerEntity.id);

          // Enemy
          const enemyEntity = createEntity("enemy-1");
          enemyEntity.components = [
            { type: "Transform", position: { x: 450, y: 300 }, rotation: 0, scale: { x: 1, y: 1 } },
            { type: "Sprite", assetId: enemyId, width: 32, height: 32, anchor: { x: 0.5, y: 0.5 } },
            { type: "AabbCollider", offset: { x: 0, y: 0 }, size: { x: 32, y: 32 }, isStatic: false },
          ];
          sceneData.entities.push(enemyEntity);
          spawnedEntities.push(enemyEntity.id);

          // Collectible
          const coinEntity = createEntity("coin-1");
          coinEntity.components = [
            { type: "Transform", position: { x: 320, y: 260 }, rotation: 0, scale: { x: 1, y: 1 } },
            { type: "Sprite", assetId: itemId, width: 24, height: 24, anchor: { x: 0.5, y: 0.5 } },
            { type: "AabbCollider", offset: { x: 0, y: 0 }, size: { x: 24, y: 24 }, isStatic: true },
          ];
          sceneData.entities.push(coinEntity);
          spawnedEntities.push(coinEntity.id);

          // BGM
          const bgmEntity = createEntity("bgm-music");
          bgmEntity.components = [
            { type: "Transform", position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
            { type: "AudioSource", assetId: bgmId, volume: 0.8, loop: true, playOnStart: true },
          ];
          sceneData.entities.push(bgmEntity);
          spawnedEntities.push(bgmEntity.id);

          await fileIO.writeScene(sceneFile, sceneData);
        } catch {
          // Best effort
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                packName,
                theme,
                palette: chosenPalette,
                assetCount: generatedAssets.length,
                assets: generatedAssets,
                spawnedEntities,
                message: `Complete Asset Pack "${packName}" generated with ${generatedAssets.length} assets (spritesheet, enemy, coin, tileset, 3 sfx, bgm).`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool("list_asset_generator_presets", "Asset Studio: List all available presets, styles, and options for asset generators", {}, async () => {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              sfxPresets: Object.keys(SFX_PRESETS),
              musicPresets: Object.keys(MUSIC_PRESETS),
              palettes: Object.keys(PALETTES),
              spriteCategories: ["character", "enemy", "item", "tile", "prop", "icon"],
              characterArchetypes: ["hero", "knight", "rogue", "wizard", "monster", "slime", "robot", "alien"],
              animationActions: ["idle", "walk", "run", "jump", "attack", "hurt", "die"],
              musicalScales: ["major", "minor", "pentatonic", "dorian", "blues", "harmonic_minor"],
              musicalKeys: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
              tilesetThemes: ["grass", "stone", "brick", "dungeon", "scifi", "cyberpunk"],
              packThemes: ["cyberpunk", "dungeon", "fantasy", "arcade", "retro", "scifi"],
            },
            null,
            2
          ),
        },
      ],
    };
  });
}

