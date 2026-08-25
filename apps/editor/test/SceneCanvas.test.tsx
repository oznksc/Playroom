import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createEmptyScene, createEntity } from "@gamekit/schema";
import { SceneCanvas } from "../src/components/SceneCanvas.js";

describe("SceneCanvas (RTL)", () => {
  function createTestScene() {
    const scene = createEmptyScene("Canvas Test Scene");
    scene.entities.push(createEntity("Hero", { x: 100, y: 150 }));
    return scene;
  }

  const defaultProps = {
    scene: createTestScene(),
    assets: [],
    selectedEntityIds: new Set(["Hero"]),
    zoom: 1,
    snap: false,
    hasClipboard: false,
    activeTool: "select" as const,
    showGrid: true,
    showColliders: true,
    snapSize: 16,
    isPlaying: false,
    onZoomChange: vi.fn(),
    onSnapToggle: vi.fn(),
    onSnapSizeChange: vi.fn(),
    onActiveToolChange: vi.fn(),
    onToggleGrid: vi.fn(),
    onToggleColliders: vi.fn(),
    onSelect: vi.fn(),
    onSelectGuiNode: vi.fn(),
    onSelectComponentInstance: vi.fn(),
    onTransform: vi.fn(),
    onAddEntity: vi.fn(),
    onPasteEntity: vi.fn(),
    onSelectAll: vi.fn(),
    onCopyEntity: vi.fn(),
    onCutEntity: vi.fn(),
    onDuplicateEntity: vi.fn(),
    onDeleteEntity: vi.fn(),
  };

  it("mounts the canvas element and container", () => {
    const { container } = render(<SceneCanvas {...defaultProps} />);
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
  });

  it("renders play-mode virtual controls when isPlaying is active", () => {
    const onVirtualInput = vi.fn();
    render(
      <SceneCanvas
        {...defaultProps}
        isPlaying={true}
        onVirtualInput={onVirtualInput}
        virtualTouchControls={["jump", "fire"]}
      />
    );

    expect(screen.getByLabelText("Virtual game controls")).toBeInTheDocument();
    expect(screen.getByText("◀")).toBeInTheDocument();
    expect(screen.getByText("▶")).toBeInTheDocument();
    expect(screen.getByTitle("Jump")).toBeInTheDocument();
    expect(screen.getByTitle("Fire")).toBeInTheDocument();

    const jumpBtn = screen.getByTitle("Jump");
    fireEvent.pointerDown(jumpBtn, { pointerId: 1 });
    expect(onVirtualInput).toHaveBeenCalledWith("jump", true);

    fireEvent.pointerUp(jumpBtn, { pointerId: 1 });
    expect(onVirtualInput).toHaveBeenCalledWith("jump", false);
  });
});
