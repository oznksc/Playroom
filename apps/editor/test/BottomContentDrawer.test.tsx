import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BottomContentDrawer } from "../src/components/layout/BottomContentDrawer.js";
import type { GameKitScene } from "@gamekit/schema";
import type { ProjectSnapshot } from "../src/types.js";

const mockScene: GameKitScene = {
  id: "scene-1",
  name: "Main Scene",
  entities: [],
  layers: [],
};

const mockSnapshot: ProjectSnapshot = {
  project: {
    id: "proj-1",
    name: "Test Game",
    version: "0.1.0",
    schemaVersion: 1,
    defaultScene: "main.scene.json",
  },
  scenes: [{ file: "main.scene.json", scene: mockScene }],
  assets: [
    { id: "player", file: "player.png", kind: "image" },
    { id: "coin", file: "coin.png", kind: "image" },
  ],
  prefabs: [],
  guiComponents: [],
};

describe("BottomContentDrawer", () => {
  it("renders Tabs list and handles tab switches", () => {
    const setActiveTab = vi.fn();
    const setCollapsed = vi.fn();

    render(
      <BottomContentDrawer
        scene={mockScene}
        bottomDrawerCollapsed={false}
        setBottomDrawerCollapsed={setCollapsed}
        activeBottomTab="assets"
        setActiveBottomTab={setActiveTab}
        snapshot={mockSnapshot}
        selectedAssetId={undefined}
        setSelectedAssetId={vi.fn()}
        selectedEntityId={undefined}
        currentSceneFile="main.scene.json"
        logs={[]}
        setLogs={vi.fn()}
        deleteAsset={vi.fn()}
        importAsset={vi.fn()}
        openContent={vi.fn()}
        refresh={vi.fn()}
        setError={vi.fn()}
        executeConsoleCommand={vi.fn()}
        updateScene={vi.fn()}
        handleSpawnEntityWithSprite={vi.fn()}
        handleSpawnEntityWithAnimation={vi.fn()}
        handleAttachAudioToEntity={vi.fn()}
        showTimeline={true}
        showConsole={true}
      />
    );

    // Should render Content tab trigger with badge (2 assets)
    expect(screen.getByRole("tab", { name: /content/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /studio/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /timeline/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /console/i })).toBeDefined();

    // Click Studio tab
    fireEvent.click(screen.getByRole("tab", { name: /studio/i }));
    expect(setActiveTab).toHaveBeenCalledWith("studio");
  });
});
