import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { GameKitAsset } from "@gamekit/schema";
import { decodePng, encodePng, isPng } from "./png.js";

export const ATLAS_IMAGE = "atlas.png";
export const ATLAS_JSON = "atlas.json";
export const AUDIO_BANK = "audio.bank";
export const AUDIO_BANK_JSON = "audio-bank.json";
export const PACKED_DIR = "packed";

const DEFAULT_PADDING = 1;
const DEFAULT_MAX_SIZE = 4096;

export type AtlasFrame = {
  frame: { x: number; y: number; w: number; h: number };
  rotated: false;
  trimmed: false;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
};

export type AtlasJson = {
  frames: Record<string, AtlasFrame>;
  meta: {
    app: string;
    version: string;
    image: string;
    format: "RGBA8888";
    size: { w: number; h: number };
    scale: "1";
    padding: number;
  };
  skipped: Array<{ id: string; file: string; reason: string }>;
};

export type AudioBankClip = {
  offset: number;
  length: number;
  mime: string;
  file: string;
};

export type AudioBankJson = {
  format: "gamekit-audio-bank/1";
  bank: string;
  byteLength: number;
  clips: Record<string, AudioBankClip>;
  skipped: Array<{ id: string; file: string; reason: string }>;
};

export type PackerResult = {
  atlas: {
    image: string;
    json: string;
    width: number;
    height: number;
    frames: number;
    skipped: Array<{ id: string; file: string; reason: string }>;
  } | null;
  audioBank: {
    bank: string;
    json: string;
    clips: number;
    byteLength: number;
    skipped: Array<{ id: string; file: string; reason: string }>;
  } | null;
};

type SizedSprite = {
  id: string;
  file: string;
  width: number;
  height: number;
  data: Uint8Array;
};

type PlacedSprite = SizedSprite & { x: number; y: number };

function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  return 2 ** Math.ceil(Math.log2(n));
}

function mimeForAudio(file: string): string {
  switch (extname(file).toLowerCase()) {
    case ".mp3":
      return "audio/mpeg";
    case ".ogg":
      return "audio/ogg";
    case ".wav":
      return "audio/wav";
    default:
      return "application/octet-stream";
  }
}

/**
 * Shelf bin-packer. Sprites are sorted tallest-first; each is placed on the
 * first shelf with remaining width, otherwise a new shelf is opened.
 */
export function packRects(
  rects: Array<{ id: string; width: number; height: number }>,
  padding: number,
  maxSize: number,
): { placements: Array<{ id: string; x: number; y: number }>; width: number; height: number; overflow: string[] } {
  const sorted = [...rects].sort((a, b) => b.height - a.height || b.width - a.width);
  type Shelf = { y: number; height: number; x: number };
  const shelves: Shelf[] = [];
  const placements: Array<{ id: string; x: number; y: number }> = [];
  const overflow: string[] = [];
  let packedWidth = 0;
  let packedHeight = 0;

  for (const rect of sorted) {
    const w = rect.width + padding;
    const h = rect.height + padding;
    if (rect.width > maxSize || rect.height > maxSize) {
      overflow.push(rect.id);
      continue;
    }

    let placed: { x: number; y: number } | null = null;
    for (const shelf of shelves) {
      if (rect.height <= shelf.height && shelf.x + w <= maxSize) {
        placed = { x: shelf.x, y: shelf.y };
        shelf.x += w;
        packedWidth = Math.max(packedWidth, placed.x + rect.width);
        packedHeight = Math.max(packedHeight, placed.y + rect.height);
        break;
      }
    }

    if (!placed) {
      const y = packedHeight === 0 ? 0 : packedHeight + padding;
      if (y + rect.height > maxSize) {
        overflow.push(rect.id);
        continue;
      }
      shelves.push({ y, height: rect.height, x: w });
      placed = { x: 0, y };
      packedWidth = Math.max(packedWidth, rect.width);
      packedHeight = Math.max(packedHeight, y + rect.height);
    }

    placements.push({ id: rect.id, x: placed.x, y: placed.y });
  }

  const width = Math.min(maxSize, nextPowerOfTwo(Math.max(1, packedWidth)));
  const height = Math.min(maxSize, nextPowerOfTwo(Math.max(1, packedHeight)));
  return { placements, width, height, overflow };
}

