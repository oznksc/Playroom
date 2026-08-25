import { deflateSync } from "node:zlib";

/**
 * Encodes RGBA pixel array into a valid PNG image buffer.
 * Zero external dependencies (uses Node.js built-in zlib).
 */
export function encodePng(
  rgbaPixels: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number
): Buffer {
  // Build uncompressed scanlines with filter byte 0 (None) at the start of each row
  const rowBytes = width * 4;
  const rawScanlines = new Uint8Array(height * (rowBytes + 1));

  for (let y = 0; y < height; y++) {
    const rawOffset = y * (rowBytes + 1);
    rawScanlines[rawOffset] = 0; // Filter: None
    const pixelOffset = y * rowBytes;
    rawScanlines.set(rgbaPixels.subarray(pixelOffset, pixelOffset + rowBytes), rawOffset + 1);
  }

  // Compress IDAT payload using zlib deflate
  const compressedData = deflateSync(rawScanlines, { level: 6 });

  // 1. Signature (8 bytes)
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // 2. IHDR Chunk (13 bytes data)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bits per channel
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // Deflate compression
  ihdrData.writeUInt8(0, 11); // Standard filter
  ihdrData.writeUInt8(0, 12); // No interlace
  const ihdrChunk = createChunk("IHDR", ihdrData);

  // 3. IDAT Chunk
  const idatChunk = createChunk("IDAT", compressedData);

  // 4. IEND Chunk
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type: string, data: Uint8Array): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const dataBuf = Buffer.from(data);
  const length = dataBuf.length;

  const chunk = Buffer.alloc(8 + length + 4);
  chunk.writeUInt32BE(length, 0);
  typeBuf.copy(chunk, 4);
  dataBuf.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeUInt32BE(crc, 8 + length);

  return chunk;
}

// Precomputed CRC table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}
