import { join, dirname } from "node:path";
import { mkdir, appendFile, readFile, writeFile, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { nanoid } from "nanoid";
import type { AuditEntry, AuditQueryOptions } from "./types.js";

export const DEFAULT_MAX_AUDIT_ENTRIES = 2_000;

export class AgentAuditLogger {
  readonly logFilePath: string;
  private writeQueue: Promise<void> = Promise.resolve();
  private appendCount = 0;

  constructor(targetDirOrFile: string) {
    if (targetDirOrFile.endsWith(".jsonl") || targetDirOrFile.endsWith(".log")) {
      this.logFilePath = targetDirOrFile;
    } else {
      // Treat as project root or agent dir
      if (targetDirOrFile.endsWith("agent")) {
        this.logFilePath = join(targetDirOrFile, "audit.jsonl");
      } else if (targetDirOrFile.endsWith("gamekit")) {
        this.logFilePath = join(targetDirOrFile, "agent", "audit.jsonl");
      } else {
        this.logFilePath = join(targetDirOrFile, "gamekit", "agent", "audit.jsonl");
      }
    }
  }

  /**
   * Append an audit entry to the on-disk JSONL log.
   */
  async append(
    rawEntry: Partial<AuditEntry> & { tool: string; status: AuditEntry["status"] }
  ): Promise<AuditEntry> {
    const timestamp = rawEntry.timestamp ?? Date.now();
    const entry: AuditEntry = {
      id: rawEntry.id || nanoid(),
      timestamp,
      isoTime: rawEntry.isoTime || new Date(timestamp).toISOString(),
      sceneId: rawEntry.sceneId,
      projectPath: rawEntry.projectPath,
      tool: rawEntry.tool,
      args: rawEntry.args,
      status: rawEntry.status,
      cached: rawEntry.cached ?? false,
      durationMs: rawEntry.durationMs ?? 0,
      approval: rawEntry.approval ?? "none",
      summary: rawEntry.summary,
      error: rawEntry.error,
      turn: rawEntry.turn,
      sessionId: rawEntry.sessionId,
    };

    // Serialize disk append via promise queue to prevent write interleaving
    this.writeQueue = this.writeQueue
      .then(async () => {
        try {
          const dir = dirname(this.logFilePath);
          await mkdir(dir, { recursive: true });
          const line = `${JSON.stringify(entry)}\n`;
          await appendFile(this.logFilePath, line, "utf8");
          this.appendCount++;
          if (this.appendCount % 200 === 0) {
            await this.prune(DEFAULT_MAX_AUDIT_ENTRIES);
          }
        } catch {
          // Log errors are best-effort and must never crash the caller
        }
      })
      .catch(() => {});

    await this.writeQueue;
    return entry;
  }

  /**
   * Query recent audit log entries matching filters.
   */
  async query(options: AuditQueryOptions = {}): Promise<AuditEntry[]> {
    if (!existsSync(this.logFilePath)) {
      return [];
    }

    let raw: string;
    try {
      raw = await readFile(this.logFilePath, "utf8");
    } catch {
      return [];
    }

    const lines = raw.split("\n").filter((l) => l.trim().length > 0);
    const parsed: AuditEntry[] = [];

    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const item = JSON.parse(lines[i]) as AuditEntry;
        if (options.tool && item.tool !== options.tool) continue;
        if (options.sceneId && item.sceneId !== options.sceneId) continue;
        if (options.status && item.status !== options.status) continue;
        if (options.sessionId && item.sessionId !== options.sessionId) continue;
        if (options.since && item.timestamp < options.since) continue;
        if (options.until && item.timestamp > options.until) continue;

        parsed.push(item);
        if (options.limit && parsed.length >= options.limit) {
          break;
        }
      } catch {
        // skip malformed line
      }
    }

    return parsed;
  }

  /**
   * Prune log file to keep the latest N entries.
   */
  async prune(maxEntries = DEFAULT_MAX_AUDIT_ENTRIES): Promise<number> {
    if (!existsSync(this.logFilePath)) return 0;
    try {
      const raw = await readFile(this.logFilePath, "utf8");
      const lines = raw.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length <= maxEntries) return 0;

      const kept = lines.slice(lines.length - maxEntries);
      await writeFile(this.logFilePath, `${kept.join("\n")}\n`, "utf8");
      return lines.length - kept.length;
    } catch {
      return 0;
    }
  }

  /**
   * Clear all audit logs.
   */
  async clear(): Promise<void> {
    try {
      if (existsSync(this.logFilePath)) {
        await unlink(this.logFilePath);
      }
    } catch {
      // ignore
    }
  }
}
