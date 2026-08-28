export type EditorSidebarTab =
  | "entities"
  | "scenes"
  | "prefabs"
  | "agent"
  | "world"
  | "levels"
  | "guis"
  | "components"
  | "recipes"
  | "services";

export type EditorBottomTab = "assets" | "studio" | "timeline" | "console";

export type EditorTabBarDestination =
  | "hierarchy"
  | "scenes"
  | "prefabs"
  | "levels"
  | "guis"
  | "gui-components"
  | "recipes"
  | "services"
  | "content"
  | "agent"
  | "world";

export type EditorDestination =
  | { region: "canvas" }
  | { region: "left"; tab: EditorSidebarTab }
  | { region: "bottom"; tab: EditorBottomTab };

export interface EditorLayoutState {
  destination: EditorDestination;
  inspectorOpen: boolean;
}

export type EditorLayoutAction =
  | { type: "navigate"; destination: EditorDestination }
  | { type: "toggle"; destination: Exclude<EditorDestination, { region: "canvas" }> }
  | { type: "close-navigation" }
  | { type: "set-inspector-open"; open: boolean };

export const INITIAL_EDITOR_LAYOUT: EditorLayoutState = {
  destination: { region: "canvas" },
  inspectorOpen: false,
};

export function editorLayoutReducer(
  state: EditorLayoutState,
  action: EditorLayoutAction,
): EditorLayoutState {
  switch (action.type) {
    case "navigate":
      return { ...state, destination: action.destination };
    case "toggle":
      return {
        ...state,
        destination: destinationsEqual(state.destination, action.destination)
          ? { region: "canvas" }
          : action.destination,
      };
    case "close-navigation":
      return { ...state, destination: { region: "canvas" } };
    case "set-inspector-open":
      return { ...state, inspectorOpen: action.open };
  }
}

export function destinationsEqual(a: EditorDestination, b: EditorDestination): boolean {
  if (a.region !== b.region) return false;
  if (a.region === "canvas" || b.region === "canvas") return true;
  return a.tab === b.tab;
}

export function getLeftDestination(destination: EditorDestination): EditorSidebarTab | null {
  return destination.region === "left" ? destination.tab : null;
}

export function getBottomDestination(destination: EditorDestination): EditorBottomTab | null {
  return destination.region === "bottom" ? destination.tab : null;
}

const TAB_BAR_DESTINATIONS: Record<EditorSidebarTab, EditorTabBarDestination> = {
  entities: "hierarchy",
  scenes: "scenes",
  prefabs: "prefabs",
  levels: "levels",
  guis: "guis",
  components: "gui-components",
  recipes: "recipes",
  services: "services",
  agent: "agent",
  world: "world",
};

export function getTabBarDestination(
  destination: EditorDestination,
): EditorTabBarDestination | null {
  if (destination.region === "canvas") return null;
  if (destination.region === "bottom") return "content";
  return TAB_BAR_DESTINATIONS[destination.tab];
}
