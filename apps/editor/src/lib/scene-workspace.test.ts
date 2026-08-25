import { describe, expect, it } from "vitest";
import {
  closeSceneTab,
  createSceneWorkspace,
  focusedSceneFile,
  openSceneTab,
  sceneTabLabel,
  setSceneSplit,
  syncWorkspaceScenes,
} from "./scene-workspace.js";

describe("scene workspace", () => {
  it("opens tabs into the focused pane and labels files", () => {
    let ws = createSceneWorkspace("menu.scene.json");
    expect(sceneTabLabel("menu.scene.json")).toBe("menu");
    ws = openSceneTab(ws, "arena.scene.json");
    expect(ws.openTabs).toEqual(["menu.scene.json", "arena.scene.json"]);
    expect(focusedSceneFile(ws)).toBe("arena.scene.json");
    expect(ws.paneA).toBe("arena.scene.json");
  });

  it("splits to a second scene and closes without dropping the last tab", () => {
    let ws = createSceneWorkspace("a.scene.json");
    ws = openSceneTab(ws, "b.scene.json");
    ws = setSceneSplit(ws, "horizontal", ["a.scene.json", "b.scene.json"]);
    expect(ws.split).toBe("horizontal");
    expect(ws.paneA).toBe("b.scene.json");
    expect(ws.paneB).toBe("a.scene.json");

    ws = closeSceneTab(ws, "b.scene.json");
    expect(ws.openTabs).toEqual(["a.scene.json"]);
    expect(focusedSceneFile(ws)).toBe("a.scene.json");

    const kept = closeSceneTab(ws, "a.scene.json");
    expect(kept.openTabs).toEqual(["a.scene.json"]);
  });

  it("drops missing scenes on sync", () => {
    let ws = createSceneWorkspace("gone.scene.json");
    ws = openSceneTab(ws, "keep.scene.json");
    ws = syncWorkspaceScenes(ws, ["keep.scene.json"], "keep.scene.json");
    expect(ws.openTabs).toEqual(["keep.scene.json"]);
    expect(ws.paneA).toBe("keep.scene.json");
  });
});
