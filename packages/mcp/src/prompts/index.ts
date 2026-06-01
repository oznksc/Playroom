import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const codingSkillsDir = join(__dirname, "..", "..", "skills", "coding");

async function loadCodingSkill(id: string): Promise<string> {
  try {
    return await readFile(join(codingSkillsDir, `${id}.md`), "utf8");
  } catch {
    return `Skill not found: ${id}`;
  }
}

export function registerPrompts(server: McpServer): void {
  server.prompt(
    "skia_best_practices",
    "Load @shopify/react-native-skia best practices for Canvas, drawing, shaders, and GPU rendering",
    {},
    async () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: await loadCodingSkill("shopify-skia"),
          },
        },
      ],
    }),
  );

  server.prompt(
    "reanimated_best_practices",
    "Load react-native-reanimated best practices for worklets, shared values, and animations",
    {},
    async () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: await loadCodingSkill("reanimated"),
          },
        },
      ],
    }),
  );

  server.prompt(
    "phaser_guide",
    "Load Phaser best practices — covering game setup, canvas rendering, scene management, physics, and input",
    {},
    async () => {
      const [phaser, canvas, scene, physics, input] = await Promise.all([
        loadCodingSkill("phaser"),
        loadCodingSkill("phaser-canvas"),
        loadCodingSkill("phaser-scene"),
        loadCodingSkill("phaser-physics"),
        loadCodingSkill("phaser-input"),
      ]);

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `# Phaser Complete Guide\n\n## General\n${phaser}\n\n## Canvas & Rendering\n${canvas}\n\n## Scene Management\n${scene}\n\n## Physics\n${physics}\n\n## Input Handling\n${input}`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    "react_native_guide",
    "Load React Native best practices — covering core patterns, navigation, styling, performance, Reanimated, and Skia",
    {},
    async () => {
      const [rn, perf, reanimated, skia] = await Promise.all([
        loadCodingSkill("react-native"),
        loadCodingSkill("rn-performance"),
        loadCodingSkill("reanimated"),
        loadCodingSkill("shopify-skia"),
      ]);

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `# React Native Complete Guide\n\n## General Patterns\n${rn}\n\n## Performance\n${perf}\n\n## Animations (Reanimated)\n${reanimated}\n\n## GPU Rendering (Skia)\n${skia}`,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    "create_game",
    "Guided prompt for creating a new 2D game with GameKit",
    {},
    async () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `I want to create a 2D game using GameKit. Help me set up the project.

GameKit uses an Entity-Component-System architecture. Here's how to get started:

1. First, check the current project state using get_project
2. List available skills using list_skills — these are ready-made game templates
3. Apply a skill template using apply_skill to get a head start, OR create a scene manually:
   - Use create_scene to create a new scene
   - Use add_entity to add game objects
   - Use add_component to add behavior (Transform, Sprite, AabbCollider, PlayerController, CameraFollow, Animation)
4. Add game assets using add_asset and place image files in gamekit/assets/
5. Use regenerate_manifest to update the asset registry

Available component types:
- Transform: position, rotation, scale (required for all entities)
- Sprite: renders an image asset (assetId, width, height, anchor)
- AabbCollider: axis-aligned bounding box collision (size, isStatic, layer, mask)
- PlayerController: keyboard-controlled movement (speed, jumpVelocity, gravity)
- CameraFollow: smooth camera tracking (targetId, smoothing)
- Animation: frame-based sprite animation (assetId, frameWidth, frameHeight, totalFrames, framesPerSecond, loop)

What kind of game would you like to create?`,
          },
        },
      ],
    }),
  );

  server.prompt(
    "add_platformer_level",
    "Step-by-step guide for adding a new platformer level",
    {},
    async () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `I want to add a new platformer level to my GameKit project. Guide me through the process:

1. Use create_scene to create a new scene (e.g., name: "Level 2", orientation: "landscape")
2. Add a player entity with these components:
   - Transform at starting position
   - Sprite with player asset
   - AabbCollider matching sprite size
   - PlayerController (speed: 300, jumpVelocity: 600, gravity: 1800)
   - CameraFollow targeting the player entity
3. Add ground/platform entities with:
   - Transform at their positions
   - Sprite with platform asset
   - AabbCollider with isStatic: true
4. Optionally add collectibles, enemies, or decorative elements
5. Update project.json to include the new scene in levels

Let me know the theme and layout you have in mind!`,
          },
        },
      ],
    }),
  );
}
