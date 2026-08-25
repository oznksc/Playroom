const MAX_RESULT_CHARS = 8_000;

export const READ_ONLY_TOOLS = new Set([
  "list_skills",
  "list_recipes",
  "describe_recipe",
  "list_assets",
  "list_scenes",
  "list_entities",
  "list_components",
  "list_prefabs",
  "validate_scene",
  "validate_project",
  "explain_scene",
  "find_unused_assets",
  "suggest_components",
  "raycast",
  "query_overlaps",
  "diff_scene_versions",
  "search_project",
  "get_project",
  "get_scene",
  "get_active_scene",
  "get_entity",
  "query_entities",
  "inspect_layout",
  "list_component_types",
  "list_script_catalog",
  "list_levels",
  "get_input_map",
  "list_gui_nodes",
  "list_editor_capabilities",
  "get_scene_settings",
  "get_timeline",
  "get_game_rules",
  "list_gui_components",
  "simulate_runtime_step",
]);

export type NormalizedToolResult = {
  content: unknown;
  text: string;
  isError: boolean;
};

export function fingerprint(name: string, args: unknown): string {
  return `${name}:${stableStringify(args)}`;
}

export function isReadOnlyTool(name: string): boolean {
  return READ_ONLY_TOOLS.has(name) || name.startsWith("list_") || name.startsWith("get_") || name.startsWith("describe_");
}

export function isTransientProviderError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /429|503|502|500|ECONNRESET|ETIMEDOUT|fetch failed|overloaded|rate limit/i.test(message);
}

export function normalizeToolResult(raw: unknown): NormalizedToolResult {
  const envelope = raw as { content?: unknown; isError?: boolean } | null;
  const isError = envelope?.isError === true;
  const extracted = extractText(envelope?.content ?? raw);
  const text = compactText(extracted);
  let content: unknown = extracted;
  try {
    content = JSON.parse(extracted);
  } catch {
    content = extracted;
  }
  return { content, text, isError };
}

export function extractText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const parts = value
      .map((part) => {
        if (part && typeof part === "object" && "text" in part && typeof (part as { text: unknown }).text === "string") {
          return (part as { text: string }).text;
        }
        return typeof part === "string" ? part : JSON.stringify(part);
      })
      .filter(Boolean);
    if (parts.length > 0) return parts.join("\n");
  }
  if (typeof value === "object" && value && "content" in value) {
    return extractText((value as { content: unknown }).content);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function compactText(text: string): string {
  if (text.length <= MAX_RESULT_CHARS) return text;
  return `${text.slice(0, MAX_RESULT_CHARS)}\n…[truncated ${text.length - MAX_RESULT_CHARS} chars]`;
}

export class ToolCallCache {
  private readonly seen = new Map<string, { ok: boolean; text: string; content: unknown; hits: number }>();

  record(key: string, result: NormalizedToolResult): void {
    const prev = this.seen.get(key);
    this.seen.set(key, {
      ok: !result.isError,
      text: result.text,
      content: result.content,
      hits: (prev?.hits ?? 0) + 1,
    });
  }

  /**
   * Skip a successful identical call, or a call that already failed twice with the same args.
   */
  skipReason(key: string): string | null {
    const prev = this.seen.get(key);
    if (!prev) return null;
    if (prev.ok) {
      return "Identical tool call already succeeded in this run. Reusing the previous result.";
    }
    if (prev.hits >= 2) {
      return "Identical tool call already failed twice. Change arguments or pick a different tool.";
    }
    return null;
  }

  cached(key: string): { ok: boolean; text: string; content: unknown } | undefined {
    return this.seen.get(key);
  }
}

function stableStringify(value: unknown): string {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}
