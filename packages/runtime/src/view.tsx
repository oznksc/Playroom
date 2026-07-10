import type { AnimationComponent, GameKitScene, SpriteComponent, TilemapComponent, TransformComponent } from "@gamekit/schema";
import { Canvas, Group, Rect, Skia, Image as SkiaImage, useImage } from "@shopify/react-native-skia";
import type { ReactElement } from "react";
import { useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type GameKitViewProps = {
  scene: GameKitScene;
  assets?: Record<string, unknown>;
  camera?: {
    x: number;
    y: number;
    zoom?: number;
  };
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

export function GameKitView({ scene, assets = {}, camera = { x: 0, y: 0, zoom: 1 } }: GameKitViewProps): ReactElement {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const viewportScale = useMemo(
    () => calculateViewportScale(scene, screenWidth, screenHeight, insets),
    [scene, screenWidth, screenHeight, insets]
  );

  return (
    <View style={styles.root}>
      <Canvas style={styles.canvas}>
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

            return nodes.length > 0 ? <Group key={entity.id}>{nodes}</Group> : null;
          })}
        </Group>
      </Canvas>
    </View>
  );
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

  if (!image) {
    return (
      <Rect
        x={x}
        y={y}
        width={sprite.width}
        height={sprite.height}
        color={Skia.Color("#7dd3fc")}
      />
    );
  }

  return (
    <SkiaImage
      image={image}
      x={x}
      y={y}
      width={sprite.width}
      height={sprite.height}
    />
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

  return tiles.length > 0 ? <>{tiles}</> : null;
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

  if (!image) {
    return (
      <Rect
        x={x}
        y={y}
        width={anim.frameWidth}
        height={anim.frameHeight}
        color={Skia.Color("#fbbf24")}
      />
    );
  }

  return (
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
