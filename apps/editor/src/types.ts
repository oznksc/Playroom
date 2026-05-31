import type { GameKitAsset, GameKitLevel } from "@gamekit/schema";

export type ProjectSnapshot = {
  scenes: string[];
  assets: GameKitAsset[];
  levels: GameKitLevel[];
};

export type SaveState = "idle" | "saving" | "saved" | "error";
