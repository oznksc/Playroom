import type { GameKitScene, SpriteComponent, TransformComponent } from "@gamekit/schema";
import { Canvas, Group, Rect, Skia, Image as SkiaImage, useImage } from "@shopify/react-native-skia";
import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";

export type GameKitViewProps = {
  scene: GameKitScene;
  assets?: Record<string, unknown>;
  camera?: {
    x: number;
    y: number;
    zoom?: number;
  };
};

export function GameKitView({ scene, assets = {}, camera = { x: 0, y: 0, zoom: 1 } }: GameKitViewProps): ReactElement {
  return (
    <View style={styles.root}>
      <Canvas style={styles.canvas}>
        <Rect
          x={0}
          y={0}
          width={scene.viewport.width}
          height={scene.viewport.height}
          color={scene.viewport.background}
        />
        <Group transform={[
          { scale: camera.zoom ?? 1 },
          { translateX: -camera.x },
          { translateY: -camera.y }
        ]}>
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
