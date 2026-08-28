import { describe, expect, it } from "vitest";
import {
  INITIAL_EDITOR_LAYOUT,
  editorLayoutReducer,
  getBottomDestination,
  getLeftDestination,
  getTabBarDestination,
} from "../src/lib/editor-layout.js";

describe("editor layout model", () => {
  it("makes left and bottom destinations mutually exclusive", () => {
    const left = editorLayoutReducer(INITIAL_EDITOR_LAYOUT, {
      type: "navigate",
      destination: { region: "left", tab: "scenes" },
    });

    expect(getLeftDestination(left.destination)).toBe("scenes");
    expect(getBottomDestination(left.destination)).toBeNull();

    const bottom = editorLayoutReducer(left, {
      type: "navigate",
      destination: { region: "bottom", tab: "studio" },
    });

    expect(getLeftDestination(bottom.destination)).toBeNull();
    expect(getBottomDestination(bottom.destination)).toBe("studio");
  });

  it("returns to the canvas when the active destination is toggled", () => {
    const open = editorLayoutReducer(INITIAL_EDITOR_LAYOUT, {
      type: "toggle",
      destination: { region: "left", tab: "entities" },
    });
    const closed = editorLayoutReducer(open, {
      type: "toggle",
      destination: { region: "left", tab: "entities" },
    });

    expect(closed.destination).toEqual({ region: "canvas" });
    expect(getTabBarDestination(closed.destination)).toBeNull();
  });

  it("keeps the selection-driven inspector independent from navigation", () => {
    const selected = editorLayoutReducer(INITIAL_EDITOR_LAYOUT, {
      type: "set-inspector-open",
      open: true,
    });
    const content = editorLayoutReducer(selected, {
      type: "navigate",
      destination: { region: "bottom", tab: "assets" },
    });

    expect(content.inspectorOpen).toBe(true);
    expect(getTabBarDestination(content.destination)).toBe("content");
  });

  it("maps canonical left destinations to tab-bar destinations", () => {
    expect(getTabBarDestination({ region: "left", tab: "entities" })).toBe("hierarchy");
    expect(getTabBarDestination({ region: "left", tab: "components" })).toBe("gui-components");
    expect(getTabBarDestination({ region: "left", tab: "agent" })).toBe("agent");
  });
});
