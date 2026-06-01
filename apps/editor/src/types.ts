import type { GameKitAsset, GameKitLevel, GuiComponent } from "@gamekit/schema";

export type ProjectSnapshot = {
  scenes: string[];
  assets: GameKitAsset[];
  levels: GameKitLevel[];
  guiComponents: GuiComponent[];
};

export type SaveState = "idle" | "saving" | "saved" | "error";
