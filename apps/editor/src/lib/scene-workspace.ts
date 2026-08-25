export type ScenePaneId = "a" | "b";
export type SplitMode = "none" | "horizontal" | "vertical";

export type SceneWorkspaceState = {
  openTabs: string[];
  split: SplitMode;
  paneA: string;
  paneB: string | null;
  focused: ScenePaneId;
};

export function sceneTabLabel(file: string): string {
  return file.replace(/\.scene\.json$/, "") || file;
}

export function createSceneWorkspace(file: string): SceneWorkspaceState {
  return {
    openTabs: file ? [file] : [],
    split: "none",
    paneA: file,
    paneB: null,
    focused: "a",
  };
}

export function focusedSceneFile(ws: SceneWorkspaceState): string {
  if (ws.focused === "b" && ws.split !== "none" && ws.paneB) return ws.paneB;
  return ws.paneA;
}

export function otherSceneFile(ws: SceneWorkspaceState): string | null {
  if (ws.split === "none") return null;
  return ws.focused === "b" ? ws.paneA : ws.paneB;
}

export function paneFile(ws: SceneWorkspaceState, pane: ScenePaneId): string | null {
  if (pane === "a") return ws.paneA || null;
  if (ws.split === "none") return null;
  return ws.paneB;
}

export function openSceneTab(ws: SceneWorkspaceState, file: string): SceneWorkspaceState {
  if (!file) return ws;
  const openTabs = ws.openTabs.includes(file) ? ws.openTabs : [...ws.openTabs, file];
  if (ws.focused === "b" && ws.split !== "none") {
    return { ...ws, openTabs, paneB: file, focused: "b" };
  }
  return { ...ws, openTabs, paneA: file, focused: "a" };
}

export function closeSceneTab(ws: SceneWorkspaceState, file: string): SceneWorkspaceState {
  if (ws.openTabs.length <= 1) return ws;
  const openTabs = ws.openTabs.filter((f) => f !== file);
  if (openTabs.length === 0) return ws;
  const fallback = openTabs[0];
  let paneA = ws.paneA === file ? fallback : ws.paneA;
  let paneB = ws.paneB === file ? openTabs.find((f) => f !== paneA) ?? null : ws.paneB;
  if (!openTabs.includes(paneA)) paneA = fallback;
  if (paneB && !openTabs.includes(paneB)) paneB = openTabs.find((f) => f !== paneA) ?? null;
  let focused = ws.focused;
  if (focused === "b" && (!paneB || ws.split === "none")) focused = "a";
  return { ...ws, openTabs, paneA, paneB, focused };
}

export function focusScenePane(ws: SceneWorkspaceState, pane: ScenePaneId): SceneWorkspaceState {
  if (pane === "b" && (ws.split === "none" || !ws.paneB)) return { ...ws, focused: "a" };
  return { ...ws, focused: pane };
}

export function setSceneSplit(
  ws: SceneWorkspaceState,
  split: SplitMode,
  available: string[] = [],
): SceneWorkspaceState {
  if (split === "none") {
    return { ...ws, split: "none", paneB: null, focused: "a" };
  }
  const focused = focusedSceneFile(ws);
  const pool = [...ws.openTabs, ...available];
  const other = pool.find((f) => f && f !== focused) ?? focused;
  const openTabs = ws.openTabs.includes(other) ? ws.openTabs : other ? [...ws.openTabs, other] : ws.openTabs;
  return {
    ...ws,
    split,
    openTabs,
    paneB: ws.paneB && ws.paneB !== focused ? ws.paneB : other,
    focused: ws.focused === "b" ? "b" : "a",
  };
}

export function syncWorkspaceScenes(ws: SceneWorkspaceState, scenes: string[], fallback: string): SceneWorkspaceState {
  if (scenes.length === 0) {
    return createSceneWorkspace(fallback);
  }
  const openTabs = (ws.openTabs.length ? ws.openTabs : [fallback]).filter((f) => scenes.includes(f));
  const tabs = openTabs.length ? openTabs : [scenes[0]];
  const paneA = scenes.includes(ws.paneA) ? ws.paneA : tabs[0];
  const paneB = ws.paneB && scenes.includes(ws.paneB) ? ws.paneB : null;
  let focused = ws.focused;
  if (focused === "b" && (!paneB || ws.split === "none")) focused = "a";
  return { ...ws, openTabs: tabs, paneA, paneB, focused };
}
