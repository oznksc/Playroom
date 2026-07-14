import type { GameKitAsset, GameKitEntity } from "@gamekit/schema";

/** Props shared by every inspector section component. */
export type OnChange = (mutator: (entity: GameKitEntity) => void) => void;
export type SectionAssets = GameKitAsset[];
