import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { GameKitEntity, ScriptComponent } from "@gamekit/schema";
import { ScriptSection } from "../../src/components/inspector/ScriptSection.js";

describe("ScriptSection (RTL)", () => {
  const defaultScript: ScriptComponent = {
    type: "Script",
    handlers: [
      {
        event: "onCollisionEnter",
        actions: [{ type: "playSound", assetId: "hit-sfx" }],
      },
    ],
  };

  it("renders script handlers and actions DSL", () => {
    render(
      <ScriptSection
        script={defaultScript}
        onChange={vi.fn()}
        open={true}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("Behavior Script")).toBeInTheDocument();
    expect(screen.getByDisplayValue("onCollisionEnter")).toBeInTheDocument();
    expect(screen.getAllByText("playSound").length).toBeGreaterThan(0);
  });

  it("adds a new handler when 'Add handler' is clicked", () => {
    const onChange = vi.fn();
    render(
      <ScriptSection
        script={defaultScript}
        onChange={onChange}
        open={true}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    const addHandlerBtn = screen.getByRole("button", { name: "Add handler" });
    fireEvent.click(addHandlerBtn);

    expect(onChange).toHaveBeenCalled();
    const draft: GameKitEntity = {
      id: "hero",
      name: "Hero",
      components: [JSON.parse(JSON.stringify(defaultScript))],
    };
    onChange.mock.calls[0][0](draft);
    const updated = draft.components[0] as ScriptComponent;
    expect(updated.handlers).toHaveLength(2);
  });
});
