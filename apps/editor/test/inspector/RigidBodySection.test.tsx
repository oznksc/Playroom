import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { GameKitEntity, RigidBodyComponent } from "@gamekit/schema";
import { RigidBodySection } from "../../src/components/inspector/RigidBodySection.js";

describe("RigidBodySection (RTL)", () => {
  const defaultBody: RigidBodyComponent = {
    type: "RigidBody",
    velocity: { x: 10, y: -20 },
    angularVelocity: 0,
    mass: 1.5,
    drag: 0.1,
    isKinematic: false,
    gravityScale: 1,
    useGravity: true,
  };

  it("renders physics body parameters and checkboxes", () => {
    render(
      <RigidBodySection
        rigidBody={defaultBody}
        onChange={vi.fn()}
        open={true}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("RigidBody 2D")).toBeInTheDocument();
    expect(screen.getByText("Vel X")).toBeInTheDocument();
    expect(screen.getByText("Vel Y")).toBeInTheDocument();
    expect(screen.getByText("Mass")).toBeInTheDocument();
    expect(screen.getByLabelText("Is Kinematic")).not.toBeChecked();
    expect(screen.getByLabelText("Use Gravity")).toBeChecked();
  });

  it("toggles kinematic and useGravity states", () => {
    const onChange = vi.fn();
    render(
      <RigidBodySection
        rigidBody={defaultBody}
        onChange={onChange}
        open={true}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    const kinematicCheckbox = screen.getByLabelText("Is Kinematic");
    fireEvent.click(kinematicCheckbox);

    expect(onChange).toHaveBeenCalled();
    const draft: GameKitEntity = {
      id: "box",
      name: "Box",
      components: [JSON.parse(JSON.stringify(defaultBody))],
    };
    onChange.mock.calls[0][0](draft);
    const updated = draft.components[0] as RigidBodyComponent;
    expect(updated.isKinematic).toBe(true);
  });
});
