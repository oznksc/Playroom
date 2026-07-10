import { readdir, readFile, copyFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createEmptyScene,
  slugify,
  createId,
  type GameKitScene,
  type GameKitEntity,
  type GameKitComponent,
} from "@gamekit/schema";
import type { FileIO } from "../utils/file-io.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const skillsDir = join(__dirname, "..", "..", "skills");

interface SkillTemplate {
  name: string;
  description: string;
  orientation: "landscape" | "portrait";
  viewport?: { width: number; height: number; background: string };
  gravity?: { x: number; y: number };
  entities: SkillEntity[];
  requiredAssets?: SkillAsset[];
  inputMap?: {
    bindings: Array<{
      action: string;
      keys: string[];
      touchControl?: "left" | "right" | "jump";
      gamepad?: string;
    }>;
  };
}

interface SkillEntity {
  name: string;
  components: SkillComponent[];
}

type SkillComponent = Record<string, unknown>;

interface SkillAsset {
  id: string;
  file: string;
  sourceFile: string;
}

function buildSceneFromSkill(skill: SkillTemplate, sceneName?: string): GameKitScene {
  const name = sceneName ?? skill.name;
  const scene = createEmptyScene(name);

  if (skill.viewport) {
    scene.viewport = skill.viewport;
  }
  if (skill.gravity) {
    scene.gravity = skill.gravity;
  }
  if (skill.inputMap) {
    scene.inputMap = skill.inputMap;
  }
  scene.responsive.orientation = skill.orientation;
  scene.responsive.referenceWidth = scene.viewport.width;
  scene.responsive.referenceHeight = scene.viewport.height;

  const idMap = new Map<string, string>();

  for (const skillEntity of skill.entities) {
    const entity: GameKitEntity = {
      id: createId(skillEntity.name),
      name: skillEntity.name,
      components: [],
    };
    idMap.set(skillEntity.name, entity.id);

    for (const comp of skillEntity.components) {
      entity.components.push(comp as unknown as GameKitComponent);
    }

    scene.entities.push(entity);
  }

  for (const entity of scene.entities) {
    for (const comp of entity.components) {
      if (comp.type === "CameraFollow" && typeof comp.targetId === "string") {
        const resolvedId = idMap.get(comp.targetId);
        if (resolvedId) {
          comp.targetId = resolvedId;
        }
      }
    }
  }

  return scene;
}

export function registerSkillTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "list_skills",
    "List available game template skills that can be applied to create scenes",
    {},
    async () => {
      let files: string[];
      try {
        files = await readdir(skillsDir);
      } catch {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Skills directory not found" }) }],
          isError: true,
        };
      }

      const skills = [];
      for (const file of files.filter((f) => f.endsWith(".json"))) {
        try {
          const raw = JSON.parse(await readFile(join(skillsDir, file), "utf8"));
          skills.push({
            id: file.replace(".json", ""),
            name: raw.name,
            description: raw.description,
            entityCount: raw.entities?.length ?? 0,
          });
        } catch {
          // skip invalid skill files
        }
      }

      return {
        content: [{ type: "text", text: JSON.stringify(skills, null, 2) }],
      };
    },
  );

  server.tool(
    "apply_skill",
    "Apply a game template skill to create a fully configured scene with entities and components",
    {
      skillName: z.string().describe("Skill ID (e.g., 'platformer', 'topdown', 'puzzle')"),
      sceneName: z.string().optional().describe("Override scene name (defaults to skill name)"),
    },
    async ({ skillName, sceneName }) => {
      const skillPath = join(skillsDir, `${skillName}.json`);

      let skill: SkillTemplate;
      try {
        const raw = await readFile(skillPath, "utf8");
        skill = JSON.parse(raw);
      } catch {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Skill not found: ${skillName}` }) }],
          isError: true,
        };
      }

      const scene = buildSceneFromSkill(skill, sceneName);
      const filename = `${slugify(sceneName ?? skill.name)}.scene.json`;

      await fileIO.writeScene(filename, scene);

      const project = await fileIO.readProject();
      if (!project.scenes.includes(filename)) {
        project.scenes.push(filename);
      }

      if (skill.requiredAssets) {
        for (const asset of skill.requiredAssets) {
          if (!project.assets.find((a) => a.id === asset.id)) {
            project.assets.push({ id: asset.id, file: asset.file, kind: "image" });

            const sourcePath = join(skillsDir, "assets", asset.sourceFile);
            const destPath = join(fileIO.assetsDir, asset.file);
            try {
              await access(sourcePath);
              await copyFile(sourcePath, destPath);
            } catch {
              // Asset source file not bundled — user needs to add it manually
            }
          }
        }
      }

      await fileIO.writeProject(project);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                filename,
                sceneName: scene.name,
                entityCount: scene.entities.length,
                entities: scene.entities.map((e) => e.name),
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