function blit(
  dest: Uint8Array,
  destWidth: number,
  src: Uint8Array,
  srcWidth: number,
  srcHeight: number,
  x: number,
  y: number,
): void {
  for (let row = 0; row < srcHeight; row++) {
    const srcStart = row * srcWidth * 4;
    const destStart = ((y + row) * destWidth + x) * 4;
    dest.set(src.subarray(srcStart, srcStart + srcWidth * 4), destStart);
  }
}

export async function packTextureAtlas(
  assetsRoot: string,
  assets: GameKitAsset[],
  options: { padding?: number; maxSize?: number } = {},
): Promise<{
  png: Buffer | null;
  json: AtlasJson;
  width: number;
  height: number;
}> {
  const padding = options.padding ?? DEFAULT_PADDING;
  const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
  const skipped: AtlasJson["skipped"] = [];
  const sprites: SizedSprite[] = [];

  for (const asset of assets.filter((a) => a.kind === "image")) {
    const ext = extname(asset.file).toLowerCase();
    if (ext === ".svg") {
      skipped.push({ id: asset.id, file: asset.file, reason: "vector" });
      continue;
    }
    if (ext !== ".png") {
      skipped.push({ id: asset.id, file: asset.file, reason: "unsupported-format" });
      continue;
    }

    let bytes: Buffer;
    try {
      bytes = await readFile(join(assetsRoot, asset.file));
    } catch {
      skipped.push({ id: asset.id, file: asset.file, reason: "missing" });
      continue;
    }
    if (!isPng(bytes)) {
      skipped.push({ id: asset.id, file: asset.file, reason: "not-png" });
      continue;
    }
    try {
      const decoded = decodePng(bytes);
      sprites.push({
        id: asset.id,
        file: asset.file,
        width: decoded.width,
        height: decoded.height,
        data: decoded.data,
      });
    } catch (error) {
      skipped.push({
        id: asset.id,
        file: asset.file,
        reason: error instanceof Error ? `decode-failed: ${error.message}` : "decode-failed",
      });
    }
  }

  if (sprites.length === 0) {
    return {
      png: null,
      json: {
        frames: {},
        meta: {
          app: "gamekit",
          version: "1",
          image: ATLAS_IMAGE,
          format: "RGBA8888",
          size: { w: 0, h: 0 },
          scale: "1",
          padding,
        },
        skipped,
      },
      width: 0,
      height: 0,
    };
  }

  const packed = packRects(
    sprites.map((s) => ({ id: s.id, width: s.width, height: s.height })),
    padding,
    maxSize,
  );
  const byId = new Map(sprites.map((s) => [s.id, s]));
  for (const id of packed.overflow) {
    const sprite = byId.get(id);
    skipped.push({
      id,
      file: sprite?.file ?? id,
      reason: "atlas-full",
    });
  }

  const placed: PlacedSprite[] = [];
  for (const placement of packed.placements) {
    const sprite = byId.get(placement.id);
    if (!sprite) continue;
    placed.push({ ...sprite, x: placement.x, y: placement.y });
  }

  const canvas = new Uint8Array(packed.width * packed.height * 4);
  const frames: Record<string, AtlasFrame> = {};
  for (const sprite of placed) {
    blit(canvas, packed.width, sprite.data, sprite.width, sprite.height, sprite.x, sprite.y);
    frames[sprite.id] = {
      frame: { x: sprite.x, y: sprite.y, w: sprite.width, h: sprite.height },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: sprite.width, h: sprite.height },
      sourceSize: { w: sprite.width, h: sprite.height },
    };
  }

  return {
    png: encodePng(packed.width, packed.height, canvas),
    json: {
      frames,
      meta: {
        app: "gamekit",
        version: "1",
        image: ATLAS_IMAGE,
        format: "RGBA8888",
        size: { w: packed.width, h: packed.height },
        scale: "1",
        padding,
      },
      skipped,
    },
    width: packed.width,
    height: packed.height,
  };
}

