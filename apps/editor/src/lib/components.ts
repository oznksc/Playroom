import type { GameKitAsset, GameKitEntity } from "@gamekit/schema";

export function findComponent<T extends { type: string }>(entity: GameKitEntity, type: T["type"]): T | undefined {
  return entity.components.find((component) => component.type === type) as T | undefined;
}

export function colorForAsset(assetId: string, assets: GameKitAsset[]): string {
  const index = Math.max(0, assets.findIndex((asset) => asset.id === assetId));
  return ["#4f9cf7", "#34d399", "#f0c846", "#f472b6", "#c084fc"][index % 5];
}
