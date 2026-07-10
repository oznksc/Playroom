import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createEmptyScene, createProject, projectToJson, sceneToJson } from "@gamekit/schema";
import { runDoctor } from "../src/doctor.js";

let root: string;

beforeEach(async () => {
  root = join(tmpdir(), `playroom-doctor-${randomUUID()}`);
  const gk = join(root, "gamekit");
  await mkdir(join(gk, "scenes"), { recursive: true });
  await mkdir(join(gk, "assets"), { recursive: true });
  const project = createProject("Doctor");
  await writeFile(join(gk, "project.json"), projectToJson(project));
  await writeFile(join(gk, "scenes", "main.scene.json"), sceneToJson(createEmptyScene("Main")));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("runDoctor", () => {
  it("passes a minimal valid project", async () => {
    const report = await runDoctor(root);
    expect(report.ok).toBe(true);
    expect(report.summary.errors).toBe(0);
    expect(report.summary.scenes).toBe(1);
  });

  it("flags missing asset files", async () => {
    const project = createProject("Doctor");
    project.assets.push({ id: "missing-sprite", file: "nope.png", kind: "image" });
    await writeFile(join(root, "gamekit", "project.json"), projectToJson(project));

    const report = await runDoctor(root);
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.code === "ASSET_FILE_MISSING")).toBe(true);
  });
});
