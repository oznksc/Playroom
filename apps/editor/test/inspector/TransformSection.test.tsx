import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { GameKitEntity, TransformComponent } from "@gamekit/schema";
import { TransformSection } from "../../src/components/inspector/TransformSection.js";

describe("TransformSection (RTL)", () => {
  const defaultTransform: TransformComponent = {
    type: "Transform",
    position: { x: 100, y: 200 },
    scale: { x: 1.5, y: 2 },
    rotation: 45,
  };

  it("renders position, scale, and rotation inputs", () => {
    const onToggle = vi.fn();
    const onChange = vi.fn();

    const { container } = render(
      <TransformSection
        transform={defaultTransform}
        onChange={onChange}
        open={true}
        onToggle={onToggle}
      />
    );

    expect(screen.getByText("Transform")).toBeInTheDocument();
    expect(screen.getByText("X")).toBeInTheDocument();
    expect(screen.getByText("Y")).toBeInTheDocument();
    expect(screen.getByText("Scale X")).toBeInTheDocument();
    expect(screen.getByText("Scale Y")).toBeInTheDocument();
    expect(screen.getByText("Rotation")).toBeInTheDocument();

    const inputs = container.querySelectorAll("input[type='number']");
    expect(inputs).toHaveLength(5);
  });

  it("triggers onChange with updated position when X is edited", () => {
    const onChange = vi.fn();
    render(
      <TransformSection
        transform={defaultTransform}
        onChange={onChange}
        open={true}
        onToggle={vi.fn()}
      />
    );

    const xField = screen.getByText("X").closest("div");
    const xInput = xField?.querySelector("input")!;
    expect(xInput).toBeInTheDocument();
    fireEvent.change(xInput, { target: { value: "350" } });

    expect(onChange).toHaveBeenCalled();
    const draft: GameKitEntity = {
      id: "hero",
      name: "Hero",
      components: [JSON.parse(JSON.stringify(defaultTransform))],
    };
    const updater = onChange.mock.calls[0][0];
    updater(draft);
    const updatedTransform = draft.components[0] as TransformComponent;
    expect(updatedTransform.position.x).toBe(350);
  });
});
