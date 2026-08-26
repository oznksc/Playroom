import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileIO } from "../utils/file-io.js";

export function registerResources(server: McpServer, fileIO: FileIO): void {
  server.resource("project-info", "project://info", async (uri) => {
    const project = await fileIO.readProject();
    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(project, null, 2),
          mimeType: "application/json",
        },
      ],
    };
  });

  server.resource("scene-list", "scene://list", async (uri) => {
    const scenes = await fileIO.listScenes();
    const sceneDetails = [];

    for (const filename of scenes) {
      try {
        const scene = await fileIO.readScene(filename);
        sceneDetails.push({
          filename,
          id: scene.id,
          name: scene.name,
          entityCount: scene.entities.length,
        });
      } catch {
        sceneDetails.push({ filename, error: "Failed to read scene" });
      }
    }

    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(sceneDetails, null, 2),
          mimeType: "application/json",
        },
      ],
    };
  });

  server.resource("asset-presets", "assets://presets", async (uri) => {
    const presets = {
      spriteCategories: ["character", "enemy", "item", "tile", "prop", "icon"],
      palettes: ["pico8", "gameboy", "cyberpunk", "nes", "pastel", "monochrome"],
      characterArchetypes: ["hero", "knight", "rogue", "wizard", "monster", "slime", "robot", "alien"],
      animationActions: ["idle", "walk", "run", "jump", "attack", "hurt", "die"],
      sfxPresets: ["jump", "coin", "laser", "explosion", "hit", "powerup", "hurt", "ui_click", "defeat", "victory", "step", "whoosh", "teleport", "item_pickup"],
      musicPresets: ["chiptune_adventure", "boss_battle", "chill_dungeon", "cyberpunk_pulse", "retro_menu", "victory_fanfare", "spooky_night"],
      tilesetThemes: ["grass", "stone", "brick", "dungeon", "scifi", "cyberpunk"],
      packThemes: ["cyberpunk", "dungeon", "fantasy", "arcade", "retro", "scifi"],
    };

    return {
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(presets, null, 2),
          mimeType: "application/json",
        },
      ],
    };
  });
}