export async function packAudioBank(
  assetsRoot: string,
  assets: GameKitAsset[],
): Promise<{ bank: Buffer | null; json: AudioBankJson }> {
  const skipped: AudioBankJson["skipped"] = [];
  const clips: Record<string, AudioBankClip> = {};
  const chunks: Buffer[] = [];
  let offset = 0;
  const ALIGN = 16;

  for (const asset of assets.filter((a) => a.kind === "audio")) {
    let bytes: Buffer;
    try {
      bytes = await readFile(join(assetsRoot, asset.file));
    } catch {
      skipped.push({ id: asset.id, file: asset.file, reason: "missing" });
      continue;
    }
    const pad = (ALIGN - (bytes.length % ALIGN)) % ALIGN;
    clips[asset.id] = {
      offset,
      length: bytes.length,
      mime: mimeForAudio(asset.file),
      file: asset.file,
    };
    chunks.push(bytes);
    if (pad > 0) chunks.push(Buffer.alloc(pad));
    offset += bytes.length + pad;
  }

  if (chunks.length === 0) {
    return {
      bank: null,
      json: {
        format: "gamekit-audio-bank/1",
        bank: AUDIO_BANK,
        byteLength: 0,
        clips: {},
        skipped,
      },
    };
  }

  const bank = Buffer.concat(chunks);
  return {
    bank,
    json: {
      format: "gamekit-audio-bank/1",
      bank: AUDIO_BANK,
      byteLength: bank.length,
      clips,
      skipped,
    },
  };
}

/**
 * Write texture atlas + audio bank into `outDir/packed/`.
 * Original assets are left in place so existing runtimes keep working.
 */
export async function packBuildAssets(
  assetsRoot: string,
  outDir: string,
  assets: GameKitAsset[],
): Promise<PackerResult> {
  const packedDir = join(outDir, PACKED_DIR);
  await mkdir(packedDir, { recursive: true });

  const atlas = await packTextureAtlas(assetsRoot, assets);
  let atlasResult: PackerResult["atlas"] = null;
  if (atlas.png) {
    await writeFile(join(packedDir, ATLAS_IMAGE), atlas.png);
    await writeFile(join(packedDir, ATLAS_JSON), JSON.stringify(atlas.json, null, 2));
    atlasResult = {
      image: `${PACKED_DIR}/${ATLAS_IMAGE}`,
      json: `${PACKED_DIR}/${ATLAS_JSON}`,
      width: atlas.width,
      height: atlas.height,
      frames: Object.keys(atlas.json.frames).length,
      skipped: atlas.json.skipped,
    };
  } else if (atlas.json.skipped.length > 0) {
    await writeFile(join(packedDir, ATLAS_JSON), JSON.stringify(atlas.json, null, 2));
    atlasResult = {
      image: `${PACKED_DIR}/${ATLAS_IMAGE}`,
      json: `${PACKED_DIR}/${ATLAS_JSON}`,
      width: 0,
      height: 0,
      frames: 0,
      skipped: atlas.json.skipped,
    };
  }

  const audio = await packAudioBank(assetsRoot, assets);
  let audioResult: PackerResult["audioBank"] = null;
  if (audio.bank) {
    await writeFile(join(packedDir, AUDIO_BANK), audio.bank);
    await writeFile(join(packedDir, AUDIO_BANK_JSON), JSON.stringify(audio.json, null, 2));
    audioResult = {
      bank: `${PACKED_DIR}/${AUDIO_BANK}`,
      json: `${PACKED_DIR}/${AUDIO_BANK_JSON}`,
      clips: Object.keys(audio.json.clips).length,
      byteLength: audio.json.byteLength,
      skipped: audio.json.skipped,
    };
  } else if (audio.json.skipped.length > 0) {
    await writeFile(join(packedDir, AUDIO_BANK_JSON), JSON.stringify(audio.json, null, 2));
    audioResult = {
      bank: `${PACKED_DIR}/${AUDIO_BANK}`,
      json: `${PACKED_DIR}/${AUDIO_BANK_JSON}`,
      clips: 0,
      byteLength: 0,
      skipped: audio.json.skipped,
    };
  }

  return { atlas: atlasResult, audioBank: audioResult };
}
