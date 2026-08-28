import { encodePng } from "./png-encoder.js";
import { type PaletteName, PALETTES, type ColorRGBA } from "./sprite-gen.js";

export type AnimationAction = "idle" | "walk" | "run" | "jump" | "attack" | "hurt" | "die";

export type SpritesheetOptions = {
  id?: string;
  archetype?: string;
  animation?: AnimationAction;
  frameCount?: number;
  frameSize?: number;
  fps?: number;
  palette?: PaletteName;
};

export type GeneratedSpritesheet = {
  id: string;
  buffer: Buffer;
  frameWidth: number;
  frameHeight: number;
  totalFrames: number;
  framesPerSecond: number;
  sheetWidth: number;
  sheetHeight: number;
  dataUrl: string;
  animation: AnimationAction;
  archetype: string;
};

/**
 * Procedural Multi-Frame Character Spritesheet Generator.
 * Generates horizontal spritesheets (frameWidth * totalFrames x frameHeight)
 * compatible with Playroom's Animation component.
 */
export function generateCharacterSpritesheet(
  options: SpritesheetOptions = {}
): GeneratedSpritesheet {
  const archetype = (options.archetype || "hero").toLowerCase();
  const animation = options.animation || "walk";
  const frameCount =
    options.frameCount ??
    (animation === "walk" || animation === "run" ? 4 : animation === "idle" ? 4 : 4);
  const frameSize = options.frameSize ?? 32;
  const fps = options.fps ?? (animation === "run" ? 10 : animation === "walk" ? 8 : 6);
  const paletteName = options.palette ?? "pico8";
  const palette = PALETTES[paletteName] || PALETTES.pico8;

  const sheetWidth = frameSize * frameCount;
  const sheetHeight = frameSize;
  const rgbaPixels = new Uint8Array(sheetWidth * sheetHeight * 4);

  const gridRes = 16;
  const scale = frameSize / gridRes;
  const mid = Math.floor(gridRes / 2);

  const primaryColor = palette[Math.min(palette.length - 1, 2)];
  const accentColor = palette[Math.min(palette.length - 1, 8)]; // Bright accent
  const skinTone = palette[palette.length - 1];
  const darkColor = palette[0];
  const isSlime = archetype.includes("slime");

  for (let frame = 0; frame < frameCount; frame++) {
    const frameGrid = new Array<ColorRGBA | null>(gridRes * gridRes).fill(null);

    function setPixel(x: number, y: number, col: ColorRGBA | null) {
      if (x >= 0 && x < gridRes && y >= 0 && y < gridRes) {
        frameGrid[y * gridRes + x] = col;
      }
    }

    function setSym(x: number, y: number, col: ColorRGBA | null) {
      setPixel(x, y, col);
      setPixel(gridRes - 1 - x, y, col);
    }

    // Animation specific offsets and poses
    let bodyOffsetY = 0;
    let legOffsetL = 0;
    let legOffsetR = 0;
    let armAngle = 0;
    let attackSlash = false;

    if (animation === "idle") {
      // Breathing bob (0, -1, 0, 1)
      bodyOffsetY = frame === 1 || frame === 2 ? -1 : 0;
    } else if (animation === "walk") {
      // 4-frame walk cycle
      if (frame === 0) {
        legOffsetL = -1;
        legOffsetR = 1;
        bodyOffsetY = 0;
      } else if (frame === 1) {
        legOffsetL = 0;
        legOffsetR = 0;
        bodyOffsetY = -1;
      } else if (frame === 2) {
        legOffsetL = 1;
        legOffsetR = -1;
        bodyOffsetY = 0;
      } else {
        legOffsetL = 0;
        legOffsetR = 0;
        bodyOffsetY = -1;
      }
    } else if (animation === "run") {
      // Fast run cycle with body lean
      if (frame === 0) {
        legOffsetL = -2;
        legOffsetR = 2;
        bodyOffsetY = 0;
      } else if (frame === 1) {
        legOffsetL = -1;
        legOffsetR = 0;
        bodyOffsetY = -2;
      } else if (frame === 2) {
        legOffsetL = 2;
        legOffsetR = -2;
        bodyOffsetY = 0;
      } else {
        legOffsetL = 0;
        legOffsetR = -1;
        bodyOffsetY = -2;
      }
    } else if (animation === "jump") {
      if (frame === 0)
        bodyOffsetY = 1; // Crouch prep
      else if (frame === 1)
        bodyOffsetY = -3; // Rising apex
      else if (frame === 2)
        bodyOffsetY = -1; // Falling
      else bodyOffsetY = 1; // Landing
    } else if (animation === "attack") {
      if (frame === 0) {
        armAngle = -1; // Windup
      } else if (frame === 1) {
        armAngle = 2; // Slash strike
        attackSlash = true;
      } else if (frame === 2) {
        armAngle = 3; // Follow-through
      } else {
        armAngle = 0; // Recover
      }
    } else if (animation === "hurt") {
      bodyOffsetY = frame === 0 ? -1 : 0;
      // Recoil shift
    } else if (animation === "die") {
      bodyOffsetY = frame * 2; // Collapse down
    }

    if (isSlime) {
      // Slime squashing and stretching
      const squashX = animation === "idle" && frame % 2 === 1 ? 1 : 0;
      const squashY = bodyOffsetY;
      for (let y = gridRes - 6 + squashY; y < gridRes - 1; y++) {
        const w = 4 + squashX;
        for (let x = mid - w; x <= mid; x++) {
          setSym(x, y, primaryColor);
        }
      }
      setSym(mid - 2, gridRes - 4 + squashY, darkColor);
    } else {
      // Bipedal character rendering
      const by = bodyOffsetY;

      // Head (y: 2..6 + by)
      for (let y = 2 + by; y <= 6 + by; y++) {
        const w = y === 2 + by ? 2 : 3;
        for (let x = mid - w; x <= mid; x++) {
          setSym(x, y, skinTone);
        }
      }
      // Eyes
      setSym(mid - 2, 4 + by, darkColor);

      // Hair / Hat (y: 1..3 + by)
      for (let x = mid - 3; x <= mid; x++) {
        setSym(x, 1 + by, accentColor);
        setSym(x, 2 + by, accentColor);
      }

      // Torso / Shirt (y: 7..10 + by)
      for (let y = 7 + by; y <= 10 + by; y++) {
        const w = y === 10 + by ? 2 : 3;
        for (let x = mid - w; x <= mid; x++) {
          setSym(x, y, primaryColor);
        }
      }

      // Belt
      for (let x = mid - 2; x <= mid; x++) {
        setSym(x, 10 + by, darkColor);
      }

      // Left Leg (x: mid - 2, y: 11..14)
      for (let y = 11; y <= 14; y++) {
        setPixel(mid - 2 + legOffsetL, y, darkColor);
      }
      // Right Leg (x: mid + 1, y: 11..14)
      for (let y = 11; y <= 14; y++) {
        setPixel(mid + 1 + legOffsetR, y, darkColor);
      }

      // Arms & Weapon
      if (attackSlash) {
        // Weapon slash arc (bright cyan/yellow trail)
        for (let i = 0; i <= 5; i++) {
          setPixel(mid + 2 + i, 5 + by - Math.floor(i / 2), [0, 240, 255, 255]);
        }
      } else {
        setPixel(mid - 4, 8 + by + armAngle, skinTone);
        setPixel(mid + 3, 8 + by - armAngle, skinTone);
      }
    }

    // Copy frame grid to the horizontal spritesheet buffer at frame * frameSize
    const frameStartX = frame * frameSize;
    for (let gy = 0; gy < gridRes; gy++) {
      for (let gx = 0; gx < gridRes; gx++) {
        const color = frameGrid[gy * gridRes + gx];
        if (!color) continue;

        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = frameStartX + Math.floor(gx * scale + sx);
            const py = Math.floor(gy * scale + sy);
            if (px < sheetWidth && py < sheetHeight) {
              const offset = (py * sheetWidth + px) * 4;
              rgbaPixels[offset] = color[0];
              rgbaPixels[offset + 1] = color[1];
              rgbaPixels[offset + 2] = color[2];
              rgbaPixels[offset + 3] = color[3];
            }
          }
        }
      }
    }
  }

  const buffer = encodePng(rgbaPixels, sheetWidth, sheetHeight);
  const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
  const id = options.id ?? `anim-${archetype}-${animation}`;

  return {
    id,
    buffer,
    frameWidth: frameSize,
    frameHeight: frameSize,
    totalFrames: frameCount,
    framesPerSecond: fps,
    sheetWidth,
    sheetHeight,
    dataUrl,
    animation,
    archetype,
  };
}
