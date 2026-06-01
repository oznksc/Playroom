export type ApprovalMode = "destructive-only" | "always" | "off";

const DESTRUCTIVE_TOOLS = new Set([
  "remove_asset",
  "delete_scene",
  "remove_entity",
  "remove_component",
  "write_project",
  "restore_snapshot",
]);

type PendingApproval = {
  resolve: (decision: "allow" | "deny") => void;
};

const APPROVAL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export class ApprovalGate {
  private pending = new Map<string, PendingApproval>();

  needsApproval(toolName: string, mode: ApprovalMode): boolean {
    if (mode === "off") return false;
    if (mode === "always") return true;
    return DESTRUCTIVE_TOOLS.has(toolName);
  }

  waitForApproval(
    requestId: string,
    signal?: AbortSignal,
  ): Promise<"allow" | "deny"> {
    return new Promise((resolve) => {
      const entry: PendingApproval = { resolve };
      this.pending.set(requestId, entry);

      // Timeout
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        resolve("deny");
      }, APPROVAL_TIMEOUT_MS);

      // Abort
      signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        this.pending.delete(requestId);
        resolve("deny");
      }, { once: true });
    });
  }

  resolveApproval(requestId: string, decision: "allow" | "deny"): boolean {
    const entry = this.pending.get(requestId);
    if (!entry) return false;
    this.pending.delete(requestId);
    entry.resolve(decision);
    return true;
  }

  rejectAll(): void {
    for (const [id, entry] of this.pending) {
      entry.resolve("deny");
      this.pending.delete(id);
    }
  }
}
