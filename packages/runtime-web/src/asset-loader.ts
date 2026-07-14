import type Phaser from "phaser";
import type { GameKitEntity } from "@gamekit/schema";
import {
  type AnimationComponent,
  type AudioSourceComponent,
  type NineSliceComponent,
  type SpriteComponent,
  type TextComponent,
} from "@gamekit/schema";
import { findComponent } from "./scene-helpers.js";

type FontRegistry = Map<string, string>;

function fontFormat(url: string): string {
  const ext = url.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "woff2") return "woff2";
  if (ext === "woff") return "woff";
  if (ext === "otf") return "opentype";
  return "truetype";
}

export function preloadEntityAssets(
  loader: Phaser.Loader.LoaderPlugin,
  entities: GameKitEntity[],
  assetUrls: Record<string, string>,
  loadedFonts: FontRegistry,
): void {
  const loadedKeys = new Set<string>();

  for (const entity of entities) {
    const sprite = findComponent<SpriteComponent>(entity, "Sprite");
    const animation = findComponent<AnimationComponent>(entity, "Animation");
    if (animation && !loadedKeys.has(animation.assetId) && assetUrls[animation.assetId]) {
      loader.spritesheet(animation.assetId, assetUrls[animation.assetId], {
        frameWidth: animation.frameWidth,
        frameHeight: animation.frameHeight,
      });
      loadedKeys.add(animation.assetId);
    } else if (sprite && !loadedKeys.has(sprite.assetId) && assetUrls[sprite.assetId]) {
      loader.image(sprite.assetId, assetUrls[sprite.assetId]);
      loadedKeys.add(sprite.assetId);
    }

    const audio = findComponent<AudioSourceComponent>(entity, "AudioSource");
    if (audio && !loadedKeys.has(audio.assetId) && assetUrls[audio.assetId]) {
      loader.audio(audio.assetId, assetUrls[audio.assetId]);
      loadedKeys.add(audio.assetId);
    }

    const nineSlice = findComponent<NineSliceComponent>(entity, "NineSlice");
    if (nineSlice && !loadedKeys.has(nineSlice.assetId) && assetUrls[nineSlice.assetId]) {
      loader.image(nineSlice.assetId, assetUrls[nineSlice.assetId]);
      loadedKeys.add(nineSlice.assetId);
    }

    const text = findComponent<TextComponent>(entity, "Text");
    if (!text?.fontAssetId || loadedKeys.has(`font:${text.fontAssetId}`) || !assetUrls[text.fontAssetId]) continue;
    loadedKeys.add(`font:${text.fontAssetId}`);
    const family = `GKFont-${text.fontAssetId}`;
    const url = assetUrls[text.fontAssetId];
    const style = document.createElement("style");
    style.textContent = `@font-face{font-family:'${family}';src:url('${url}') format('${fontFormat(url)}');font-display:swap;}`;
    document.head.appendChild(style);
    new FontFace(family, `url(${url})`).load().then((loaded) => {
      (document.fonts as unknown as { add(font: FontFace): void }).add(loaded);
      loadedFonts.set(text.fontAssetId, family);
    }).catch(() => undefined);
  }
}
