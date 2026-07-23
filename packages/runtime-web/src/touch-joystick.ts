import Phaser from "phaser";
import type { InputMapConfig } from "@gamekit/schema";
import { DEFAULT_INPUT_MAP } from "@gamekit/schema";

export type TouchJoystickState = {
  active: boolean;
  center: { x: number; y: number };
  dx: number;
  dy: number;
  /** Discrete on-screen buttons (multi-touch friendly). */
  jump: boolean;
  fire: boolean;
  action: boolean;
};

type ButtonHandle = {
  control: "jump" | "fire" | "action";
  hit: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  pointerId: number | null;
};

function resolveButtons(inputMap?: InputMapConfig): Array<"jump" | "fire" | "action"> {
  const map = inputMap?.bindings?.length ? inputMap : DEFAULT_INPUT_MAP;
  const set = new Set<"jump" | "fire" | "action">();
  for (const b of map.bindings) {
    if (b.touchControl === "jump" || b.touchControl === "fire" || b.touchControl === "action") {
      set.add(b.touchControl);
    }
  }
  if (set.size === 0) set.add("jump");
  return [...set];
}

/**
 * Multi-touch virtual stick (left half) + action buttons (right half).
 * Each pointer is tracked independently so stick + buttons work together.
 */
export function setupTouchJoystick(
  scene: Phaser.Scene,
  state: TouchJoystickState,
  inputMap?: InputMapConfig,
): void {
  const baseRadius = 50;
  const thumbRadius = 18;
  const travel = 36;
  const base = scene.add.graphics().setDepth(2000).setScrollFactor(0);
  const thumb = scene.add.graphics().setDepth(2001).setScrollFactor(0);

  let stickPointerId: number | null = null;

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
  const releaseStick = () => {
    state.active = false;
    state.dx = 0;
    state.dy = 0;
    stickPointerId = null;
    base.clear();
    thumb.clear();
  };

  // Action buttons on the right
  const buttons: ButtonHandle[] = [];
  const layout: Array<{ control: "jump" | "fire" | "action"; label: string; ox: number; oy: number; r: number }> = [
    { control: "jump", label: "A", ox: 70, oy: 70, r: 34 },
    { control: "fire", label: "B", ox: 140, oy: 110, r: 28 },
    { control: "action", label: "X", ox: 150, oy: 50, r: 26 },
  ];
  const enabled = new Set(resolveButtons(inputMap));

  for (const spec of layout) {
    if (!enabled.has(spec.control)) continue;
    const cx = () => scene.scale.width - spec.ox;
    const cy = () => scene.scale.height - spec.oy;
    const hit = scene.add
      .circle(cx(), cy(), spec.r, 0xffffff, 0.18)
      .setStrokeStyle(2, 0xffffff, 0.45)
      .setScrollFactor(0)
      .setDepth(2002)
      .setInteractive({ useHandCursor: true });
    const label = scene.add
      .text(cx(), cy(), spec.label, {
        fontFamily: "IBM Plex Sans, system-ui, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2003);

    const handle: ButtonHandle = { control: spec.control, hit, label, pointerId: null };
    buttons.push(handle);

    hit.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      handle.pointerId = pointer.id;
      state[spec.control] = true;
      hit.setFillStyle(0x00f0ff, 0.35);
    });
    const releaseBtn = (pointer: Phaser.Input.Pointer) => {
      if (handle.pointerId !== pointer.id) return;
      handle.pointerId = null;
      state[spec.control] = false;
      hit.setFillStyle(0xffffff, 0.18);
    };
    hit.on("pointerup", releaseBtn);
    hit.on("pointerupoutside", releaseBtn);
    hit.on("pointerout", (pointer: Phaser.Input.Pointer) => {
      // Only release if this pointer owned the button
      if (handle.pointerId === pointer.id) releaseBtn(pointer);
    });
  }

  // Reposition buttons on resize
  scene.scale.on("resize", () => {
    for (const spec of layout) {
      const handle = buttons.find((b) => b.control === spec.control);
      if (!handle) continue;
      const cx = scene.scale.width - spec.ox;
      const cy = scene.scale.height - spec.oy;
      handle.hit.setPosition(cx, cy);
      handle.label.setPosition(cx, cy);
    }
  });

  // Stick uses left half only; ignore pointers that hit buttons
  scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
    if (pointer.x >= scene.scale.width / 2) return;
    if (stickPointerId !== null) return;
    stickPointerId = pointer.id;
    state.active = true;
    state.center = { x: pointer.x, y: pointer.y };
    state.dx = 0;
    state.dy = 0;
    drawBase(pointer.x, pointer.y);
    drawThumb(pointer.x, pointer.y);
  });
  scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
    if (stickPointerId !== pointer.id || !pointer.isDown) return;
    const dx = pointer.x - state.center.x;
    const dy = pointer.y - state.center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(distance, travel);
    const angle = Math.atan2(dy, dx);
    state.dx = (clamped / travel) * Math.cos(angle);
    state.dy = (clamped / travel) * Math.sin(angle);
    drawThumb(state.center.x + state.dx * travel, state.center.y + state.dy * travel);
  });
  scene.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
    if (stickPointerId === pointer.id) releaseStick();
  });
  scene.input.on("pointerupoutside", (pointer: Phaser.Input.Pointer) => {
    if (stickPointerId === pointer.id) releaseStick();
  });
}
