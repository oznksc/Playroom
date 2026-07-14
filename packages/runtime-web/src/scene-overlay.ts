import type Phaser from "phaser";

export function showSceneOverlay(
  scene: Phaser.Scene,
  current: Phaser.GameObjects.Text | null,
  message: string,
  color: string,
): Phaser.GameObjects.Text {
  if (current) {
    current.setColor(color);
    current.setText(message);
    return current;
  }

  const overlay = scene.add
    .text(scene.scale.width / 2, scene.scale.height / 2, message, {
      fontFamily: "IBM Plex Sans, system-ui, sans-serif",
      fontSize: "28px",
      color,
      backgroundColor: "#06090ecc",
      padding: { x: 20, y: 12 },
      align: "center",
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(2000);

  scene.add
    .text(scene.scale.width / 2, scene.scale.height / 2 + 48, "Refresh page to retry", {
      fontFamily: "IBM Plex Sans, system-ui, sans-serif",
      fontSize: "14px",
      color: "#8b9bb4",
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(2000);

  return overlay;
}
