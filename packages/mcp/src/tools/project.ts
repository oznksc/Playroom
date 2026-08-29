import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createLevel, projectToJson, sceneToJson } from "@gamekit/schema";
import type { FileIO } from "../utils/file-io.js";

export function registerProjectTools(server: McpServer, fileIO: FileIO): void {
  server.tool("get_project", "Read and return project.json", {}, async () => {
    const project = await fileIO.readProject();
    return {
      content: [{ type: "text", text: JSON.stringify(project, null, 2) }],
    };
  });

  server.tool(
    "update_project",
    "Update project.json fields",
    {
      name: z.string().optional().describe("New project name"),
      scenes: z.array(z.string()).optional().describe("New scenes list"),
      levels: z.array(z.unknown()).optional().describe("New levels list"),
    },
    async ({ name, scenes, levels }) => {
      const project = await fileIO.readProject();

      if (name !== undefined) {
        project.name = name;
      }
      if (scenes !== undefined) {
        project.scenes = scenes;
      }
      if (levels !== undefined) {
        project.levels = levels as typeof project.levels;
      }

      await fileIO.writeProject(project);
      return {
        content: [{ type: "text", text: JSON.stringify(project, null, 2) }],
      };
    }
  );

  server.tool(
    "list_levels",
    "List project.levels (id, name, order, sceneIds, unlocked).",
    {},
    async () => {
      const project = await fileIO.readProject();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ count: project.levels.length, levels: project.levels }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "add_level",
    "Append a level to project.levels. sceneIds are scene ids without the .scene.json suffix (e.g. 'main').",
    {
      name: z.string().describe("Level display name"),
      sceneIds: z.array(z.string()).min(1).describe("Scene ids this level plays, e.g. ['main']"),
      order: z.number().optional().describe("Sort order (defaults to next integer)"),
      unlocked: z.boolean().optional().describe("Defaults to true only for order === 1"),
    },
    async ({ name, sceneIds, order, unlocked }) => {
      const project = await fileIO.readProject();
      const nextOrder = order ?? project.levels.reduce((max, l) => Math.max(max, l.order), 0) + 1;
      const level = createLevel(name, nextOrder, sceneIds);
      if (unlocked !== undefined) level.unlocked = unlocked;
      if (project.levels.some((l) => l.id === level.id)) {
        level.id = `${level.id}-${nextOrder}`;
      }
      project.levels.push(level);
      await fileIO.writeProject(project);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, level, total: project.levels.length }, null, 2),
          },
        ],
      };
    }
  );

  server.tool(
    "update_level",
    "Patch a level by id (name, order, sceneIds, unlocked).",
    {
      levelId: z.string(),
      name: z.string().optional(),
      order: z.number().optional(),
      sceneIds: z.array(z.string()).optional(),
      unlocked: z.boolean().optional(),
    },
    async ({ levelId, name, order, sceneIds, unlocked }) => {
      const project = await fileIO.readProject();
      const level = project.levels.find((l) => l.id === levelId);
      if (!level) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: `Level "${levelId}" not found. Use list_levels.`,
                levels: project.levels.map((l) => l.id),
              }),
            },
          ],
          isError: true,
        };
      }
      if (name !== undefined) level.name = name;
      if (order !== undefined) level.order = order;
      if (sceneIds !== undefined) level.sceneIds = sceneIds;
      if (unlocked !== undefined) level.unlocked = unlocked;
      await fileIO.writeProject(project);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, level }, null, 2) }],
      };
    }
  );

  server.tool(
    "remove_level",
    "Delete a level from project.levels (Levels panel).",
    { levelId: z.string() },
    async ({ levelId }) => {
      const project = await fileIO.readProject();
      const before = project.levels.length;
      project.levels = project.levels.filter((l) => l.id !== levelId);
      if (project.levels.length === before) {
        return {
          content: [
            { type: "text", text: JSON.stringify({ error: `Level "${levelId}" not found.` }) },
          ],
          isError: true,
        };
      }
      await fileIO.writeProject(project);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { success: true, removed: levelId, remaining: project.levels.map((l) => l.id) },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    "validate_project",
    "Validate project.json file structure against schema rules",
    {},
    async () => {
      try {
        const project = await fileIO.readProject();
        return {
          content: [{ type: "text", text: JSON.stringify({ ok: true, project }, null, 2) }],
        };
      } catch (err: any) {
        return {
          content: [
            { type: "text", text: JSON.stringify({ ok: false, errors: [err.message] }, null, 2) },
          ],
        };
      }
    }
  );

  server.tool(
    "generate_assets_manifest",
    "Regenerate project asset registry manifest (assets.ts for web/mobile or assets.json for libgdx).",
    {
      platform: z
        .enum(["web", "mobile", "libgdx"])
        .default("libgdx")
        .describe("Target platform format"),
    },
    async ({ platform }) => {
      const project = await fileIO.readProject();
      const generatedDir = join(fileIO.projectRoot, "gamekit", "generated");
      await mkdir(generatedDir, { recursive: true });

      if (platform === "libgdx") {
        const outPath = join(generatedDir, "assets.json");
        await writeFile(outPath, JSON.stringify({ assets: project.assets }, null, 2) + "\n");
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  platform,
                  path: "gamekit/generated/assets.json",
                  assetCount: project.assets.length,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const outPath = join(generatedDir, "assets.ts");
      const entries = project.assets
        .map((asset) =>
          platform === "web"
            ? `  ${JSON.stringify(asset.id)}: new URL("../assets/${asset.file}", import.meta.url).href`
            : `  ${JSON.stringify(asset.id)}: require("../assets/${asset.file}")`
        )
        .join(",\n");

      const content = `/* This file is generated by Playroom MCP. */\nexport const gamekitAssets = {\n${entries}\n} as const;\n\nexport type GameKitAssetId = keyof typeof gamekitAssets;\n`;
      await writeFile(outPath, content);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                platform,
                path: "gamekit/generated/assets.ts",
                assetCount: project.assets.length,
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
    "export_project",
    "Export the Playroom project into a standalone runnable project (libGDX / Web / Mobile).",
    {
      platform: z
        .enum(["libgdx", "web", "mobile"])
        .default("libgdx")
        .describe("Target platform"),
      outDir: z
        .string()
        .optional()
        .describe("Output directory path (defaults to 'build/export-<platform>')"),
    },
    async ({ platform, outDir }) => {
      const project = await fileIO.readProject();
      const targetOut = outDir
        ? resolve(fileIO.projectRoot, outDir)
        : join(fileIO.projectRoot, "build", `export-${platform}`);
      const scenes = await fileIO.listScenes();

      const outputGamekit =
        platform === "libgdx"
          ? join(targetOut, "assets", "gamekit")
          : join(targetOut, "gamekit");
      await mkdir(join(outputGamekit, "scenes"), { recursive: true });
      await mkdir(join(outputGamekit, "assets"), { recursive: true });
      await mkdir(join(outputGamekit, "generated"), { recursive: true });

      // Copy scenes
      for (const sceneFile of scenes) {
        const scene = await fileIO.readScene(sceneFile);
        await writeFile(join(outputGamekit, "scenes", sceneFile), sceneToJson(scene));
      }

      // Copy project.json
      await writeFile(
        platform === "libgdx"
          ? join(targetOut, "assets", "gamekit", "project.json")
          : join(outputGamekit, "project.json"),
        projectToJson(project)
      );

      // Copy assets
      for (const asset of project.assets) {
        const src = join(fileIO.assetsDir, asset.file);
        try {
          const data = await readFile(src);
          await writeFile(join(outputGamekit, "assets", asset.file), data);
        } catch {}
      }

      // Write generated asset manifest
      if (platform === "libgdx") {
        await writeFile(
          join(outputGamekit, "generated", "assets.json"),
          JSON.stringify({ assets: project.assets }, null, 2) + "\n"
        );
      }

      let runCommand = "";
      if (platform === "libgdx") {
        runCommand = `cd ${targetOut} && ./gradlew lwjgl3:run`;
      } else if (platform === "web") {
        runCommand = `cd ${targetOut} && pnpm install && pnpm dev`;
      } else {
        runCommand = `cd ${targetOut} && pnpm install && npx expo start`;
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                platform,
                exportPath: targetOut,
                projectName: project.name,
                scenesCount: scenes.length,
                assetsCount: project.assets.length,
                instructions: `Run '${runCommand}' to launch the exported project.`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}

