import type { GameKitAsset, GameKitLevel, GuiComponent, GameKitProject } from "@gamekit/schema";

export type ProjectSnapshot = {
  project?: GameKitProject;
  scenes: string[];
  assets: GameKitAsset[];
  levels: GameKitLevel[];
  guiComponents: GuiComponent[];
};

export type SaveState = "idle" | "saving" | "saved" | "error";
