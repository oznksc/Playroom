import { describe, expect, it } from "vitest";
import { motionForStatus, resolveToolStage, statusLabel } from "./agent-tool-stage.js";

describe("agent tool stages", () => {
  it("maps tools to distinct kinds", () => {
    expect(resolveToolStage("list_entities").kind).toBe("read");
    expect(resolveToolStage("layout_entities").kind).toBe("layout");
    expect(resolveToolStage("spawn_role").kind).toBe("entity");
    expect(resolveToolStage("simulate_runtime_step").kind).toBe("simulate");
    expect(resolveToolStage("validate_scene").kind).toBe("validate");
    expect(resolveToolStage("apply_recipe").kind).toBe("recipe");
    expect(resolveToolStage("remove_entity").kind).toBe("destructive");
    expect(resolveToolStage("raycast").kind).toBe("physics");
    expect(resolveToolStage("spawn_grid").kind).toBe("entity");
    expect(resolveToolStage("fit_collider_to_sprite").kind).toBe("physics");
    expect(resolveToolStage("paint_tiles").kind).toBe("write");
    expect(resolveToolStage("list_script_catalog").kind).toBe("read");
  });

  it("animates only while running or waiting", () => {
    const layout = resolveToolStage("layout_entities");
    expect(motionForStatus(layout, "running")).toBe("sweep");
    expect(motionForStatus(layout, "ok")).toBe("none");
    expect(motionForStatus(layout, "error")).toBe("none");
    expect(motionForStatus(layout, "cancelled")).toBe("none");
    expect(motionForStatus(layout, "needs-approval")).toBe("pulse");
  });

  it("uses a different running motion per stage family", () => {
    expect(resolveToolStage("list_entities").runningMotion).toBe("pulse");
    expect(resolveToolStage("add_component").runningMotion).toBe("spin");
    expect(resolveToolStage("query_entities").runningMotion).toBe("bounce");
    expect(resolveToolStage("layout_entities").runningMotion).toBe("sweep");
  });

  it("labels terminal statuses clearly", () => {
    expect(statusLabel("ok")).toBe("Done");
    expect(statusLabel("running")).toBe("Working");
    expect(statusLabel("cancelled")).toBe("Stopped");
  });
});
