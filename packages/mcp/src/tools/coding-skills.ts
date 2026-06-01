import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const codingSkillsDir = join(__dirname, "..", "..", "skills", "coding");

interface CodingSkillMeta {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

const SKILL_REGISTRY: Record<string, { name: string; description: string; tags: string[] }> = {
  "shopify-skia": {
    name: "Shopify Skia",
    description: "@shopify/react-native-skia — Canvas drawing, GPU-accelerated rendering, shaders, and animations",
    tags: ["react-native", "skia", "canvas", "gpu", "graphics"],
  },
  "reanimated": {
    name: "Reanimated",
    description: "react-native-reanimated — Worklets, shared values, layout animations, gesture-driven animations",
    tags: ["react-native", "animation", "worklets", "shared-values", "gesture"],
  },
  "rn-performance": {
    name: "React Native Performance",
    description: "React Native performance — FlatList optimization, Hermes engine, memoization, profiling",
    tags: ["react-native", "performance", "optimization", "hermes", "flatlist"],
  },
  "react": {
    name: "React",
    description: "React patterns — Hooks, composition, state management, memoization, error boundaries",
    tags: ["react", "hooks", "state", "composition", "patterns"],
  },
  "react-native": {
    name: "React Native",
    description: "React Native general — Navigation, styling, platform differences, debugging, build",
    tags: ["react-native", "navigation", "styling", "platform", "mobile"],
  },
  "vite": {
    name: "Vite",
    description: "Vite — Configuration, plugins, HMR, build optimization, environment variables, testing",
    tags: ["vite", "bundler", "dev-server", "esm", "build"],
  },
  "phaser": {
    name: "Phaser",
    description: "Phaser general — Game setup, scene lifecycle, game objects, physics, audio, assets",
    tags: ["phaser", "game", "2d", "physics", "scene"],
  },
  "phaser-canvas": {
    name: "Phaser Canvas & Rendering",
    description: "Phaser canvas — WebGL vs Canvas, cameras, shaders, tilemaps, particles, textures",
    tags: ["phaser", "canvas", "webgl", "rendering", "camera", "shaders"],
  },
  "phaser-scene": {
    name: "Phaser Scene Management",
    description: "Phaser scenes — Lifecycle, transitions, data passing, parallel scenes, state management",
    tags: ["phaser", "scene", "lifecycle", "transitions", "state"],
  },
  "phaser-physics": {
    name: "Phaser Physics",
    description: "Phaser physics — Arcade physics, Matter.js, colliders, bodies, collision categories",
    tags: ["phaser", "physics", "arcade", "matter", "collision"],
  },
  "phaser-input": {
    name: "Phaser Input",
    description: "Phaser input — Keyboard, pointer, gamepad, combos, mobile touch, drag & drop",
    tags: ["phaser", "input", "keyboard", "touch", "gamepad", "gestures"],
  },
};

function parseSkillMeta(id: string, content: string): CodingSkillMeta {
  const lines = content.split("\n");
  const nameLine = lines.find((l) => l.startsWith("# "));
  const name = nameLine?.replace("# ", "").trim() ?? id;

  const registered = SKILL_REGISTRY[id];
  return {
    id,
    name: registered?.name ?? name,
    description: registered?.description ?? name,
    tags: registered?.tags ?? [],
  };
}

export function registerCodingSkillTools(server: McpServer): void {
  server.tool(
    "list_coding_skills",
    "List available coding best-practice skills (React, React Native, Phaser, Vite, etc.)",
    {
      tag: z.string().optional().describe("Filter skills by tag (e.g., 'react-native', 'phaser', 'vite')"),
    },
    async ({ tag }) => {
      let files: string[];
      try {
        files = await readdir(codingSkillsDir);
      } catch {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Coding skills directory not found" }) }],
          isError: true,
        };
      }

      const skills: CodingSkillMeta[] = [];
      for (const file of files.filter((f) => f.endsWith(".md"))) {
        try {
          const id = file.replace(".md", "");
          const content = await readFile(join(codingSkillsDir, file), "utf8");
          const meta = parseSkillMeta(id, content);

          if (tag && !meta.tags.includes(tag)) continue;

          skills.push(meta);
        } catch {
          // skip invalid files
        }
      }

      return {
        content: [{ type: "text", text: JSON.stringify(skills, null, 2) }],
      };
    },
  );

  server.tool(
    "get_coding_skill",
    "Get the full content of a coding best-practice skill",
    {
      skillId: z
        .string()
        .describe(
          "Skill ID (e.g., 'shopify-skia', 'reanimated', 'phaser', 'phaser-canvas', 'react-native')",
        ),
    },
    async ({ skillId }) => {
      const skillPath = join(codingSkillsDir, `${skillId}.md`);

      let content: string;
      try {
        content = await readFile(skillPath, "utf8");
      } catch {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: `Coding skill not found: ${skillId}`,
                available: Object.keys(SKILL_REGISTRY),
              }),
            },
          ],
          isError: true,
        };
      }

      const meta = parseSkillMeta(skillId, content);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                ...meta,
                content,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
