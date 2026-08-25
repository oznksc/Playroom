import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, act } from "@testing-library/react";
import {
  EditorTour,
  TOUR_STEPS,
  TOUR_STORAGE_KEY,
  useEditorTour,
} from "../src/components/EditorTour.js";

describe("EditorTour with GuideLoop", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defines 4 core workflow steps targeting editor elements", () => {
    expect(TOUR_STEPS.length).toBe(4);
    expect(TOUR_STEPS.map((s) => s.additionalTargets?.[0] ?? s.target)).toEqual([
      "#tour-canvas-stage",
      "#tour-topbar-play",
      "#tour-activity-rail",
      "#tour-agent-button",
    ]);

    expect(TOUR_STEPS[0].title).toBe("Canvas Viewport");
    expect(TOUR_STEPS[1].title).toBe("Play in Editor");
    expect(TOUR_STEPS[2].title).toBe("Activity Rail & Drawers");
    expect(TOUR_STEPS[3].title).toBe("Antigravity AI Agent");
  });

  it("renders when open and does not crash", () => {
    // Add target element so GuideLoop can find the step target
    const target = document.createElement("div");
    target.id = "tour-canvas-stage";
    document.body.appendChild(target);

    const onClose = vi.fn();
    const { container } = render(<EditorTour isOpen={true} onClose={onClose} />);
    expect(container).toBeDefined();

    document.body.removeChild(target);
  });

  it("does not render tour elements when closed", () => {
    const onClose = vi.fn();
    const { container } = render(<EditorTour isOpen={false} onClose={onClose} />);
    expect(container.firstChild).toBeNull();
  });

  it("useEditorTour hook tracks open and close state", () => {
    function TestComponent() {
      const { isTourOpen, openTour, closeTour } = useEditorTour();
      return (
        <div>
          <span data-testid="status">{isTourOpen ? "open" : "closed"}</span>
          <button data-testid="open-btn" onClick={openTour}>
            Open
          </button>
          <button data-testid="close-btn" onClick={closeTour}>
            Close
          </button>
        </div>
      );
    }

    render(<TestComponent />);
    expect(screen.getByTestId("status").textContent).toBe("closed");

    act(() => {
      screen.getByTestId("open-btn").click();
    });
    expect(screen.getByTestId("status").textContent).toBe("open");

    act(() => {
      screen.getByTestId("close-btn").click();
    });
    expect(screen.getByTestId("status").textContent).toBe("closed");
  });
});
