import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import {
  createEmptyScene,
  createProject,
  projectToJson,
  sceneToJson,
} from "@gamekit/schema";
import { encodePng, decodePng } from "../src/png.js";
import { packRects, packBuildAssets, packAudioBank, packTextureAtlas } from "../src/packer.js";
import { buildProject } from "../src/build.js";

function solidPng(width: number, height: number, rgba: [number, number, number, number]): Buffer {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = rgba[0];
    data[i * 4 + 1] = rgba[1];
    data[i * 4 + 2] = rgba[2];
    data[i * 4 + 3] = rgba[3];
  }
  return encodePng(width, height, data);
}

describe("png codec", () => {
  it("round-trips RGBA pixels", () => {
    const src = solidPng(3, 2, [10, 20, 30, 40]);
    const decoded = decodePng(src);
    expect(decoded.width).toBe(3);
    expect(decoded.height).toBe(2);
    expect([...decoded.data.subarray(0, 4)]).toEqual([10, 20, 30, 40]);
  });
});

describe("packRects", () => {
  it("places two sprites without overlap", () => {
    const packed = packRects(
      [
        { id: "a", width: 4, height: 4 },
        { id: "b", width: 8, height: 4 },
      ],
      1,
      64,
    );
    expect(packed.overflow).toEqual([]);
    expect(packed.placements).toHaveLength(2);
    const a = packed.placements.find((p) => p.id === "a")!;
    const b = packed.placements.find((p) => p.id === "b")!;
    const overlap =
      a.x < b.x + 8 && a.x + 4 > b.x && a.y < b.y + 4 && a.y + 4 > b.y;
    expect(overlap).toBe(false);
  });
});

describe("asset packer", () => {
  let root: string;

  beforeEach(async () => {
    root = join(tmpdir(), `playroom-packer-${randomUUID()}`);
    const gk = join(root, "gamekit");
    await mkdir(join(gk, "scenes"), { recursive: true });
    await mkdir(join(gk, "assets"), { recursive: true });
    await mkdir(join(gk, "generated"), { recursive: true });

    const project = createProject("Packer");
    project.assets = [
      { id: "red", file: "red.png", kind: "image" },
      { id: "blue", file: "blue.png", kind: "image" },
      { id: "icon", file: "icon.svg", kind: "image" },
      { id: "jump", file: "jump.wav", kind: "audio" },
      { id: "hit", file: "hit.mp3", kind: "audio" },
    ];
    await writeFile(join(gk, "project.json"), projectToJson(project));
    await writeFile(join(gk, "scenes", "main.scene.json"), sceneToJson(createEmptyScene("Main")));
    await writeFile(join(gk, "generated", "assets.ts"), "export const gamekitAssets = {} as const;\n");
    await writeFile(join(gk, "assets", "red.png"), solidPng(4, 4, [255, 0, 0, 255]));
    await writeFile(join(gk, "assets", "blue.png"), solidPng(8, 4, [0, 0, 255, 255]));
    await writeFile(join(gk, "assets", "icon.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"/>");
    await writeFile(join(gk, "assets", "jump.wav"), Buffer.from("JUMP-AUDIO"));
    await writeFile(join(gk, "assets", "hit.mp3"), Buffer.from("HIT-AUDIO-BYTES"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("packs PNG frames into an atlas and concatenates audio", async () => {
    const assetsRoot = join(root, "gamekit", "assets");
    const project = JSON.parse(await readFile(join(root, "gamekit", "project.json"), "utf8"));
    const atlas = await packTextureAtlas(assetsRoot, project.assets);
    expect(atlas.png).not.toBeNull();
    expect(Object.keys(atlas.json.frames).sort()).toEqual(["blue", "red"]);
    expect(atlas.json.skipped.some((s) => s.id === "icon" && s.reason === "vector")).toBe(true);

    const decoded = decodePng(atlas.png!);
    const red = atlas.json.frames.red.frame;
    const blue = atlas.json.frames.blue.frame;
    const redPx = decoded.data.subarray((red.y * decoded.width + red.x) * 4, (red.y * decoded.width + red.x) * 4 + 4);
    const bluePx = decoded.data.subarray((blue.y * decoded.width + blue.x) * 4, (blue.y * decoded.width + blue.x) * 4 + 4);
    expect([...redPx]).toEqual([255, 0, 0, 255]);
    expect([...bluePx]).toEqual([0, 0, 255, 255]);

    const audio = await packAudioBank(assetsRoot, project.assets);
    expect(audio.bank).not.toBeNull();
    expect(Object.keys(audio.json.clips).sort()).toEqual(["hit", "jump"]);
    const jump = audio.json.clips.jump;
    expect(audio.bank!.subarray(jump.offset, jump.offset + jump.length).toString()).toBe("JUMP-AUDIO");
  });

  it("writes packed artifacts from buildProject", async () => {
    const outDir = join(root, "dist-gamekit");
    const result = await buildProject(root, { outDir, platform: "web", skipDoctor: true });
    expect(result.packed?.atlas?.frames).toBe(2);
    expect(result.packed?.audioBank?.clips).toBe(2);
    await readFile(join(outDir, "packed", "atlas.png"));
    const manifest = JSON.parse(await readFile(join(outDir, "build-manifest.json"), "utf8"));
    expect(manifest.packed.atlas.frames).toBe(2);
    expect(manifest.packed.audioBank.clips).toBe(2);
  });

  it("skips packing when pack: false", async () => {
    const outDir = join(root, "dist-nopack");
    const result = await buildProject(root, { outDir, platform: "web", skipDoctor: true, pack: false });
    expect(result.packed).toBeNull();
  });

  it("packBuildAssets writes both artifact kinds", async () => {
    const outDir = join(root, "packed-out");
    const project = JSON.parse(await readFile(join(root, "gamekit", "project.json"), "utf8"));
    const packed = await packBuildAssets(join(root, "gamekit", "assets"), outDir, project.assets);
    expect(packed.atlas?.frames).toBe(2);
    expect(packed.audioBank?.clips).toBe(2);
  });
});
