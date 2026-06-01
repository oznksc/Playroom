export type SseParsedEvent = {
  event: string;
  data: unknown;
};

export async function* parseSseStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<SseParsedEvent> {
  const decoder = new TextDecoder();
  let buffer = "";
  let currentEvent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
          continue;
        }

        if (line.startsWith("data: ")) {
          const raw = line.slice(6);
          let data: unknown;
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
          yield { event: currentEvent || "message", data };
          currentEvent = "";
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
