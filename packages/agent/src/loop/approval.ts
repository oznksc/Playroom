export type ApprovalMode = "destructive-only" | "always" | "off" | "plan";

const DESTRUCTIVE_TOOLS = new Set([
  "remove_asset",
  "delete_scene",
  "remove_entity",
  "remove_component",
  "remove_prefab",
  "write_project",
  "restore_snapshot",
  "apply_skill",
]);

type PendingApproval = {
  resolve: (decision: "allow" | "deny") => void;
  timer?: ReturnType<typeof setTimeout>;
};

const APPROVAL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export class ApprovalGate {
  private pending = new Map<string, PendingApproval>();

  needsApproval(toolName: string, mode: ApprovalMode): boolean {
    if (mode === "off") return false;
    if (mode === "always" || mode === "plan") return true;
    return DESTRUCTIVE_TOOLS.has(toolName);
  }

  waitForApproval(
    requestId: string,
    signal?: AbortSignal,
  ): Promise<"allow" | "deny"> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        resolve("deny");
      }, APPROVAL_TIMEOUT_MS);

      const entry: PendingApproval = {
        resolve: (decision) => {
          clearTimeout(timer);
          resolve(decision);
        },
        timer,
      };
      this.pending.set(requestId, entry);

      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          this.pending.delete(requestId);
          resolve("deny");
        },
        { once: true },
      );
    });
  }

  resolveApproval(requestId: string, decision: "allow" | "deny"): boolean {
    const entry = this.pending.get(requestId);
    if (!entry) return false;
    this.pending.delete(requestId);
    if (entry.timer) clearTimeout(entry.timer);
    entry.resolve(decision);
    return true;
  }

  rejectAll(): void {
    for (const [id, entry] of this.pending) {
      if (entry.timer) clearTimeout(entry.timer);
      entry.resolve("deny");
      this.pending.delete(id);
    }
  }

  get pendingCount(): number {
    return this.pending.size;
  }
}

/**
 * Process-wide gate so CLI `/api/agent/approve` can resolve waits from
 * concurrent agent loops (requestIds are unique nanoids).
 */
export const globalApprovalGate = new ApprovalGate();
