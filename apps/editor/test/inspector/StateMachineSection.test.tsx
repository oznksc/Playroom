import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { GameKitEntity, StateMachineComponent } from "@gamekit/schema";
import { StateMachineSection } from "../../src/components/inspector/StateMachineSection.js";

describe("StateMachineSection (RTL)", () => {
  const defaultFsm: StateMachineComponent = {
    type: "StateMachine",
    initialState: "idle",
    currentState: "idle",
    states: [
      { name: "idle", on: { walk: "moving" } },
      { name: "moving", on: { stop: "idle" } },
    ],
  };

  it("renders initial state selection and defined states", () => {
    render(
      <StateMachineSection
        stateMachine={defaultFsm}
        onChange={vi.fn()}
        open={true}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("FSM State Machine")).toBeInTheDocument();
    expect(screen.getByText("Initial state")).toBeInTheDocument();
    expect(screen.getAllByDisplayValue("idle").length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue("moving").length).toBeGreaterThan(0);
  });

  it("adds a new state to the FSM", () => {
    const onChange = vi.fn();
    render(
      <StateMachineSection
        stateMachine={defaultFsm}
        onChange={onChange}
        open={true}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    const addStateBtn = screen.getByRole("button", { name: "Add state" });
    fireEvent.click(addStateBtn);

    expect(onChange).toHaveBeenCalled();
    const draft: GameKitEntity = {
      id: "hero",
      name: "Hero",
      components: [JSON.parse(JSON.stringify(defaultFsm))],
    };
    onChange.mock.calls[0][0](draft);
    const updated = draft.components[0] as StateMachineComponent;
    expect(updated.states).toHaveLength(3);
    expect(updated.states[2].name).toBe("state_2");
  });
});
