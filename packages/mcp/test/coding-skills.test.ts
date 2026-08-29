import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createEmptyScene, createProject, projectToJson, sceneToJson } from "@gamekit/schema";
import { createMcpServer } from "../src/server.js";

let root: string;
let server: ReturnType<typeof createMcpServer>;

beforeEach(async () => {
  root = join(tmpdir(), `gamekit-mcp-coding-skills-${randomUUID()}`);
  await mkdir(join(root, "gamekit", "scenes"), { recursive: true });
  await mkdir(join(root, "gamekit", "assets"), { recursive: true });
  await writeFile(
    join(root, "gamekit", "project.json"),
    projectToJson(createProject("Coding Skills Test"))
  );
  await writeFile(
    join(root, "gamekit", "scenes", "main.scene.json"),
    sceneToJson(createEmptyScene("Main"))
  );
  server = createMcpServer(root);
});

afterEach(async () => rm(root, { recursive: true, force: true }));

function tool(name: string) {
  return (server as any)._registeredTools[name];
}

function prompt(name: string) {
  return (server as any)._registeredPrompts[name];
}

describe("MCP coding skills and libGDX integration", () => {
  it("lists all coding skills including libGDX", async () => {
    const result = await tool("list_coding_skills").handler({});
    const skills = JSON.parse(result.content[0].text);
    const ids = skills.map((s: { id: string }) => s.id);

    expect(ids).toContain("libgdx");
    expect(ids).toContain("libgdx-rendering");
    expect(ids).toContain("libgdx-physics");
    expect(ids).toContain("libgdx-gamekit");
    expect(ids).toContain("libgdx-kotlin");
    expect(ids).toContain("libgdx-kmp");
    expect(ids).toContain("phaser");
    expect(ids).toContain("shopify-skia");
  });

  it("filters coding skills by libgdx tag", async () => {
    const result = await tool("list_coding_skills").handler({ tag: "libgdx" });
    const skills = JSON.parse(result.content[0].text);
    const ids = skills.map((s: { id: string }) => s.id);

    expect(ids).toContain("libgdx");
    expect(ids).toContain("libgdx-rendering");
    expect(ids).toContain("libgdx-physics");
    expect(ids).toContain("libgdx-gamekit");
    expect(ids).toContain("libgdx-kotlin");
    expect(ids).toContain("libgdx-kmp");
    expect(ids).not.toContain("phaser");
  });

  it("retrieves full content of libGDX skills", async () => {
    const coreSkill = await tool("get_coding_skill").handler({ skillId: "libgdx" });
    const corePayload = JSON.parse(coreSkill.content[0].text);
    expect(corePayload.id).toBe("libgdx");
    expect(corePayload.content).toContain("ApplicationListener");
    expect(corePayload.content).toContain("FitViewport");

    const physicsSkill = await tool("get_coding_skill").handler({ skillId: "libgdx-physics" });
    const physicsPayload = JSON.parse(physicsSkill.content[0].text);
    expect(physicsPayload.id).toBe("libgdx-physics");
    expect(physicsPayload.content).toContain("Box2D");
    expect(physicsPayload.content).toContain("PPM");

    const gamekitSkill = await tool("get_coding_skill").handler({ skillId: "libgdx-gamekit" });
    const gamekitPayload = JSON.parse(gamekitSkill.content[0].text);
    expect(gamekitPayload.id).toBe("libgdx-gamekit");
    expect(gamekitPayload.content).toContain("ActionExecutor");
    expect(gamekitPayload.content).toContain("gamekit play --platform libgdx");
  });

  it("returns error for unknown coding skill", async () => {
    const result = await tool("get_coding_skill").handler({ skillId: "non-existent-skill" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Coding skill not found");
  });

  it("executes libgdx_guide prompt with aggregated guides", async () => {
    const promptHandler = prompt("libgdx_guide");
    expect(promptHandler).toBeDefined();

    const response = await promptHandler.callback();
    expect(response.messages).toHaveLength(1);
    const text = response.messages[0].content.text;

    expect(text).toContain("# libGDX Complete Guide");
    expect(text).toContain("## Core Architecture");
    expect(text).toContain("## Rendering & Graphics");
    expect(text).toContain("## Physics & Box2D");
    expect(text).toContain("## Playroom Java Runtime");
  });

  it("generates assets.json manifest for libGDX", async () => {
    const result = await tool("generate_assets_manifest").handler({ platform: "libgdx" });
    const payload = JSON.parse(result.content[0].text);
    expect(payload.success).toBe(true);
    expect(payload.platform).toBe("libgdx");
    expect(payload.path).toBe("gamekit/generated/assets.json");
  });

  it("exports project to libgdx target directory with runnable instructions", async () => {
    const result = await tool("export_project").handler({ platform: "libgdx" });
    const payload = JSON.parse(result.content[0].text);
    expect(payload.success).toBe(true);
    expect(payload.platform).toBe("libgdx");
    expect(payload.instructions).toContain("./gradlew lwjgl3:run");
  });
});
