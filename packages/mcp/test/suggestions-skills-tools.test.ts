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
  root = join(tmpdir(), `gamekit-mcp-skills-${randomUUID()}`);
  await mkdir(join(root, "gamekit", "scenes"), { recursive: true });
  await mkdir(join(root, "gamekit", "assets"), { recursive: true });
  await writeFile(join(root, "gamekit", "project.json"), projectToJson(createProject("Skills Test")));
  await writeFile(join(root, "gamekit", "scenes", "main.scene.json"), sceneToJson(createEmptyScene("Main")));
  server = createMcpServer(root);
});

afterEach(async () => rm(root, { recursive: true, force: true }));

function tool(name: string) {
  return (server as any)._registeredTools[name];
}

describe("suggestion and skill tool handlers", () => {
  it("returns role-specific component suggestions", async () => {
    const result = await tool("suggest_components").handler({ role: "player" });
    const payload = JSON.parse(result.content[0].text);
    expect(payload.role).toBe("player");
    expect(payload.components.map((component: { type: string }) => component.type)).toContain("PlayerController");
    expect(payload.components.map((component: { type: string }) => component.type)).toContain("CameraFollow");
  });

  it("lists skills and rejects an unknown skill without writing a scene", async () => {
    const listed = await tool("list_skills").handler({});
    expect(JSON.parse(listed.content[0].text).length).toBeGreaterThan(0);
    const missing = await tool("apply_skill").handler({ skillName: "does-not-exist" });
    expect(missing.isError).toBe(true);
    expect(missing.content[0].text).toContain("Skill not found");
  });
});
