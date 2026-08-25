import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { GameKitEntity, AabbColliderComponent, CircleColliderComponent } from "@gamekit/schema";
import { AabbColliderSection } from "../../src/components/inspector/AabbColliderSection.js";
import { CircleColliderSection } from "../../src/components/inspector/CircleColliderSection.js";

describe("CollidersSection (RTL)", () => {
  describe("AabbColliderSection", () => {
    const defaultAabb: AabbColliderComponent = {
      type: "AabbCollider",
      offset: { x: 0, y: 0 },
      size: { x: 40, y: 60 },
      isStatic: true,
      isTrigger: false,
      layer: 1,
      mask: 3,
    };

    it("renders box collider properties and triggers updates", () => {
      const onChange = vi.fn();
      render(
        <AabbColliderSection
          collider={defaultAabb}
          onChange={onChange}
          open={true}
          onToggle={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText("Box Collider 2D")).toBeInTheDocument();
      expect(screen.getByText("Width")).toBeInTheDocument();
      expect(screen.getByText("Height")).toBeInTheDocument();
      expect(screen.getByLabelText("Static collider")).toBeChecked();
      expect(screen.getByLabelText("Is Trigger (Overlap only)")).not.toBeChecked();

      const widthField = screen.getByText("Width").closest("div");
      const widthInput = widthField?.querySelector("input")!;
      expect(widthInput).toBeInTheDocument();
      fireEvent.change(widthInput, { target: { value: "80" } });

      expect(onChange).toHaveBeenCalled();
      const draft: GameKitEntity = {
        id: "wall",
        name: "Wall",
        components: [JSON.parse(JSON.stringify(defaultAabb))],
      };
      onChange.mock.calls[0][0](draft);
      const updated = draft.components[0] as AabbColliderComponent;
      expect(updated.size.x).toBe(80);
    });
  });

  describe("CircleColliderSection", () => {
    const defaultCircle: CircleColliderComponent = {
      type: "CircleCollider",
      offset: { x: 5, y: -5 },
      radius: 25,
      isStatic: false,
      isTrigger: true,
    };

    it("renders radius and trigger checkbox", () => {
      const onChange = vi.fn();
      render(
        <CircleColliderSection
          circleCollider={defaultCircle}
          onChange={onChange}
          open={true}
          onToggle={vi.fn()}
          onRemove={vi.fn()}
        />
      );

      expect(screen.getByText("Circle Collider 2D")).toBeInTheDocument();
      expect(screen.getByText("Radius")).toBeInTheDocument();
      expect(screen.getByLabelText("Is Trigger (Overlap only)")).toBeChecked();
    });
  });
});
