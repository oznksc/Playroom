import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createEmptyScene, createProject, projectToJson, sceneToJson } from "@gamekit/schema";
import { createMcpServer } from "../src/server.js";

describe("MCP Save Tools", () => {
  let root: string;
  let server: ReturnType<typeof createMcpServer>;

  beforeEach(async () => {
    root = join(tmpdir(), `gamekit-mcp-save-${randomUUID()}`);
    await mkdir(join(root, "gamekit", "scenes"), { recursive: true });
    await mkdir(join(root, "gamekit", "assets"), { recursive: true });
    await writeFile(
      join(root, "gamekit", "project.json"),
      projectToJson(createProject("Save Test Game"))
    );
    await writeFile(
      join(root, "gamekit", "scenes", "main.scene.json"),
      sceneToJson(createEmptyScene("Main"))
    );
    server = createMcpServer(root);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  function tool(name: string) {
    return (server as any)._registeredTools[name];
  }

  it("lists, sets, gets, and deletes save slots via MCP tools", async () => {
    // 1. List saves (empty initially)
    const listInitial = await tool("list_saves").handler({});
    const initialSlots = JSON.parse(listInitial.content[0].text);
    expect(initialSlots.slots).toEqual([]);

    // 2. Set save
    const saveResult = await tool("set_save").handler({
      slot: "slot1",
      data: { score: 1000, level: 3, playerName: "Hero" },
    });
    const saveParsed = JSON.parse(saveResult.content[0].text);
    expect(saveParsed.success).toBe(true);
    expect(saveParsed.slot).toBe("slot1");

    // 3. Get save
    const getResult = await tool("get_save").handler({ slot: "slot1" });
    const getParsed = JSON.parse(getResult.content[0].text);
    expect(getParsed.slot).toBe("slot1");
    expect(getParsed.data.score).toBe(1000);
    expect(getParsed.data.level).toBe(3);

    // 4. List saves (now contains slot1)
    const listAfter = await tool("list_saves").handler({});
    const afterSlots = JSON.parse(listAfter.content[0].text);
    expect(afterSlots.slots).toContain("slot1");

    // 5. Delete save
    const delResult = await tool("delete_save").handler({ slot: "slot1" });
    const delParsed = JSON.parse(delResult.content[0].text);
    expect(delParsed.success).toBe(true);
    expect(delParsed.deletedSlot).toBe("slot1");
  });
});
