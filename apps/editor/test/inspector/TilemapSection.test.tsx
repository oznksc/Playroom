import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { GameKitEntity, TilemapComponent } from "@gamekit/schema";
import { TilemapSection } from "../../src/components/inspector/TilemapSection.js";

describe("TilemapSection (RTL)", () => {
  const defaultTilemap: TilemapComponent = {
    type: "Tilemap",
    tilesetId: "dungeon-tiles",
    tileWidth: 16,
    tileHeight: 16,
    columns: 8,
    gridWidth: 10,
    gridHeight: 10,
    tiles: new Array(100).fill(0),
    solid: true,
  };

  it("renders tile dimensions, grid size, and solid toggle", () => {
    render(
      <TilemapSection
        tilemap={defaultTilemap}
        assets={[{ id: "dungeon-tiles", file: "dungeon.png", type: "image" }]}
        onChange={vi.fn()}
        open={true}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("Tilemap Renderer")).toBeInTheDocument();
    expect(screen.getByText("Tile W")).toBeInTheDocument();
    expect(screen.getByText("Grid W")).toBeInTheDocument();
    expect(screen.getByText(/Solid tiles/i)).toBeInTheDocument();
    expect(screen.getByText(/100 cells/i)).toBeInTheDocument();
  });

  it("modifies solid flag and grid sizes", () => {
    const onChange = vi.fn();
    const { container } = render(
      <TilemapSection
        tilemap={defaultTilemap}
        assets={[{ id: "dungeon-tiles", file: "dungeon.png", type: "image" }]}
        onChange={onChange}
        open={true}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    const solidCheckbox = container.querySelector("input[type='checkbox']")!;
    expect(solidCheckbox).toBeInTheDocument();
    fireEvent.click(solidCheckbox);

    expect(onChange).toHaveBeenCalled();
    const draft: GameKitEntity = {
      id: "tilemap",
      name: "Tilemap",
      components: [JSON.parse(JSON.stringify(defaultTilemap))],
    };
    onChange.mock.calls[0][0](draft);
    const updated = draft.components[0] as TilemapComponent;
    expect(updated.solid).toBe(false);
  });
});
