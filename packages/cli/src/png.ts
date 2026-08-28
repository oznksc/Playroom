import { deflateSync, inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, Buffer.from(data), crcBuf]);
}

export type DecodedPng = {
  width: number;
  height: number;
  /** Tight RGBA8888, length = width * height * 4. */
  data: Uint8Array;
};

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilter(inflated: Uint8Array, width: number, height: number, bpp: number): Uint8Array {
  const stride = width * bpp;
  const out = new Uint8Array(height * stride);
  let src = 0;
  for (let y = 0; y < height; y++) {
    const filter = inflated[src++];
    const destRow = y * stride;
    if (filter === undefined) {
      throw new Error("Truncated PNG scanline");
    }
    for (let x = 0; x < stride; x++) {
      const raw = inflated[src++] ?? 0;
      const a = x >= bpp ? out[destRow + x - bpp]! : 0;
      const b = y > 0 ? out[destRow - stride + x]! : 0;
      const c = y > 0 && x >= bpp ? out[destRow - stride + x - bpp]! : 0;
      let recon: number;
      switch (filter) {
        case 0:
          recon = raw;
          break;
        case 1:
          recon = (raw + a) & 0xff;
          break;
        case 2:
          recon = (raw + b) & 0xff;
          break;
        case 3:
          recon = (raw + Math.floor((a + b) / 2)) & 0xff;
          break;
        case 4:
          recon = (raw + paethPredictor(a, b, c)) & 0xff;
          break;
        default:
          throw new Error(`Unsupported PNG filter type ${filter}`);
      }
      out[destRow + x] = recon;
    }
  }
  return out;
}

function toRgba(
  raw: Uint8Array,
  width: number,
  height: number,
  colorType: number,
  palette?: Uint8Array,
  transparency?: Uint8Array
): Uint8Array {
  const rgba = new Uint8Array(width * height * 4);
  const pixels = width * height;
  if (colorType === 6) {
    rgba.set(raw.subarray(0, pixels * 4));
    return rgba;
  }
  if (colorType === 2) {
    for (let i = 0; i < pixels; i++) {
      rgba[i * 4] = raw[i * 3] ?? 0;
      rgba[i * 4 + 1] = raw[i * 3 + 1] ?? 0;
      rgba[i * 4 + 2] = raw[i * 3 + 2] ?? 0;
      rgba[i * 4 + 3] = 255;
    }
    return rgba;
  }
  if (colorType === 0) {
    for (let i = 0; i < pixels; i++) {
      const g = raw[i] ?? 0;
      rgba[i * 4] = g;
      rgba[i * 4 + 1] = g;
      rgba[i * 4 + 2] = g;
      rgba[i * 4 + 3] = 255;
    }
    return rgba;
  }
  if (colorType === 4) {
    for (let i = 0; i < pixels; i++) {
      const g = raw[i * 2] ?? 0;
      rgba[i * 4] = g;
      rgba[i * 4 + 1] = g;
      rgba[i * 4 + 2] = g;
      rgba[i * 4 + 3] = raw[i * 2 + 1] ?? 0;
    }
    return rgba;
  }
  if (colorType === 3) {
    if (!palette) throw new Error("Indexed PNG is missing a PLTE chunk");
    for (let i = 0; i < pixels; i++) {
      const index = raw[i] ?? 0;
      rgba[i * 4] = palette[index * 3] ?? 0;
      rgba[i * 4 + 1] = palette[index * 3 + 1] ?? 0;
      rgba[i * 4 + 2] = palette[index * 3 + 2] ?? 0;
      rgba[i * 4 + 3] = transparency?.[index] ?? 255;
    }
    return rgba;
  }
  throw new Error(`Unsupported PNG color type ${colorType}`);
}

/**
 * Decode an 8-bit PNG into tight RGBA8888. Interlaced images are rejected.
 */
export function decodePng(bytes: Buffer | Uint8Array): DecodedPng {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("Not a PNG file");
  }

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat: Buffer[] = [];
  let palette: Uint8Array | undefined;
  let transparency: Uint8Array | undefined;
  let offset = 8;

  while (offset + 12 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buf.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (offset > buf.length) throw new Error("Truncated PNG chunk");

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8] ?? 0;
      colorType = data[9] ?? 0;
      interlace = data[12] ?? 0;
    } else if (type === "PLTE") {
      palette = new Uint8Array(data);
    } else if (type === "tRNS") {
      transparency = new Uint8Array(data);
    } else if (type === "IDAT") {
      idat.push(Buffer.from(data));
    } else if (type === "IEND") {
      break;
    }
  }

  if (width < 1 || height < 1) throw new Error("PNG IHDR is missing or empty");
  if (bitDepth !== 8) throw new Error(`Only 8-bit PNG is supported (got ${bitDepth})`);
  if (interlace !== 0) throw new Error("Interlaced PNG is not supported");
  if (idat.length === 0) throw new Error("PNG has no IDAT");

  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : 1;
  const inflated = inflateSync(Buffer.concat(idat));
  const raw = unfilter(inflated, width, height, bpp);
  return { width, height, data: toRgba(raw, width, height, colorType, palette, transparency) };
}

/**
 * Encode tight RGBA8888 into a PNG (filter 0 / None, non-interlaced).
 */
export function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  if (width < 1 || height < 1) throw new Error("PNG dimensions must be positive");
  if (rgba.length < width * height * 4) {
    throw new Error("RGBA buffer is smaller than width*height*4");
  }

  const stride = width * 4;
  const filtered = Buffer.alloc(height * (1 + stride));
  for (let y = 0; y < height; y++) {
    const dest = y * (1 + stride);
    filtered[dest] = 0;
    const src = y * stride;
    filtered.set(rgba.subarray(src, src + stride), dest + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(filtered)),
    chunk("IEND", new Uint8Array(0)),
  ]);
}

export function isPng(bytes: Buffer | Uint8Array): boolean {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE);
}
