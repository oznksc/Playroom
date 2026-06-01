import type { ProviderMessage } from "../providers/types.js";

const MAX_HISTORY_TOKENS = 8000;
const COMPACT_THRESHOLD = 50;

export class MessageHistory {
  private messages: ProviderMessage[] = [];

  append(msg: ProviderMessage): void {
    this.messages.push(msg);
  }

  getMessages(): ProviderMessage[] {
    return [...this.messages];
  }

  clear(): void {
    this.messages = [];
  }

  length(): number {
    return this.messages.length;
  }

  compact(): void {
    if (this.messages.length <= COMPACT_THRESHOLD) return;

    // Keep first system message + last 20 turns
    const systemMsg = this.messages.find((m) => m.role === "system");
    const recent = this.messages.slice(-40);

    const compacted: ProviderMessage[] = [];
    if (systemMsg) compacted.push(systemMsg);

    // Summarize middle turns
    const middle = this.messages.filter(
      (m) => m !== systemMsg && !recent.includes(m),
    );
    if (middle.length > 0) {
      const summaries = middle
        .filter((m) => m.role === "user" || (m.role === "assistant" && m.content))
        .map((m) => {
          if (m.role === "user") return `User: ${truncate(m.content, 100)}`;
          return `Agent: ${truncate(m.content ?? "", 100)}`;
        });
      if (summaries.length > 0) {
        compacted.push({
          role: "user",
          content: `[Previous context — ${summaries.length} messages summarized]\n${summaries.slice(-5).join("\n")}`,
        });
      }
    }

    compacted.push(...recent);
    this.messages = compacted;
  }
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "...";
}
