import type { GameKitAsset } from "@gamekit/schema";

export type ProjectSnapshot = {
  scenes: string[];
  assets: GameKitAsset[];
};

export type SaveState = "idle" | "saving" | "saved" | "error";
