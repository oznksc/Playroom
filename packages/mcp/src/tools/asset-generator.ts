import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { regenerateAssetsManifest } from "../utils/assets-gen.js";
import type { FileIO } from "../utils/file-io.js";
import {
  generateSprite,
  generateCharacterSpritesheet,
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
    "generate_sprite",
    "Procedurally generate a 2D sprite image (PNG) and register it as an asset in the project. Can automatically spawn it as an entity in the scene.",
    {
      id: z.string().describe("Asset ID (kebab-case, e.g. 'hero-sprite', 'gold-coin', 'pine-tree')"),
      category: z.enum(["character", "enemy", "item", "tile", "prop", "icon"]).optional().describe("Sprite category"),
      archetype: z.string().optional().describe("Archetype/subject keyword (e.g. 'knight', 'slime', 'sword', 'potion', 'grass', 'chest')"),
      palette: z.enum(["pico8", "gameboy", "cyberpunk", "nes", "pastel", "monochrome"]).optional().describe("Color palette style"),
      size: z.number().optional().describe("Square pixel dimensions (16, 24, 32, 48, 64, 128 - default: 32)"),
      prompt: z.string().optional().describe("Optional descriptive text prompt to guide generation"),
      scene: z.string().optional().describe("Scene filename (e.g. 'main.scene.json') if autoSpawn is true"),
      autoSpawn: z.boolean().optional().describe("If true, automatically creates an entity with Sprite in the scene"),
      position: z.object({ x: z.number(), y: z.number() }).optional().describe("World position if autoSpawn is true"),
    },
    async ({ id, category, archetype, palette, size, prompt, scene, autoSpawn, position }) => {
      await mkdir(fileIO.assetsDir, { recursive: true });

      const sprite = generateSprite({
        id,
        category: category as SpriteCategory | undefined,
        archetype,
        palette: palette as PaletteName | undefined,
        size: size ?? 32,
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
    "Procedurally generate an animated character spritesheet (PNG strip) and register it. Can automatically spawn an animated entity.",
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
    "generate_sound_effect",
    "Procedurally synthesize a sound effect (SFX WAV audio) and register it as an audio asset. Can attach to an entity's AudioSource.",
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
    "Procedurally synthesize a background music (BGM WAV audio) track and register it as an audio asset. Can attach as looping scene BGM.",
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

  server.tool("list_asset_generator_presets", "List all available presets, styles, and options for asset generators", {}, async () => {
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
            },
            null,
            2
          ),
        },
      ],
    };
  });
}
