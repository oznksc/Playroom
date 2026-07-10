import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm, readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createEmptyScene, createProject, projectToJson, sceneToJson } from "@gamekit/schema";
import { buildProject } from "../src/build.js";

let root: string;

beforeEach(async () => {
  root = join(tmpdir(), `playroom-build-${randomUUID()}`);
  const gk = join(root, "gamekit");
  await mkdir(join(gk, "scenes"), { recursive: true });
  await mkdir(join(gk, "assets"), { recursive: true });
  await mkdir(join(gk, "generated"), { recursive: true });
  await writeFile(join(gk, "project.json"), projectToJson(createProject("BuildTest")));
  await writeFile(join(gk, "scenes", "main.scene.json"), sceneToJson(createEmptyScene("Main")));
  await writeFile(join(gk, "generated", "assets.ts"), "export const gamekitAssets = {} as const;\n");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("buildProject", () => {
  it("packs minified gamekit output with manifest", async () => {
    const outDir = join(root, "dist-gamekit");
    const result = await buildProject(root, { outDir, platform: "mobile", skipDoctor: false });
    expect(result.scenes).toContain("main.scene.json");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);

    await access(join(outDir, "project.json"));
    await access(join(outDir, "scenes", "main.scene.json"));
    await access(join(outDir, "build-manifest.json"));

    const manifest = JSON.parse(await readFile(join(outDir, "build-manifest.json"), "utf8"));
    expect(manifest.platform).toBe("mobile");
    expect(manifest.scenes).toContain("main.scene.json");

    // compact JSON (no pretty indent for scene)
    const sceneRaw = await readFile(join(outDir, "scenes", "main.scene.json"), "utf8");
    expect(sceneRaw.includes("\n  ")).toBe(false);
  });
});
