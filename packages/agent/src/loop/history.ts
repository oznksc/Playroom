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
    const middle = this.messages.filter((m) => m !== systemMsg && !recent.includes(m));
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

export type PriorTurn = {
  role: string;
  content: string;
};

const MAX_PRIOR_TURNS = 24;
const MAX_TURN_CHARS = 1500;

/**
 * Convert persisted editor chat into provider messages (excludes the live user turn).
 * System notes are folded into user messages so providers keep a single system prompt.
 */
export function toPriorProviderMessages(items: PriorTurn[] | undefined): ProviderMessage[] {
  if (!items || items.length === 0) return [];
  const out: ProviderMessage[] = [];
  for (const item of items) {
    const content = truncate((item.content ?? "").trim(), MAX_TURN_CHARS);
    if (!content) continue;
    if (item.role === "user") {
      out.push({ role: "user", content });
    } else if (item.role === "agent" || item.role === "assistant") {
      out.push({ role: "assistant", content });
    } else if (item.role === "system") {
      out.push({ role: "user", content: `[note] ${content}` });
    }
  }
  return out.slice(-MAX_PRIOR_TURNS);
}

export function formatToolDigest(
  calls: Array<{ tool: string; status: string }> | undefined
): string | undefined {
  if (!calls || calls.length === 0) return undefined;
  const recent = calls.slice(-16);
  const lines = recent.map((c) => `- ${c.tool}: ${c.status}`);
  return `[Previous tool results in this chat]\n${lines.join("\n")}`;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "...";
}
