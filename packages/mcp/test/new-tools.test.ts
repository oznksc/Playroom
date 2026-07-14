import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { createEmptyScene, createProject, projectToJson, sceneToJson } from "@gamekit/schema";
import { createMcpServer } from "../src/server.js";

let tmpDir: string;
let server: ReturnType<typeof createMcpServer>;

beforeEach(async () => {
  tmpDir = join(tmpdir(), `gamekit-mcp-newtools-test-${randomUUID()}`);
  const gkDir = join(tmpDir, "gamekit");
  const scenesDir = join(gkDir, "scenes");
  const assetsDir = join(gkDir, "assets");

  await mkdir(scenesDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });

  const project = createProject("Test Project");
  await writeFile(join(gkDir, "project.json"), projectToJson(project));

  const scene = createEmptyScene("Main");
  await writeFile(join(scenesDir, "main.scene.json"), sceneToJson(scene));

  server = createMcpServer(tmpDir);
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe("new validation and search tools", () => {
  it("validates a project successfully", async () => {
    // We can call registered tools via the server instance
    const tool = (server as any)._registeredTools.validate_project;
    const result = await tool.handler({});
    expect(result).toBeDefined();
    const content = JSON.parse(result.content[0].text);
    expect(content.ok).toBe(true);
  });

  it("validates a scene successfully", async () => {
    const tool = (server as any)._registeredTools.validate_scene;
    const result = await tool.handler({ path: "main.scene.json" });
    expect(result).toBeDefined();
    const content = JSON.parse(result.content[0].text);
    expect(content.ok).toBe(true);
  });

  it("searches the project using fallback text search if colgrep fails or has no match", async () => {
    // Write a dummy script file to search for
    const dummyScript = "console.log('GK_SECRET_PATTERN_MATCH');";
    await writeFile(join(tmpDir, "player.ts"), dummyScript);

    const tool = (server as any)._registeredTools.search_project;
    const result = await tool.handler({ query: "GK_SECRET_PATTERN" });
    expect(result).toBeDefined();
    expect(result.content[0].text).toContain("player.ts");
    expect(result.content[0].text).toContain("GK_SECRET_PATTERN_MATCH");
  });

  it("adds a Text component to an entity using add_text tool", async () => {
    const scene = createEmptyScene("Main");
    scene.entities.push({
      id: "label-1",
      name: "Label Entity",
      components: [
        {
          type: "Transform",
          position: { x: 50, y: 50 },
          rotation: 0,
          scale: { x: 1, y: 1 }
        }
      ]
    });
    const gkDir = join(tmpDir, "gamekit");
    const scenesDir = join(gkDir, "scenes");
    await writeFile(join(scenesDir, "main.scene.json"), sceneToJson(scene));

    const tool = (server as any)._registeredTools.add_text;
    const result = await tool.handler({
      scenePath: "main.scene.json",
      entityId: "label-1",
      text: {
        text: "Score: 100",
        fontAssetId: "custom-font",
        size: 24,
        color: "#ffffff",
        align: "center"
      }
    });

    expect(result).toBeDefined();
    const entity = JSON.parse(result.content[0].text);
    expect(entity.id).toBe("label-1");
    const textComp = entity.components.find((c: any) => c.type === "Text");
    expect(textComp).toBeDefined();
    expect(textComp.text).toBe("Score: 100");
    expect(textComp.fontAssetId).toBe("custom-font");
    expect(textComp.size).toBe(24);
    expect(textComp.color).toBe("#ffffff");
    expect(textComp.align).toBe("center");
  });

  it("adds an AudioSource component to an entity using add_audio_source tool", async () => {
    const scene = createEmptyScene("Main");
    scene.entities.push({
      id: "player-1",
      name: "Player Entity",
      components: [
        {
          type: "Transform",
          position: { x: 50, y: 50 },
          rotation: 0,
          scale: { x: 1, y: 1 }
        }
      ]
    });
    const gkDir = join(tmpDir, "gamekit");
    const scenesDir = join(gkDir, "scenes");
    await writeFile(join(scenesDir, "main.scene.json"), sceneToJson(scene));

    const tool = (server as any)._registeredTools.add_audio_source;
    const result = await tool.handler({
      scenePath: "main.scene.json",
      entityId: "player-1",
      audioSource: {
        assetId: "bg-music",
        volume: 0.8,
        loop: true,
        playOnStart: true
      }
    });

    expect(result).toBeDefined();
    const entity = JSON.parse(result.content[0].text);
    expect(entity.id).toBe("player-1");
    const audioComp = entity.components.find((c: any) => c.type === "AudioSource");
    expect(audioComp).toBeDefined();
    expect(audioComp.assetId).toBe("bg-music");
    expect(audioComp.volume).toBe(0.8);
    expect(audioComp.loop).toBe(true);
    expect(audioComp.playOnStart).toBe(true);
  });

  it("adds a ParticleSystem component to an entity using add_particle_system tool", async () => {
    const scene = createEmptyScene("Main");
    scene.entities.push({
      id: "emitter-1",
      name: "Emitter Entity",
      components: [
        {
          type: "Transform",
          position: { x: 50, y: 50 },
          rotation: 0,
          scale: { x: 1, y: 1 }
        }
      ]
    });
    const gkDir = join(tmpDir, "gamekit");
    const scenesDir = join(gkDir, "scenes");
    await writeFile(join(scenesDir, "main.scene.json"), sceneToJson(scene));

    const tool = (server as any)._registeredTools.add_particle_system;
    const result = await tool.handler({
      scenePath: "main.scene.json",
      entityId: "emitter-1",
      particleSystem: {
        maxParticles: 100,
        emissionRate: 20,
        lifetime: 1.5,
        speedStart: 100,
        speedEnd: 20,
        angleStart: 0,
        angleEnd: 360,
        sizeStart: 8,
        sizeEnd: 2,
        colorStart: "#ff0000",
        colorEnd: "#0000ff",
        blendMode: "add"
      }
    });

    expect(result).toBeDefined();
    const entity = JSON.parse(result.content[0].text);
    expect(entity.id).toBe("emitter-1");
    const particleComp = entity.components.find((c: any) => c.type === "ParticleSystem");
    expect(particleComp).toBeDefined();
    expect(particleComp.maxParticles).toBe(100);
    expect(particleComp.emissionRate).toBe(20);
    expect(particleComp.lifetime).toBe(1.5);
    expect(particleComp.speedStart).toBe(100);
    expect(particleComp.speedEnd).toBe(20);
    expect(particleComp.angleStart).toBe(0);
    expect(particleComp.angleEnd).toBe(360);
    expect(particleComp.sizeStart).toBe(8);
    expect(particleComp.sizeEnd).toBe(2);
    expect(particleComp.colorStart).toBe("#ff0000");
    expect(particleComp.colorEnd).toBe("#0000ff");
    expect(particleComp.blendMode).toBe("add");
  });

  it("adds a Light2D component to an entity using add_light tool", async () => {
    const scene = createEmptyScene("Main");
    scene.entities.push({
      id: "light-1",
      name: "Light Entity",
      components: [
        {
          type: "Transform",
          position: { x: 50, y: 50 },
          rotation: 0,
          scale: { x: 1, y: 1 }
        }
      ]
    });
    const gkDir = join(tmpDir, "gamekit");
    const scenesDir = join(gkDir, "scenes");
    await writeFile(join(scenesDir, "main.scene.json"), sceneToJson(scene));

    const tool = (server as any)._registeredTools.add_light;
    const result = await tool.handler({
      scenePath: "main.scene.json",
      entityId: "light-1",
      light: {
        kind: "spot",
        range: 300,
        intensity: 1.5,
        color: "#ffff00"
      }
    });

    expect(result).toBeDefined();
    const entity = JSON.parse(result.content[0].text);
    expect(entity.id).toBe("light-1");
    const lightComp = entity.components.find((c: any) => c.type === "Light2D");
    expect(lightComp).toBeDefined();
    expect(lightComp.kind).toBe("spot");
    expect(lightComp.range).toBe(300);
    expect(lightComp.intensity).toBe(1.5);
    expect(lightComp.color).toBe("#ffff00");
  });

  it("adds a NineSlice component to an entity using add_nine_slice tool", async () => {
    const scene = createEmptyScene("Main");
    scene.entities.push({
      id: "panel-1",
      name: "Panel Entity",
      components: [
        {
          type: "Transform",
          position: { x: 100, y: 100 },
          rotation: 0,
          scale: { x: 1, y: 1 }
        }
      ]
    });
    const gkDir = join(tmpDir, "gamekit");
    const scenesDir = join(gkDir, "scenes");
    await writeFile(join(scenesDir, "main.scene.json"), sceneToJson(scene));

    const tool = (server as any)._registeredTools.add_nine_slice;
    const result = await tool.handler({
      scenePath: "main.scene.json",
      entityId: "panel-1",
      nineSlice: {
        assetId: "ui-frame",
        width: 150,
        height: 120,
        leftWidth: 15,
        rightWidth: 15,
        topHeight: 15,
        bottomHeight: 15
      }
    });

    expect(result).toBeDefined();
    const entity = JSON.parse(result.content[0].text);
    expect(entity.id).toBe("panel-1");
    const nineSliceComp = entity.components.find((c: any) => c.type === "NineSlice");
    expect(nineSliceComp).toBeDefined();
    expect(nineSliceComp.assetId).toBe("ui-frame");
    expect(nineSliceComp.width).toBe(150);
    expect(nineSliceComp.height).toBe(120);
    expect(nineSliceComp.leftWidth).toBe(15);
    expect(nineSliceComp.rightWidth).toBe(15);
    expect(nineSliceComp.topHeight).toBe(15);
    expect(nineSliceComp.bottomHeight).toBe(15);
  });
});
