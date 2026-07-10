import { describe, expect, it } from "vitest";
import { ApprovalGate, globalApprovalGate } from "../src/loop/approval.js";

describe("ApprovalGate", () => {
  it("destructive-only mode requires approval for remove_entity", () => {
    const gate = new ApprovalGate();
    expect(gate.needsApproval("remove_entity", "destructive-only")).toBe(true);
    expect(gate.needsApproval("add_entity", "destructive-only")).toBe(false);
    expect(gate.needsApproval("apply_skill", "destructive-only")).toBe(true);
  });

  it("always mode requires approval for any tool", () => {
    const gate = new ApprovalGate();
    expect(gate.needsApproval("add_entity", "always")).toBe(true);
    expect(gate.needsApproval("list_assets", "always")).toBe(true);
  });

  it("plan mode requires approval for any tool", () => {
    const gate = new ApprovalGate();
    expect(gate.needsApproval("add_entity", "plan")).toBe(true);
  });

  it("off mode never requires approval", () => {
    const gate = new ApprovalGate();
    expect(gate.needsApproval("remove_entity", "off")).toBe(false);
  });

  it("resolveApproval unblocks waitForApproval", async () => {
    const gate = new ApprovalGate();
    const wait = gate.waitForApproval("req-1");
    expect(gate.pendingCount).toBe(1);
    const ok = gate.resolveApproval("req-1", "allow");
    expect(ok).toBe(true);
    await expect(wait).resolves.toBe("allow");
    expect(gate.pendingCount).toBe(0);
  });

  it("globalApprovalGate is shared and resolvable", async () => {
    globalApprovalGate.rejectAll();
    const wait = globalApprovalGate.waitForApproval("global-req");
    expect(globalApprovalGate.resolveApproval("global-req", "deny")).toBe(true);
    await expect(wait).resolves.toBe("deny");
  });

  it("unknown requestId returns false", () => {
    const gate = new ApprovalGate();
    expect(gate.resolveApproval("missing", "allow")).toBe(false);
  });
});
