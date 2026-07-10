import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { regenerateAssetsManifest } from "../utils/assets-gen.js";
import type { FileIO } from "../utils/file-io.js";
import { copyFile } from "node:fs/promises";
import { extname, join } from "node:path";

export function registerAssetTools(server: McpServer, fileIO: FileIO): void {
  server.tool("list_assets", "List all assets from project.json", {}, async () => {
    const project = await fileIO.readProject();
    return {
      content: [{ type: "text", text: JSON.stringify(project.assets, null, 2) }],
    };
  });

  server.tool(
    "add_asset",
    "Add an asset to project.json and regenerate manifest",
    {
      id: z.string().describe("Asset ID (kebab-case, e.g., 'player')"),
      file: z.string().describe("Asset filename (e.g., 'player.svg')"),
      kind: z.enum(["image", "audio", "font"]).describe("Asset type"),
    },
    async ({ id, file, kind }) => {
      const project = await fileIO.readProject();

      const existing = project.assets.find((a) => a.id === id);
      if (existing) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Asset ID already exists: ${id}` }) }],
          isError: true,
        };
      }

      const asset = { id, file, kind };
      project.assets.push(asset);
      await fileIO.writeProject(project);
      await regenerateAssetsManifest(fileIO.assetsDir.replace(/\/assets$/, ""), project);

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, asset, message: "Asset added and manifest regenerated" }, null, 2) }],
      };
    },
  );

  server.tool(
    "remove_asset",
    "Remove an asset from project.json and regenerate manifest",
    {
      id: z.string().describe("Asset ID to remove"),
    },
    async ({ id }) => {
      const project = await fileIO.readProject();
      const index = project.assets.findIndex((a) => a.id === id);
      if (index === -1) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Asset not found: ${id}` }) }],
          isError: true,
        };
      }

      const removed = project.assets.splice(index, 1)[0];
      await fileIO.writeProject(project);
      await regenerateAssetsManifest(fileIO.assetsDir.replace(/\/assets$/, ""), project);

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, removed, message: "Asset removed and manifest regenerated" }, null, 2) }],
      };
    },
  );

  server.tool("regenerate_manifest", "Regenerate the assets.ts manifest file", {}, async () => {
    const project = await fileIO.readProject();
    await regenerateAssetsManifest(fileIO.assetsDir.replace(/\/assets$/, ""), project);

    return {
      content: [{ type: "text", text: JSON.stringify({ success: true, message: "Assets manifest regenerated", assetCount: project.assets.length }) }],
    };
  });

  server.tool(
    "import_audio",
    "Import an audio file (mp3/ogg/wav) into the project assets",
    {
      id: z.string().describe("Desired Asset ID (kebab-case, e.g., 'jump-sound')"),
      sourcePath: z.string().describe("Absolute path to the source audio file"),
    },
    async ({ id, sourcePath }) => {
      const extension = extname(sourcePath).toLowerCase();
      if (![".mp3", ".ogg", ".wav"].includes(extension)) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Unsupported audio extension: ${extension}. Only mp3, ogg, and wav are supported.` }) }],
          isError: true,
        };
      }

      const project = await fileIO.readProject();
      const existing = project.assets.find((a) => a.id === id);
      if (existing) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Asset ID already exists: ${id}` }) }],
          isError: true,
        };
      }

      const fileName = `${id}${extension}`;
      const destination = join(fileIO.assetsDir, fileName);

      try {
        await copyFile(sourcePath, destination);
      } catch (err) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Failed to copy file: ${(err as Error).message}` }) }],
          isError: true,
        };
      }

      const asset = { id, file: fileName, kind: "audio" as const };
      project.assets.push(asset);
      await fileIO.writeProject(project);
      await regenerateAssetsManifest(fileIO.assetsDir.replace(/\/assets$/, ""), project);

      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, assetId: id, asset, message: "Audio asset imported successfully" }, null, 2) }],
      };
    }
  );
}
