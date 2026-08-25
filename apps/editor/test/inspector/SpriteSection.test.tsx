import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { GameKitEntity, SpriteComponent, GameKitAsset } from "@gamekit/schema";
import { SpriteSection } from "../../src/components/inspector/SpriteSection.js";

describe("SpriteSection (RTL)", () => {
  const defaultSprite: SpriteComponent = {
    type: "Sprite",
    assetId: "coin-img",
    width: 32,
    height: 32,
    anchor: { x: 0.5, y: 0.5 },
  };

  const sampleAssets: GameKitAsset[] = [
    { id: "coin-img", file: "coin.png", type: "image" },
    { id: "hero-img", file: "hero.png", type: "image" },
  ];

  it("renders sprite renderer dimensions and asset selector", () => {
    render(
      <SpriteSection
        sprite={defaultSprite}
        assets={sampleAssets}
        onChange={vi.fn()}
        open={true}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("Sprite Renderer")).toBeInTheDocument();
    expect(screen.getByText("Width")).toBeInTheDocument();
    expect(screen.getByText("Height")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("coin-img");
  });

  it("triggers onChange when asset or size changes", () => {
    const onChange = vi.fn();
    render(
      <SpriteSection
        sprite={defaultSprite}
        assets={sampleAssets}
        onChange={onChange}
        open={true}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    const assetSelect = screen.getByRole("combobox");
    fireEvent.change(assetSelect, { target: { value: "hero-img" } });

    expect(onChange).toHaveBeenCalled();
    const draft: GameKitEntity = {
      id: "coin",
      name: "Coin",
      components: [JSON.parse(JSON.stringify(defaultSprite))],
    };
    onChange.mock.calls[0][0](draft);
    const updated = draft.components[0] as SpriteComponent;
    expect(updated.assetId).toBe("hero-img");
  });
});
