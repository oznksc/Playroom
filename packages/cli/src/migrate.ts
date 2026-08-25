import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  detectSchemaVersion,
  listMigrationPath,
  listSchemaMigrations,
  migrateDocument,
  type SchemaDocumentKind,
} from "@gamekit/schema";
import { getGameKitRoot } from "./project.js";

export type MigrateFileResult = {
  path: string;
  kind: SchemaDocumentKind;
  detectedVersion: number;
  from: number;
  to: number;
  status: "migrated" | "skipped" | "error";
  applied: string[];
  valid: boolean;
  errors: string[];
  message?: string;
};

export type MigrateProjectResult = {
  from: number;
  to: number;
  dryRun: boolean;
  files: MigrateFileResult[];
  migrated: number;
  skipped: number;
  errors: number;
};

export type MigrateProjectOptions = {
  dryRun?: boolean;
  /** Apply the chain even when a file's detected version does not match `from`. */
  force?: boolean;
};

function prettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function listDocumentFiles(
  gamekitRoot: string,
): Promise<Array<{ path: string; kind: SchemaDocumentKind; rel: string }>> {
  const files: Array<{ path: string; kind: SchemaDocumentKind; rel: string }> = [
    { path: join(gamekitRoot, "project.json"), kind: "project", rel: "gamekit/project.json" },
  ];

  try {
    const sceneFiles = (await readdir(join(gamekitRoot, "scenes"))).filter((f) =>
      f.endsWith(".scene.json"),
    );
    for (const file of sceneFiles.sort()) {
      files.push({
        path: join(gamekitRoot, "scenes", file),
        kind: "scene",
        rel: `gamekit/scenes/${file}`,
      });
    }
  } catch {
    // scenes dir may be missing; doctor will flag that separately
  }

  try {
    const prefabFiles = (await readdir(join(gamekitRoot, "prefabs"))).filter((f) =>
      f.endsWith(".prefab.json"),
    );
    for (const file of prefabFiles.sort()) {
      files.push({
        path: join(gamekitRoot, "prefabs", file),
        kind: "prefab",
        rel: `gamekit/prefabs/${file}`,
      });
    }
  } catch {
    // prefabs dir is optional
  }

  return files;
}

/**
 * Upgrade every project / scene / prefab JSON under `gamekit/` from schema
 * version `from` to `to` using the registered `@gamekit/schema` migration chain.
 */
export async function migrateProject(
  root: string,
  from: number,
  to: number,
  options: MigrateProjectOptions = {},
): Promise<MigrateProjectResult> {
  // Validate the path up front so a missing step fails before any writes.
  listMigrationPath(from, to);

  const gamekitRoot = getGameKitRoot(root);
  const dryRun = options.dryRun === true;
  const force = options.force === true;
  const files: MigrateFileResult[] = [];

  for (const entry of await listDocumentFiles(gamekitRoot)) {
    let rawText: string;
    try {
      rawText = await readFile(entry.path, "utf8");
    } catch (error) {
      if (entry.kind === "project") {
        throw new Error(
          `gamekit/project.json not found. Run \`gamekit init\` first.` +
            (error instanceof Error ? ` (${error.message})` : ""),
        );
      }
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText) as unknown;
    } catch (error) {
      files.push({
        path: relative(root, entry.path) || entry.rel,
        kind: entry.kind,
        detectedVersion: 0,
        from,
        to,
        status: "error",
        applied: [],
        valid: false,
        errors: [error instanceof Error ? error.message : "Failed to parse JSON"],
        message: "Invalid JSON",
      });
      continue;
    }

    const detected = detectSchemaVersion(parsed);
    const rel = relative(root, entry.path) || entry.rel;

    if (detected === to && from !== to && !force) {
      files.push({
        path: rel,
        kind: entry.kind,
        detectedVersion: detected,
        from,
        to,
        status: "skipped",
        applied: [],
        valid: true,
        errors: [],
        message: `Already at schemaVersion ${to}`,
      });
      continue;
    }

    if (detected !== from && !force) {
      files.push({
        path: rel,
        kind: entry.kind,
        detectedVersion: detected,
        from,
        to,
        status: "skipped",
        applied: [],
        valid: true,
        errors: [],
        message: `Detected schemaVersion ${detected} (expected ${from}); pass --force to migrate anyway`,
      });
      continue;
    }

    const start = force ? detected : from;
    let result;
    try {
      result = migrateDocument(parsed, start, to, entry.kind);
    } catch (error) {
      files.push({
        path: rel,
        kind: entry.kind,
        detectedVersion: detected,
        from: start,
        to,
        status: "error",
        applied: [],
        valid: false,
        errors: [error instanceof Error ? error.message : "Migration failed"],
      });
      continue;
    }

    if (!dryRun) {
      await mkdir(join(entry.path, ".."), { recursive: true });
      await writeFile(entry.path, prettyJson(result.value));
    }

    files.push({
      path: rel,
      kind: entry.kind,
      detectedVersion: detected,
      from: start,
      to,
      status: "migrated",
      applied: result.applied,
      valid: result.valid,
      errors: result.errors,
      message: result.valid
        ? dryRun
          ? "Would write migrated JSON"
          : "Wrote migrated JSON"
        : "Migrated but document is still invalid",
    });
  }

  return {
    from,
    to,
    dryRun,
    files,
    migrated: files.filter((f) => f.status === "migrated").length,
    skipped: files.filter((f) => f.status === "skipped").length,
    errors: files.filter((f) => f.status === "error" || (f.status === "migrated" && !f.valid)).length,
  };
}

export { listSchemaMigrations, listMigrationPath };
