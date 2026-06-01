import type { GameKitAsset } from "@gamekit/schema";
import { useEffect, useMemo, useState } from "react";
import { getApiUrl } from "../lib/api.js";

export function useImageCache(assets: GameKitAsset[]): Map<string, HTMLImageElement> {
  const [version, setVersion] = useState(0);
  const cache = useMemo(() => new Map<string, HTMLImageElement>(), [assets]);

  useEffect(() => {
    let cancelled = false;
    for (const asset of assets) {
      const image = new Image();
      image.onload = () => {
        if (!cancelled) {
          cache.set(asset.id, image);
          setVersion((current) => current + 1);
        }
      };
      image.src = getApiUrl(`/gamekit/assets/${asset.file}`);
    }
    return () => {
      cancelled = true;
    };
  }, [assets, cache]);

  void version;
  return cache;
}
