import type { AnimationComponent, GameKitScene, SpriteComponent, TilemapComponent, TransformComponent, TextComponent, GuiNode, GuiComponent, NineSliceComponent, Light2DComponent } from "@gamekit/schema";
import { Canvas, Group, Rect, Circle, RoundedRect, Skia, Image as SkiaImage, useImage, Text as SkiaText, useFont, matchFont, Path, RadialGradient } from "@shopify/react-native-skia";
import type { ComponentType, ReactElement, ReactNode } from "react";
import { Fragment, useMemo } from "react";
import { StyleSheet, useWindowDimensions, View, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Particle } from "./particles.js";
import { particleRenderColor, particleRenderSize, particleRenderAlpha } from "./particles.js";
import { pivotTransform } from "./transform.js";
import { computeNineSliceRegions } from "./nineslice.js";
import {
  computeSpotCone,
  pointLightColors,
  LIGHT_GRADIENT_POSITIONS,
} from "./light.js";

// Skia packages may resolve a different @types/react (e.g. 19 vs 18) in monorepos;
// cast Canvas so tsc accepts it without forcing a monorepo-wide React types upgrade.
const SkiaCanvas = Canvas as unknown as ComponentType<{ style?: object; children?: ReactNode }>;
export type TransitionOverlay = {
  opacity: number;
  color?: string;
};

export type GameKitViewProps = {
  scene: GameKitScene;
  assets?: Record<string, unknown>;
  camera?: {
    x: number;
    y: number;
    zoom?: number;
  };
  /** Live particle snapshots keyed by emitter entity id (from GameKitGame loop). */
  particlesByEntity?: Record<string, Particle[]>;
  /** Full-screen overlay for scene transitions. */
  transitionOverlay?: TransitionOverlay | null;
  /** Project-level GUI component definitions for componentInstances. */
  guiComponents?: GuiComponent[];
};

type ViewportScale = {
  scaleX: number;
  scaleY: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  safePadding: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
};

function calculateViewportScale(
  scene: GameKitScene,
  screenWidth: number,
  screenHeight: number,
  insets: { top: number; bottom: number; left: number; right: number }
): ViewportScale {
  const responsive = scene.responsive;
  const safeArea = responsive.safeArea;

  const availableWidth = screenWidth - (safeArea.enabled ? insets.left + insets.right : 0);
  const availableHeight = screenHeight - (safeArea.enabled ? insets.top + insets.bottom : 0);

  const refWidth = responsive.referenceWidth || scene.viewport.width;
  const refHeight = responsive.referenceHeight || scene.viewport.height;

  let scaleX = 1;
  let scaleY = 1;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  switch (responsive.mode) {
    case "fixed":
      scaleX = availableWidth / refWidth;
      scaleY = availableHeight / refHeight;
      scale = Math.min(scaleX, scaleY);
      offsetX = (availableWidth - refWidth * scale) / 2;
      offsetY = (availableHeight - refHeight * scale) / 2;
      break;

    case "scale":
      scaleX = availableWidth / refWidth;
      scaleY = availableHeight / refHeight;
      scale = Math.min(scaleX, scaleY);
      offsetX = (availableWidth - refWidth * scale) / 2;
      offsetY = (availableHeight - refHeight * scale) / 2;
      break;

    case "adaptive":
      scaleX = availableWidth / refWidth;
      scaleY = availableHeight / refHeight;
      scale = Math.min(scaleX, scaleY);
      offsetX = (availableWidth - refWidth * scale) / 2;
      offsetY = (availableHeight - refHeight * scale) / 2;
      break;
  }

  return {
    scaleX,
    scaleY,
    scale,
    offsetX: Math.max(0, offsetX) + (safeArea.enabled ? insets.left : 0),
    offsetY: Math.max(0, offsetY) + (safeArea.enabled ? insets.top : 0),
    safePadding: {
      top: safeArea.enabled ? insets.top + safeArea.padding.top : safeArea.padding.top,
      bottom: safeArea.enabled ? insets.bottom + safeArea.padding.bottom : safeArea.padding.bottom,
      left: safeArea.enabled ? insets.left + safeArea.padding.left : safeArea.padding.left,
      right: safeArea.enabled ? insets.right + safeArea.padding.right : safeArea.padding.right
    }
  };
}

