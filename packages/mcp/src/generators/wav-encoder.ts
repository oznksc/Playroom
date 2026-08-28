/**
 * 16-bit PCM WAV audio encoder.
 * Pure TypeScript, zero external dependencies, works in Node.js and Browser.
 */

export type WavEncodeOptions = {
  sampleRate?: number;
  channels?: number;
};

/**
 * Encodes an array of floating point audio samples (-1.0 to 1.0) into a 16-bit PCM WAV Buffer.
 */
export function encodeWav(
  samples: Float32Array | number[],
  options: WavEncodeOptions = {}
): Uint8Array {
  const sampleRate = options.sampleRate ?? 44100;
  const numChannels = options.channels ?? 1;
  const numSamples = samples.length;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * bytesPerSample;
  const bufferSize = 44 + dataSize;

  const buffer = new Uint8Array(bufferSize);
  const view = new DataView(buffer.buffer);

  // RIFF identifier
  writeString(view, 0, "RIFF");
  // RIFF chunk length (file size - 8)
  view.setUint32(4, 36 + dataSize, true);
  // RIFF type
  writeString(view, 8, "WAVE");

  // Format chunk identifier "fmt "
  writeString(view, 12, "fmt ");
  // Format chunk length (16 for PCM)
  view.setUint32(16, 16, true);
  // Sample format (1 = PCM)
  view.setUint16(20, 1, true);
  // Channel count
  view.setUint16(22, numChannels, true);
  // Sample rate
  view.setUint32(24, sampleRate, true);
  // Byte rate (sampleRate * blockAlign)
  view.setUint32(28, byteRate, true);
  // Block align (channels * bytesPerSample)
  view.setUint16(32, blockAlign, true);
  // Bits per sample
  view.setUint16(34, 16, true);

  // Data chunk identifier "data"
  writeString(view, 36, "data");
  // Data chunk length
  view.setUint32(40, dataSize, true);

  // Write 16-bit PCM samples with soft clipping
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    let s = samples[i];
    // Soft clip to prevent harsh distortion
    if (s > 1) s = 1;
    else if (s < -1) s = -1;
    // Scale to 16-bit signed integer range (-32768 to 32767)
    const intSample = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return buffer;
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
