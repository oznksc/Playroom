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
  "run_doctor",
  "get_audit_log",
  "query_audit_log",
  "get_prefab",
]);

/** Scene-specific read tools that should be invalidated when a scene mutation occurs */
export const SCENE_STATE_READ_TOOLS = new Set([
  "get_scene",
  "get_active_scene",
  "list_entities",
  "get_entity",
  "query_entities",
  "inspect_layout",
  "list_components",
  "query_overlaps",
  "raycast",
  "validate_scene",
  "explain_scene",
  "get_timeline",
  "get_game_rules",
  "list_gui_nodes",
  "get_scene_settings",
  "list_levels",
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
  return (
    READ_ONLY_TOOLS.has(name) ||
    name.startsWith("list_") ||
    name.startsWith("get_") ||
    name.startsWith("describe_") ||
    name.startsWith("query_") ||
    name.startsWith("inspect_") ||
    name.startsWith("find_") ||
    name.startsWith("explain_") ||
    name.startsWith("search_") ||
    name.startsWith("validate_")
  );
}

export function isMutationTool(name: string): boolean {
  return !isReadOnlyTool(name);
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

type CacheEntry = {
  tool: string;
  ok: boolean;
  text: string;
  content: unknown;
  hits: number;
  recordedAt: number;
};

export class ToolCallCache {
  private readonly seen = new Map<string, CacheEntry>();
  private hitsCount = 0;
  private missesCount = 0;

  record(key: string, result: NormalizedToolResult): void {
    const toolName = key.split(":")[0] || "";
    const prev = this.seen.get(key);
    this.seen.set(key, {
      tool: toolName,
      ok: !result.isError,
      text: result.text,
      content: result.content,
      hits: (prev?.hits ?? 0) + 1,
      recordedAt: Date.now(),
    });
  }

  /**
   * Invalidate cached scene reads when a mutation tool runs.
   */
  invalidateOnMutation(mutationTool: string, _args?: unknown): number {
    if (isReadOnlyTool(mutationTool)) return 0;
    let invalidated = 0;
    for (const [key, entry] of this.seen.entries()) {
      if (SCENE_STATE_READ_TOOLS.has(entry.tool) || entry.tool.startsWith("get_") || entry.tool.startsWith("list_") || entry.tool.startsWith("inspect_")) {
        this.seen.delete(key);
        invalidated++;
      }
    }
    return invalidated;
  }

  /**
   * Skip a successful identical call, or a call that already failed twice with the same args.
   */
  skipReason(key: string): string | null {
    const prev = this.seen.get(key);
    if (!prev) {
      this.missesCount++;
      return null;
    }
    if (prev.ok) {
      this.hitsCount++;
      return "Identical tool call already succeeded in this run. Reusing the previous result.";
    }
    if (prev.hits >= 2) {
      this.hitsCount++;
      return "Identical tool call already failed twice. Change arguments or pick a different tool.";
    }
    this.missesCount++;
    return null;
  }

  cached(key: string): { ok: boolean; text: string; content: unknown } | undefined {
    return this.seen.get(key);
  }

  getStats(): { hits: number; misses: number; size: number } {
    return {
      hits: this.hitsCount,
      misses: this.missesCount,
      size: this.seen.size,
    };
  }

  clear(): void {
    this.seen.clear();
    this.hitsCount = 0;
    this.missesCount = 0;
  }
}

/**
 * Multi-tier inspect-spin tracker that prevents infinite inspection loops and detects tool call cycles.
 */
export class InspectSpinTracker {
  private consecutiveReadTurns = 0;
  private totalTurns = 0;
  private totalReadTurns = 0;
  private totalMutationTurns = 0;
  private readonly callHistory: string[] = [];

  /**
   * Record tool calls made in a turn and return appropriate intervention.
   */
  recordTurn(toolCalls: Array<{ name: string; args: unknown }>): {
    consecutiveReadTurns: number;
    intervention: "none" | "nudge" | "directive" | "circuit_breaker";
    message?: string;
    haltReads: boolean;
  } {
    this.totalTurns++;
    const hasMutation = toolCalls.some((c) => isMutationTool(c.name));
    const allReads = toolCalls.length > 0 && toolCalls.every((c) => isReadOnlyTool(c.name));

    // Record fingerprints for cycle detection
    for (const call of toolCalls) {
      this.callHistory.push(fingerprint(call.name, call.args));
    }
    if (this.callHistory.length > 30) {
      this.callHistory.splice(0, this.callHistory.length - 30);
    }

    if (hasMutation) {
      this.consecutiveReadTurns = 0;
      this.totalMutationTurns++;
      return { consecutiveReadTurns: 0, intervention: "none", haltReads: false };
    }

    if (allReads) {
      this.consecutiveReadTurns++;
      this.totalReadTurns++;
    }

    const isCycle = this.detectCycle();

    // Tier 3: Hard Circuit Breaker (5+ consecutive read turns or severe cycle)
    if (this.consecutiveReadTurns >= 5 || (isCycle && this.consecutiveReadTurns >= 3)) {
      return {
        consecutiveReadTurns: this.consecutiveReadTurns,
        intervention: "circuit_breaker",
        message:
          "CIRCUIT BREAKER TRIGGERED: You have performed 5+ consecutive read/inspect turns or entered a repetitive cycle without making modifications. Tool execution for further read tools is blocked. You must now either execute the required write/edit tools or provide your final answer.",
        haltReads: true,
      };
    }

    // Tier 2: Strict Directive (4 consecutive read turns)
    if (this.consecutiveReadTurns === 4) {
      return {
        consecutiveReadTurns: this.consecutiveReadTurns,
        intervention: "directive",
        message:
          "INSPECTION LIMIT REACHED: You have queried the scene 4 times consecutively. Stop inspecting. Proceed immediately to make concrete edits using mutation tools, or summarize your findings and conclude.",
        haltReads: false,
      };
    }

    // Tier 1: Soft Nudge (3 consecutive read turns)
    if (this.consecutiveReadTurns === 3) {
      return {
        consecutiveReadTurns: this.consecutiveReadTurns,
        intervention: "nudge",
        message:
          "You have gathered sufficient context across 3 inspection turns. Proceed with the necessary edits using mutation tools (e.g. add_entity, update_component, apply_recipe) or deliver your response.",
        haltReads: false,
      };
    }

    return { consecutiveReadTurns: this.consecutiveReadTurns, intervention: "none", haltReads: false };
  }

  /**
   * Detect repeating tool call cycles like [A, B, A, B] or [A, A, A].
   */
  private detectCycle(): boolean {
    const len = this.callHistory.length;
    if (len < 4) return false;

    // Pattern length 1: AAA
    if (
      len >= 3 &&
      this.callHistory[len - 1] === this.callHistory[len - 2] &&
      this.callHistory[len - 2] === this.callHistory[len - 3]
    ) {
      return true;
    }

    // Pattern length 2: ABAB
    if (
      len >= 4 &&
      this.callHistory[len - 1] === this.callHistory[len - 3] &&
      this.callHistory[len - 2] === this.callHistory[len - 4]
    ) {
      return true;
    }

    // Pattern length 3: ABCABC
    if (
      len >= 6 &&
      this.callHistory[len - 1] === this.callHistory[len - 4] &&
      this.callHistory[len - 2] === this.callHistory[len - 5] &&
      this.callHistory[len - 3] === this.callHistory[len - 6]
    ) {
      return true;
    }

    return false;
  }

  getStats(): { consecutiveReadTurns: number; totalTurns: number; totalReadTurns: number; totalMutationTurns: number } {
    return {
      consecutiveReadTurns: this.consecutiveReadTurns,
      totalTurns: this.totalTurns,
      totalReadTurns: this.totalReadTurns,
      totalMutationTurns: this.totalMutationTurns,
    };
  }

  reset(): void {
    this.consecutiveReadTurns = 0;
    this.totalTurns = 0;
    this.totalReadTurns = 0;
    this.totalMutationTurns = 0;
    this.callHistory.length = 0;
  }
}

function stableStringify(value: unknown): string {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}
