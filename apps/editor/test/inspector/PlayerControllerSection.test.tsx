import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { GameKitEntity, PlayerControllerComponent } from "@gamekit/schema";
import { PlayerControllerSection } from "../../src/components/inspector/PlayerControllerSection.js";

describe("PlayerControllerSection (RTL)", () => {
  const defaultController: PlayerControllerComponent = {
    type: "PlayerController",
    speed: 250,
    jumpVelocity: 500,
    gravity: 1200,
  };

  it("renders speed, jump velocity, and gravity fields", () => {
    render(
      <PlayerControllerSection
        player={defaultController}
        onChange={vi.fn()}
        open={true}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("Player Controller")).toBeInTheDocument();
    expect(screen.getByText("Speed")).toBeInTheDocument();
    expect(screen.getByText("Jump Vel")).toBeInTheDocument();
    expect(screen.getByText("Gravity")).toBeInTheDocument();
  });

  it("modifies speed when input is updated", () => {
    const onChange = vi.fn();
    render(
      <PlayerControllerSection
        player={defaultController}
        onChange={onChange}
        open={true}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    const speedField = screen.getByText("Speed").closest("div");
    const speedInput = speedField?.querySelector("input")!;
    expect(speedInput).toBeInTheDocument();
    fireEvent.change(speedInput, { target: { value: "320" } });

    expect(onChange).toHaveBeenCalled();
    const draft: GameKitEntity = {
      id: "player",
      name: "Player",
      components: [JSON.parse(JSON.stringify(defaultController))],
    };
    onChange.mock.calls[0][0](draft);
    const updated = draft.components[0] as PlayerControllerComponent;
    expect(updated.speed).toBe(320);
  });
});
