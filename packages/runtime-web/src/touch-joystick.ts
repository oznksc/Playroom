import Phaser from "phaser";

export type TouchJoystickState = {
  active: boolean;
  center: { x: number; y: number };
  dx: number;
  dy: number;
};

export function setupTouchJoystick(
  scene: Phaser.Scene,
  state: TouchJoystickState,
): void {
  const baseRadius = 50;
  const thumbRadius = 18;
  const travel = 36;
  const base = scene.add.graphics().setDepth(2000).setScrollFactor(0);
  const thumb = scene.add.graphics().setDepth(2001).setScrollFactor(0);

  const drawBase = (x: number, y: number) => {
    base.clear();
    base.fillStyle(0xffffff, 0.15);
    base.fillCircle(x, y, baseRadius);
    base.lineStyle(2, 0xffffff, 0.3);
    base.strokeCircle(x, y, baseRadius);
  };
  const drawThumb = (x: number, y: number) => {
    thumb.clear();
    thumb.fillStyle(0xffffff, 0.8);
    thumb.fillCircle(x, y, thumbRadius);
  };
  const release = () => {
    state.active = false;
    state.dx = 0;
    state.dy = 0;
    base.clear();
    thumb.clear();
  };

  scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
    if (pointer.x >= scene.scale.width / 2) return;
    state.active = true;
    state.center = { x: pointer.x, y: pointer.y };
    state.dx = 0;
    state.dy = 0;
    drawBase(pointer.x, pointer.y);
    drawThumb(pointer.x, pointer.y);
  });
  scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
    if (!state.active || !pointer.isDown) return;
    const dx = pointer.x - state.center.x;
    const dy = pointer.y - state.center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(distance, travel);
    const angle = Math.atan2(dy, dx);
    state.dx = (clamped / travel) * Math.cos(angle);
    state.dy = (clamped / travel) * Math.sin(angle);
    drawThumb(state.center.x + state.dx * travel, state.center.y + state.dy * travel);
  });
  scene.input.on("pointerup", release);
  scene.input.on("pointerupoutside", release);
}
