import type { GameKitScene, ResponsiveConfig, SafeAreaConfig, SpriteComponent, TransformComponent } from "@gamekit/schema";
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
            const sprite = entity.components.find((component): component is SpriteComponent => component.type === "Sprite");

            if (!transform || !sprite) {
              return null;
            }

            return (
              <SpriteNode
                key={entity.id}
                sprite={sprite}
                transform={transform}
                source={assets[sprite.assetId]}
              />
            );
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden"
  },
  canvas: {
    flex: 1
  }
});