export function GameKitView({
  scene,
  assets = {},
  camera = { x: 0, y: 0, zoom: 1 },
  particlesByEntity = {},
  transitionOverlay = null,
  guiComponents = [],
}: GameKitViewProps): ReactElement {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const viewportScale = useMemo(
    () => calculateViewportScale(scene, screenWidth, screenHeight, insets),
    [scene, screenWidth, screenHeight, insets]
  );

  const guiNodes = useMemo(() => {
    const nodes: Array<{ key: string; node: GuiNode }> = [];
    const componentMap = new Map(guiComponents.map((c) => [c.id, c]));
    for (const instance of scene.gui?.componentInstances ?? []) {
      if (instance.visible === false) continue;
      const component = componentMap.get(instance.componentId);
      if (!component) continue;
      for (const n of component.nodes) {
        if (n.visible === false) continue;
        nodes.push({
          key: `${instance.id}-${n.id}`,
          node: { ...n, x: n.x + instance.x, y: n.y + instance.y },
        });
      }
    }
    for (const n of scene.gui?.nodes ?? []) {
      if (n.visible === false) continue;
      nodes.push({ key: n.id, node: n });
    }
    return nodes;
  }, [scene.gui, guiComponents]);

  return (
    <View style={styles.root}>
      <SkiaCanvas style={styles.canvas}>
        <Group
          transform={[
            { translateX: viewportScale.offsetX },
            { translateY: viewportScale.offsetY },
            { scale: viewportScale.scale },
            { scale: camera.zoom ?? 1 },
            { translateX: -camera.x },
            { translateY: -camera.y }
          ]}
        >
          <Rect
            x={0}
            y={0}
            width={scene.viewport.width}
            height={scene.viewport.height}
            color={scene.viewport.background}
          />
          {scene.entities.map((entity) => {
            const transform = entity.components.find((component): component is TransformComponent => component.type === "Transform");
            if (!transform) return null;

            const nodes: ReactElement[] = [];

            const tilemap = entity.components.find((component): component is TilemapComponent => component.type === "Tilemap");
            if (tilemap) {
              nodes.push(
                <TilemapNode
                  key={`${entity.id}-tilemap`}
                  tilemap={tilemap}
                  transform={transform}
                  source={assets[tilemap.tilesetId]}
                />
              );
            }

            const anim = entity.components.find((component): component is AnimationComponent => component.type === "Animation");
            if (anim) {
              nodes.push(
                <AnimatedSpriteNode
                  key={`${entity.id}-anim`}
                  anim={anim}
                  transform={transform}
                  source={assets[anim.assetId]}
                />
              );
            }

            const sprite = entity.components.find((component): component is SpriteComponent => component.type === "Sprite");
            if (sprite) {
              nodes.push(
                <SpriteNode
                  key={`${entity.id}-sprite`}
                  sprite={sprite}
                  transform={transform}
                  source={assets[sprite.assetId]}
                />
              );
            }

            const nineSlice = entity.components.find((component): component is NineSliceComponent => component.type === "NineSlice");
            if (nineSlice && !sprite) {
              nodes.push(
                <NineSliceNode
                  key={`${entity.id}-nineslice`}
                  nineSlice={nineSlice}
                  transform={transform}
                  source={assets[nineSlice.assetId]}
                />
              );
            }

            const textComp = entity.components.find((component): component is TextComponent => component.type === "Text");
            if (textComp) {
              nodes.push(
                <TextNode
                  key={`${entity.id}-text`}
                  textComponent={textComp}
                  transform={transform}
                  source={assets[textComp.fontAssetId]}
                />
              );
            }

            const liveParticles = particlesByEntity[entity.id];
            if (liveParticles?.length) {
              for (let i = 0; i < liveParticles.length; i++) {
                const p = liveParticles[i];
                nodes.push(
                  <Circle
                    key={`${entity.id}-p-${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={Math.max(0.5, particleRenderSize(p) / 2)}
                    color={Skia.Color(particleRenderColor(p))}
                    opacity={particleRenderAlpha(p)}
                  />,
                );
              }
            }

            const light = entity.components.find((component): component is Light2DComponent => component.type === "Light2D");
            if (light) {
              nodes.push(
                <LightNode
                  key={`${entity.id}-light`}
                  light={light}
                  transform={transform}
                />,
              );
            }

            return nodes.length > 0 ? <Group key={entity.id}>{nodes}</Group> : null;
          })}
        </Group>

        {/* Screen-space GUI / HUD (not affected by camera pan) */}
        <Group
          transform={[
            { translateX: viewportScale.offsetX },
            { translateY: viewportScale.offsetY },
            { scale: viewportScale.scale },
          ]}
        >
          {guiNodes.map(({ key, node }) => (
            <GuiNodeView key={key} node={node} assets={assets} />
          ))}
        </Group>

        {transitionOverlay && transitionOverlay.opacity > 0 && (
          <Rect
            x={0}
            y={0}
            width={screenWidth}
            height={screenHeight}
            color={Skia.Color(transitionOverlay.color ?? "#000000")}
            opacity={transitionOverlay.opacity}
          />
        )}
      </SkiaCanvas>
    </View>
  );
}

function GuiNodeView({
  node,
  assets,
}: {
  node: GuiNode;
  assets: Record<string, unknown>;
}): ReactElement | null {
  const fontFamily = Platform.select({ ios: "Helvetica", default: "sans-serif" });
  const fontSize =
    node.type === "Text"
      ? (node.fontSize ?? 16)
      : node.type === "Button"
        ? (node.fontSize ?? 14)
        : 14;

  // useFont requires a resource; matchFont works for system fonts on Skia
  let font: ReturnType<typeof matchFont> | null = null;
  try {
    font = matchFont({ fontFamily: fontFamily ?? "sans-serif", fontSize });
  } catch {
    font = null;
  }

  if (node.type === "Text") {
    const color = node.color ?? "#ffffff";
    const align = node.align ?? "left";
    const textX =
      align === "center" ? node.x + node.width / 2 : align === "right" ? node.x + node.width : node.x + 4;
    return (
      <Group>
        {font ? (
          <SkiaText
            x={textX}
            y={node.y + fontSize + 2}
            text={node.text}
            font={font}
            color={Skia.Color(color)}
          />
        ) : (
          <Rect x={node.x} y={node.y} width={node.width} height={node.height} color={Skia.Color(color)} opacity={0.15} />
        )}
      </Group>
    );
  }

  if (node.type === "Button") {
    const bg = node.backgroundColor ?? "#333333";
    const color = node.color ?? "#ffffff";
    return (
      <Group>
        <RoundedRect
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          r={6}
          color={Skia.Color(bg)}
        />
        {font ? (
          <SkiaText
            x={node.x + node.width / 2 - (node.text.length * fontSize * 0.28)}
            y={node.y + node.height / 2 + fontSize / 3}
            text={node.text}
            font={font}
            color={Skia.Color(color)}
          />
        ) : null}
      </Group>
    );
  }

  if (node.type === "Image") {
    return (
      <GuiImageNode
        assetId={node.assetId}
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        source={assets[node.assetId]}
      />
    );
  }

  return null;
}

/**
 * Renders a Light2D component with additive blend:
 * - point: radial gradient glow (bright center -> transparent edge) across `range`.
 * - spot: the same radial glow clipped to a cone fan opening along the entity's
 *   rotation (0 = straight up, positive = clockwise).
 * Intensity scales the peak alpha; color defaults to white.
 */
function LightNode({
  light,
  transform,
}: {
  light: Light2DComponent;
  transform: TransformComponent;
}): ReactElement {
  const x = transform.position.x;
  const y = transform.position.y;
  const range = Math.max(0, light.range ?? 0);
  const intensity = Math.max(0, Math.min(1, light.intensity ?? 1));
  const colors = pointLightColors(light.color ?? "#ffffff", intensity);

  if (range <= 0) return <Fragment />;

  if (light.kind === "spot") {
    const cone = computeSpotCone({ x, y }, range, transform.rotation ?? 0);
    const path = Skia.Path.Make();
    path.moveTo(cone.x1, cone.y1);
    path.lineTo(cone.x2, cone.y2);
    path.lineTo(cone.x3, cone.y3);
    path.close();
    return (
      <Path path={path} blendMode={"plus"}>
        <RadialGradient
          c={{ x, y }}
          r={range}
          colors={colors}
          positions={[...LIGHT_GRADIENT_POSITIONS]}
        />
      </Path>
    );
  }

  return (
    <Circle cx={x} cy={y} r={range} blendMode={"plus"}>
      <RadialGradient
        c={{ x, y }}
        r={range}
        colors={colors}
        positions={[...LIGHT_GRADIENT_POSITIONS]}
      />
    </Circle>
  );
}

function GuiImageNode({
  assetId,
  x,
  y,
  width,
  height,
  source,
}: {
  assetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  source: unknown;
}): ReactElement {
  const image = useImage(source as Parameters<typeof useImage>[0]);
  if (!image) {
    return (
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        color={Skia.Color("#444466")}
      />
    );
  }
  return <SkiaImage image={image} x={x} y={y} width={width} height={height} />;
}

function SpriteNode({
  sprite,
  transform,
  source
}: {
  sprite: SpriteComponent;
  transform: TransformComponent;
  source: unknown;
}): ReactElement {
  const image = useImage(source as Parameters<typeof useImage>[0]);
  const x = transform.position.x - sprite.width * sprite.anchor.x;
  const y = transform.position.y - sprite.height * sprite.anchor.y;

  return (
    <Group
      transform={pivotTransform(transform, transform.position.x, transform.position.y)}
    >
      {image ? (
        <SkiaImage
          image={image}
          x={x}
          y={y}
          width={sprite.width}
          height={sprite.height}
        />
      ) : (
        <Rect
          x={x}
          y={y}
          width={sprite.width}
          height={sprite.height}
          color={Skia.Color("#7dd3fc")}
        />
      )}
    </Group>
  );
}

function NineSliceNode({
  nineSlice,
  transform,
  source
}: {
  nineSlice: NineSliceComponent;
  transform: TransformComponent;
  source: unknown;
}): ReactElement {
  const image = useImage(source as Parameters<typeof useImage>[0]);
  const srcWidth = image ? image.width() : nineSlice.width;
  const srcHeight = image ? image.height() : nineSlice.height;

  const cx = transform.position.x;
  const cy = transform.position.y;
  const x0 = cx - nineSlice.width / 2;
  const y0 = cy - nineSlice.height / 2;
  const regions = computeNineSliceRegions(nineSlice, x0, y0, srcWidth, srcHeight);

  if (!image) {
    return (
      <Group
        transform={pivotTransform(transform, transform.position.x, transform.position.y)}
      >
        <Rect x={x0} y={y0} width={nineSlice.width} height={nineSlice.height} color={Skia.Color("#f472b6")} />
      </Group>
    );
  }

  return (
    <Group
      transform={pivotTransform(transform, transform.position.x, transform.position.y)}
    >
      {regions.map((r, i) => {
        const scaleX = r.sw > 0 ? r.w / r.sw : 1;
        const scaleY = r.sh > 0 ? r.h / r.sh : 1;
        return (
          <Group key={i} clip={Skia.RRectXY(Skia.XYWHRect(r.x, r.y, r.w, r.h), 0, 0)}>
            <Group
              transform={[
                { translateX: r.x },
                { translateY: r.y },
                { scaleX },
                { scaleY },
                { translateX: -r.sx },
                { translateY: -r.sy },
              ]}
            >
              <SkiaImage image={image} x={0} y={0} width={srcWidth} height={srcHeight} />
            </Group>
          </Group>
        );
      })}
    </Group>
  );
}

function TilemapNode({
  tilemap,
  transform,
  source
}: {
  tilemap: TilemapComponent;
  transform: TransformComponent;
  source: unknown;
}): ReactElement | null {
  const image = useImage(source as Parameters<typeof useImage>[0]);

  const tiles: ReactElement[] = [];

  for (let i = 0; i < tilemap.tiles.length; i++) {
    const tileId = tilemap.tiles[i];
    if (tileId === 0) continue;

    const gx = i % tilemap.gridWidth;
    const gy = Math.floor(i / tilemap.gridWidth);
    const x = transform.position.x + gx * tilemap.tileWidth;
    const y = transform.position.y + gy * tilemap.tileHeight;

    const srcTileIndex = tileId - 1;
    const srcX = (srcTileIndex % tilemap.columns) * tilemap.tileWidth;
    const srcY = Math.floor(srcTileIndex / tilemap.columns) * tilemap.tileHeight;

    if (!image) {
      tiles.push(
        <Rect
          key={i}
          x={x}
          y={y}
          width={tilemap.tileWidth}
          height={tilemap.tileHeight}
          color={"#a78bfa"}
        />
      );
    } else {
      tiles.push(
        <Group
          key={i}
          clip={Skia.RRectXY(Skia.XYWHRect(x, y, tilemap.tileWidth, tilemap.tileHeight), 0, 0)}
        >
          <SkiaImage
            image={image}
            x={x - srcX}
            y={y - srcY}
            width={tilemap.columns * tilemap.tileWidth}
            height={Math.ceil(tilemap.tiles.length / tilemap.columns) * tilemap.tileHeight}
          />
        </Group>
      );
    }
  }

  return tiles.length > 0 ? (
    <Group
      transform={pivotTransform(transform, transform.position.x, transform.position.y)}
    >
      {tiles}
    </Group>
  ) : null;
}

function AnimatedSpriteNode({
  anim,
  transform,
  source
}: {
  anim: AnimationComponent;
  transform: TransformComponent;
  source: unknown;
}): ReactElement {
  const image = useImage(source as Parameters<typeof useImage>[0]);
  const x = transform.position.x;
  const y = transform.position.y;
  const frame = anim.currentFrame ?? 0;
  const srcX = frame * anim.frameWidth;

  return (
    <Group
      transform={pivotTransform(transform, transform.position.x, transform.position.y)}
    >
      {image ? (
        <Group
          clip={Skia.RRectXY(Skia.XYWHRect(x, y, anim.frameWidth, anim.frameHeight), 0, 0)}
        >
          <SkiaImage
            image={image}
            x={x - srcX}
            y={y}
            width={anim.frameWidth * (anim.totalFrames || 1)}
            height={anim.frameHeight}
          />
        </Group>
      ) : (
        <Rect
          x={x}
          y={y}
          width={anim.frameWidth}
          height={anim.frameHeight}
          color={Skia.Color("#fbbf24")}
        />
      )}
    </Group>
  );
}

function TextNode({
  textComponent,
  transform,
  source
}: {
  textComponent: TextComponent;
  transform: TransformComponent;
  source: unknown;
}): ReactElement | null {
  const assetFont = useFont(
    textComponent.fontAssetId && source ? (source as string) : null,
    textComponent.size,
  );
  const systemFontFamily = Platform.select({ ios: "Helvetica", default: "sans-serif" });
  let systemFont: ReturnType<typeof matchFont> | null = null;
  try {
    systemFont = matchFont({
      fontFamily: systemFontFamily ?? "sans-serif",
      fontSize: textComponent.size,
    });
  } catch {
    systemFont = null;
  }
  const font = assetFont ?? systemFont;
  if (!font) {
    if (__DEV__ && textComponent.fontAssetId) {
      console.warn(
        `[GameKit] Font asset "${textComponent.fontAssetId}" not loaded — text "${textComponent.text.slice(0, 20)}" hidden`,
      );
    }
    return null;
  }

  let x = transform.position.x;
  const y = transform.position.y;

  if (textComponent.align === "center" || textComponent.align === "right") {
    const width = font.getTextWidth(textComponent.text);
    if (textComponent.align === "center") {
      x -= width / 2;
    } else {
      x -= width;
    }
  }

  return (
    <Group
      transform={pivotTransform(transform, transform.position.x, transform.position.y)}
    >
      <SkiaText
        font={font}
        text={textComponent.text}
        x={x}
        y={y}
        color={Skia.Color(textComponent.color)}
      />
    </Group>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden"
  },
  canvas: {
    flex: 1
  }
});
