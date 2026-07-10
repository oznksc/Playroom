import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FileIO } from "../utils/file-io.js";

export function registerSnapshotTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "snapshot_undo_point",
    "Create a snapshot of the current scene for undo purposes",
    {
      scenePath: z.string().describe("Scene filename"),
    },
    async ({ scenePath }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const snapshotId = `snap_${Date.now()}`;
      const snapshotsDir = join(fileIO.assetsDir, "..", "agent", "snapshots");
      await mkdir(snapshotsDir, { recursive: true });
      await writeFile(
        join(snapshotsDir, `${snapshotId}.json`),
        JSON.stringify({ scenePath: filename, scene }, null, 2),
      );

      return {
        content: [{ type: "text", text: JSON.stringify({ snapshotId, scenePath: filename }) }],
      };
    },
  );

  server.tool(
    "restore_snapshot",
    "Restore a scene to a previously saved snapshot",
    {
      snapshotId: z.string().describe("Snapshot ID to restore"),
    },
    async ({ snapshotId }) => {
      const snapshotsDir = join(fileIO.assetsDir, "..", "agent", "snapshots");
      const snapshotPath = join(snapshotsDir, `${snapshotId}.json`);

      try {
        const data = await readFile(snapshotPath, "utf8");
        const parsed = JSON.parse(data) as { scenePath?: string; scene?: unknown } & Record<string, unknown>;
        // Support both new envelope { scenePath, scene } and legacy raw scene JSON
        const scene = (parsed.scene ?? parsed) as { id?: string };
        const filename = fileIO.resolveScenePath(
          parsed.scenePath ?? (typeof scene.id === "string" ? scene.id : "main.scene.json"),
        );
        await fileIO.writeScene(filename, scene as Parameters<typeof fileIO.writeScene>[1]);

        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, restored: snapshotId, scenePath: filename }) }],
        };
      } catch {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Snapshot not found: ${snapshotId}` }) }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "diff_scene_versions",
    "Show the differences between two scene snapshots",
    {
      from: z.string().describe("Source snapshot ID"),
      to: z.string().optional().describe("Target snapshot ID (defaults to 'current')"),
    },
    async ({ from, to }) => {
      const snapshotsDir = join(fileIO.assetsDir, "..", "agent", "snapshots");

      let fromScene;
      try {
        fromScene = unwrapSnapshot(JSON.parse(await readFile(join(snapshotsDir, `${from}.json`), "utf8")));
      } catch {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Snapshot not found: ${from}` }) }],
          isError: true,
        };
      }

      let toScene;
      if (to) {
        try {
          toScene = unwrapSnapshot(JSON.parse(await readFile(join(snapshotsDir, `${to}.json`), "utf8")));
        } catch {
          return {
            content: [{ type: "text", text: JSON.stringify({ error: `Snapshot not found: ${to}` }) }],
            isError: true,
          };
        }
      } else {
        const filename = fileIO.resolveScenePath((fromScene as { id?: string }).id ?? "main.scene.json");
        toScene = await fileIO.readScene(filename);
      }

      const patches = computeDiff(fromScene, toScene);
      return {
        content: [{ type: "text", text: JSON.stringify({ from, to: to ?? "current", patches }, null, 2) }],
      };
    },
  );
}

function unwrapSnapshot(parsed: unknown): unknown {
  if (parsed && typeof parsed === "object" && "scene" in (parsed as object)) {
    return (parsed as { scene: unknown }).scene;
  }
  return parsed;
}

function computeDiff(a: unknown, b: unknown, path = ""): Array<{ op: string; path: string; value?: unknown }> {
  const patches: Array<{ op: string; path: string; value?: unknown }> = [];

  if (a === b) return patches;
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
    patches.push({ op: "replace", path, value: b });
    return patches;
  }

  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) {
    patches.push({ op: "replace", path, value: b });
    return patches;
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const allKeys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);

  for (const key of allKeys) {
    const childPath = path ? `${path}/${key}` : `/${key}`;
    if (!(key in aObj)) {
      patches.push({ op: "add", path: childPath, value: bObj[key] });
    } else if (!(key in bObj)) {
      patches.push({ op: "remove", path: childPath });
    } else {
      patches.push(...computeDiff(aObj[key], bObj[key], childPath));
    }
  }

  return patches;
}
