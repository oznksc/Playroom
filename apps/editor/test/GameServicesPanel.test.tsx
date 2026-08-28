import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GameServicesPanel } from "../src/components/GameServicesPanel.js";
import type { GameServicesDef } from "@gamekit/schema";

describe("GameServicesPanel", () => {
  it("renders panel header, enable toggle, and empty state", () => {
    const onUpdate = vi.fn();
    render(
      <GameServicesPanel
        gameServices={{ enabled: false, achievements: [], leaderboards: [] }}
        onUpdateGameServices={onUpdate}
      />
    );

    expect(screen.getByText("Game Services")).toBeDefined();
    expect(screen.getByText("Services Disabled")).toBeDefined();
    expect(screen.getByText("No achievements configured yet.")).toBeDefined();

    // Toggle enabled switch
    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
  });

  it("renders configured achievements and allows adding a new one", () => {
    const onUpdate = vi.fn();
    const initialServices: GameServicesDef = {
      enabled: true,
      achievements: [
        {
          id: "first_coin",
          name: "First Coin",
          description: "Collect 1 coin",
          type: "standard",
          hidden: false,
          providers: {
            googlePlay: "CgkI_coin",
            gameCenter: "grp.coin",
            steam: "ACH_COIN",
          },
        },
      ],
      leaderboards: [],
    };

    render(<GameServicesPanel gameServices={initialServices} onUpdateGameServices={onUpdate} />);

    expect(screen.getByText("First Coin")).toBeDefined();

    // Click Add Achievement button
    const addButton = screen.getByText("Add Achievement");
    fireEvent.click(addButton);

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        achievements: expect.arrayContaining([
          expect.objectContaining({ id: "first_coin" }),
          expect.objectContaining({ id: "achievement_2" }),
        ]),
      })
    );
  });

  it("switches to leaderboards tab and renders leaderboards", () => {
    const onUpdate = vi.fn();
    const initialServices: GameServicesDef = {
      enabled: true,
      achievements: [],
      leaderboards: [
        {
          id: "high_score",
          name: "High Scores",
          order: "descending",
          providers: {
            googlePlay: "CgkI_score",
          },
        },
      ],
    };

    render(<GameServicesPanel gameServices={initialServices} onUpdateGameServices={onUpdate} />);

    // Switch to Leaderboards tab
    const lbTabButton = screen.getByText("Leaderboards");
    fireEvent.click(lbTabButton);

    expect(screen.getByText("High Scores")).toBeDefined();
    expect(screen.getByText("High Score (DESC)")).toBeDefined();
  });
});
