import { encodePng } from "./png-encoder.js";

export type SpriteCategory = "character" | "enemy" | "item" | "tile" | "prop" | "icon";

export type PaletteName = "pico8" | "gameboy" | "cyberpunk" | "nes" | "pastel" | "monochrome";

export type SpriteOptions = {
  id?: string;
  category?: SpriteCategory;
  archetype?: string;
  palette?: PaletteName;
  size?: number;
  prompt?: string;
  seed?: number;
};

export type ColorRGBA = [number, number, number, number];

export const PALETTES: Record<PaletteName, ColorRGBA[]> = {
  pico8: [
    [0, 0, 0, 255],
    [29, 43, 83, 255],
    [126, 37, 83, 255],
    [0, 135, 81, 255],
    [171, 82, 54, 255],
    [95, 87, 79, 255],
    [194, 195, 199, 255],
    [255, 241, 232, 255],
    [255, 0, 77, 255],
    [255, 163, 0, 255],
    [255, 236, 39, 255],
    [0, 228, 54, 255],
    [41, 173, 255, 255],
    [131, 118, 156, 255],
    [255, 119, 168, 255],
    [255, 204, 170, 255],
  ],
  gameboy: [
    [15, 56, 15, 255],
    [48, 98, 48, 255],
    [139, 172, 15, 255],
    [155, 188, 15, 255],
  ],
  cyberpunk: [
    [10, 10, 20, 255],
    [0, 240, 255, 255], // Cyber Cyan
    [255, 0, 128, 255], // Neon Magenta
    [139, 92, 246, 255], // Violet
    [250, 204, 21, 255], // Electric Yellow
    [34, 197, 94, 255], // Matrix Green
    [240, 240, 250, 255],
  ],
  nes: [
    [0, 0, 0, 255],
    [252, 152, 56, 255],
    [248, 56, 0, 255],
    [0, 168, 0, 255],
    [0, 120, 248, 255],
    [252, 224, 168, 255],
    [252, 252, 252, 255],
  ],
  pastel: [
    [255, 179, 186, 255],
    [255, 223, 186, 255],
    [255, 255, 186, 255],
    [186, 255, 201, 255],
    [186, 225, 255, 255],
    [220, 186, 255, 255],
    [40, 40, 60, 255],
  ],
  monochrome: [
    [0, 0, 0, 255],
    [64, 64, 64, 255],
    [128, 128, 128, 255],
    [192, 192, 192, 255],
    [255, 255, 255, 255],
  ],
};

export type GeneratedSprite = {
  id: string;
  buffer: Buffer;
  width: number;
  height: number;
  dataUrl: string;
  category: SpriteCategory;
  palette: PaletteName;
};

/**
 * Procedural Sprite & Pixel Art Generator.
 */
export function generateSprite(options: SpriteOptions = {}): GeneratedSprite {
  const category =
    options.category ?? inferCategoryFromPrompt(options.prompt || options.archetype || "character");
  const archetype = (options.archetype || options.prompt || "hero").toLowerCase();
  const paletteName = options.palette ?? "pico8";
  const palette = PALETTES[paletteName] || PALETTES.pico8;
  const targetSize = options.size ?? 32;

  // Internal logical grid resolution (e.g. 16x16 or 24x24 pixel grid, scaled to targetSize)
  const gridRes = targetSize <= 16 ? 16 : targetSize <= 32 ? 16 : 24;
  const grid = new Array<ColorRGBA | null>(gridRes * gridRes).fill(null);

  // Initialize PRNG
  let seed = options.seed ?? hashString(archetype + category + paletteName);
  function rand(): number {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function setPixel(x: number, y: number, color: ColorRGBA | null) {
    if (x >= 0 && x < gridRes && y >= 0 && y < gridRes) {
      grid[y * gridRes + x] = color;
    }
  }

  function setSymmetricPixel(x: number, y: number, color: ColorRGBA | null) {
    setPixel(x, y, color);
    setPixel(gridRes - 1 - x, y, color);
  }

  const primaryColor =
    palette[Math.min(palette.length - 1, 1 + Math.floor(rand() * (palette.length - 1)))];
  const accentColor =
    palette[Math.min(palette.length - 1, 1 + Math.floor(rand() * (palette.length - 1)))];
  const skinTone = palette[palette.length - 1]; // Lightest tone
  const outlineColor = palette[0]; // Darkest tone

  // Build procedural pixel matrix by category
  if (category === "character" || category === "enemy") {
    generateCharacterMatrix(
      setSymmetricPixel,
      gridRes,
      archetype,
      primaryColor,
      accentColor,
      skinTone,
      outlineColor,
      rand
    );
  } else if (category === "item") {
    generateItemMatrix(
      setPixel,
      setSymmetricPixel,
      gridRes,
      archetype,
      primaryColor,
      accentColor,
      outlineColor,
      rand
    );
  } else if (category === "tile") {
    generateTileMatrix(setPixel, gridRes, archetype, primaryColor, accentColor, outlineColor, rand);
  } else if (category === "prop") {
    generatePropMatrix(
      setPixel,
      setSymmetricPixel,
      gridRes,
      archetype,
      primaryColor,
      accentColor,
      outlineColor,
      rand
    );
  } else {
    generateIconMatrix(
      setPixel,
      setSymmetricPixel,
      gridRes,
      archetype,
      primaryColor,
      accentColor,
      outlineColor,
      rand
    );
  }

  // Scale grid into full targetSize RGBA pixel array
  const scale = targetSize / gridRes;
  const rgbaPixels = new Uint8Array(targetSize * targetSize * 4);

  for (let gy = 0; gy < gridRes; gy++) {
    for (let gx = 0; gx < gridRes; gx++) {
      const color = grid[gy * gridRes + gx];
      if (!color) continue; // Transparent

      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const px = Math.floor(gx * scale + sx);
          const py = Math.floor(gy * scale + sy);
          if (px < targetSize && py < targetSize) {
            const offset = (py * targetSize + px) * 4;
            rgbaPixels[offset] = color[0];
            rgbaPixels[offset + 1] = color[1];
            rgbaPixels[offset + 2] = color[2];
            rgbaPixels[offset + 3] = color[3];
          }
        }
      }
    }
  }

  const buffer = encodePng(rgbaPixels, targetSize, targetSize);
  const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
  const id = options.id ?? `${category}-${archetype.replace(/[^a-z0-9]+/g, "-")}`;

  return {
    id,
    buffer,
    width: targetSize,
    height: targetSize,
    dataUrl,
    category,
    palette: paletteName,
  };
}

function generateCharacterMatrix(
  setSym: (x: number, y: number, col: ColorRGBA | null) => void,
  res: number,
  type: string,
  primary: ColorRGBA,
  accent: ColorRGBA,
  skin: ColorRGBA,
  dark: ColorRGBA,
  rand: () => number
) {
  const mid = Math.floor(res / 2);
  const isSlime = type.includes("slime") || type.includes("blob");
  const isKnight = type.includes("knight") || type.includes("warrior");
  const isWizard = type.includes("wizard") || type.includes("mage");

  if (isSlime) {
    // Round bouncy body
    for (let y = res - 6; y < res - 1; y++) {
      const width = y === res - 2 ? 6 : y === res - 3 ? 5 : 4;
      for (let x = mid - width; x <= mid; x++) {
        setSym(x, y, primary);
      }
    }
    // Eyes
    setSym(mid - 2, res - 4, [255, 255, 255, 255]);
    setSym(mid - 2, res - 4, dark);
    return;
  }

  // Head / Helmet (y: 2..6)
  for (let y = 2; y <= 6; y++) {
    const w = y === 2 ? 2 : 3;
    for (let x = mid - w; x <= mid; x++) {
      setSym(x, y, isKnight ? accent : isWizard ? accent : skin);
    }
  }
  // Eyes (y: 4)
  setSym(mid - 2, 4, dark);

  // Hair / Hat / Helmet crest (y: 1..3)
  for (let x = mid - 3; x <= mid; x++) {
    setSym(x, 1, accent);
    setSym(x, 2, accent);
  }

  // Torso / Armor (y: 7..11)
  for (let y = 7; y <= 11; y++) {
    const w = y === 11 ? 2 : 3;
    for (let x = mid - w; x <= mid; x++) {
      setSym(x, y, primary);
    }
  }

  // Belt / Accent (y: 10)
  for (let x = mid - 3; x <= mid; x++) {
    setSym(x, 10, accent);
  }

  // Arms / Hands (y: 7..10)
  setSym(mid - 4, 8, primary);
  setSym(mid - 4, 9, skin);

  // Legs / Boots (y: 12..14)
  for (let y = 12; y <= 14; y++) {
    setSym(mid - 2, y, dark);
  }
}

function generateItemMatrix(
  setPix: (x: number, y: number, col: ColorRGBA | null) => void,
  setSym: (x: number, y: number, col: ColorRGBA | null) => void,
  res: number,
  type: string,
  primary: ColorRGBA,
  accent: ColorRGBA,
  dark: ColorRGBA,
  rand: () => number
) {
  const mid = Math.floor(res / 2);
  const isCoin = type.includes("coin") || type.includes("gem") || type.includes("crystal");
  const isPotion = type.includes("potion") || type.includes("bottle") || type.includes("flask");
  const isHeart = type.includes("heart") || type.includes("life");

  if (isHeart) {
    const heartShape = [
      [mid - 2, 4],
      [mid - 1, 3],
      [mid, 4],
      [mid - 3, 5],
      [mid - 2, 5],
      [mid - 1, 5],
      [mid, 5],
      [mid - 3, 6],
      [mid - 2, 6],
      [mid - 1, 6],
      [mid, 6],
      [mid - 2, 7],
      [mid - 1, 7],
      [mid, 7],
      [mid - 1, 8],
      [mid, 8],
      [mid, 9],
    ];
    for (const [x, y] of heartShape) {
      setSym(x, y, primary);
    }
    // Highlight
    setPix(mid - 2, 4, [255, 255, 255, 255]);
    return;
  }

  if (isCoin) {
    // Round gold coin or faceted gem
    for (let y = 3; y <= 12; y++) {
      const radius = y <= 5 ? y - 2 : y >= 10 ? 13 - y : 4;
      for (let x = mid - radius; x <= mid; x++) {
        setSym(x, y, primary);
      }
    }
    // Inner bevel / shine
    setSym(mid - 2, 5, accent);
    setSym(mid - 1, 6, [255, 255, 255, 255]);
    return;
  }

  if (isPotion) {
    // Cork / Neck
    setSym(mid - 1, 3, dark);
    setSym(mid - 1, 4, dark);
    // Glass Body
    for (let y = 5; y <= 12; y++) {
      const w = y <= 6 ? 2 : y >= 11 ? 3 : 4;
      for (let x = mid - w; x <= mid; x++) {
        setSym(x, y, y >= 7 ? primary : [220, 240, 255, 200]);
      }
    }
    setSym(mid - 2, 8, [255, 255, 255, 255]);
    return;
  }

  // Default: Sword / Blade diagonal
  for (let i = 2; i <= 10; i++) {
    setPix(i, 15 - i, accent);
    setPix(i + 1, 15 - i, primary);
  }
  // Crossguard & Hilt
  setPix(3, 11, dark);
  setPix(4, 12, dark);
  setPix(2, 13, dark);
}

function generateTileMatrix(
  setPix: (x: number, y: number, col: ColorRGBA | null) => void,
  res: number,
  type: string,
  primary: ColorRGBA,
  accent: ColorRGBA,
  dark: ColorRGBA,
  rand: () => number
) {
  const isGrass = type.includes("grass") || type.includes("platform");

  // Base texture fill with subtle noise variation
  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const isAlt = (x + y + Math.floor(rand() * 3)) % 4 === 0;
      setPix(x, y, isAlt ? accent : primary);
    }
  }

  // Grass top border
  if (isGrass) {
    for (let x = 0; x < res; x++) {
      setPix(x, 0, [34, 197, 94, 255]); // Bright green
      setPix(x, 1, [22, 163, 74, 255]);
      if (x % 3 === 0) setPix(x, 2, [22, 163, 74, 255]);
    }
  }

  // Tile Border definition
  for (let x = 0; x < res; x++) {
    setPix(x, res - 1, dark);
  }
  for (let y = 0; y < res; y++) {
    setPix(res - 1, y, dark);
  }
}

function generatePropMatrix(
  setPix: (x: number, y: number, col: ColorRGBA | null) => void,
  setSym: (x: number, y: number, col: ColorRGBA | null) => void,
  res: number,
  type: string,
  primary: ColorRGBA,
  accent: ColorRGBA,
  dark: ColorRGBA,
  rand: () => number
) {
  const mid = Math.floor(res / 2);
  const isTree = type.includes("tree") || type.includes("bush");

  if (isTree) {
    // Foliage canopy
    for (let y = 2; y <= 9; y++) {
      const w = y <= 4 ? y : y <= 7 ? 5 : 4;
      for (let x = mid - w; x <= mid; x++) {
        setSym(x, y, primary);
      }
    }
    // Highlights
    setSym(mid - 2, 4, accent);
    // Trunk
    for (let y = 10; y <= 14; y++) {
      setSym(mid - 1, y, [120, 60, 20, 255]);
    }
    return;
  }

  // Crate / Chest box
  for (let y = 3; y <= 13; y++) {
    for (let x = 3; x <= 13; x++) {
      const isBorder = x === 3 || x === 13 || y === 3 || y === 13 || x === y || x + y === 16;
      setPix(x, y, isBorder ? dark : primary);
    }
  }
}

function generateIconMatrix(
  setPix: (x: number, y: number, col: ColorRGBA | null) => void,
  setSym: (x: number, y: number, col: ColorRGBA | null) => void,
  res: number,
  type: string,
  primary: ColorRGBA,
  accent: ColorRGBA,
  dark: ColorRGBA,
  rand: () => number
) {
  const mid = Math.floor(res / 2);

  // Play button triangle or Crosshair
  if (type.includes("play")) {
    for (let x = 4; x <= 12; x++) {
      const h = Math.floor((12 - x) / 2);
      for (let y = mid - h; y <= mid + h; y++) {
        setPix(x, y, primary);
      }
    }
    return;
  }

  // Target / Crosshair
  for (let r = 2; r <= 6; r += 3) {
    for (let a = 0; a < 16; a++) {
      const rad = (a / 16) * 2 * Math.PI;
      const x = Math.round(mid + r * Math.cos(rad));
      const y = Math.round(mid + r * Math.sin(rad));
      setPix(x, y, primary);
    }
  }
  for (let i = 2; i <= 13; i++) {
    if (i !== mid) {
      setPix(mid, i, accent);
      setPix(i, mid, accent);
    }
  }
}

function inferCategoryFromPrompt(text: string): SpriteCategory {
  const t = text.toLowerCase();
  if (
    t.includes("enemy") ||
    t.includes("monster") ||
    t.includes("slime") ||
    t.includes("boss") ||
    t.includes("zombie")
  )
    return "enemy";
  if (
    t.includes("character") ||
    t.includes("hero") ||
    t.includes("player") ||
    t.includes("knight") ||
    t.includes("wizard") ||
    t.includes("ninja")
  )
    return "character";
  if (
    t.includes("sword") ||
    t.includes("shield") ||
    t.includes("coin") ||
    t.includes("gem") ||
    t.includes("potion") ||
    t.includes("heart") ||
    t.includes("item")
  )
    return "item";
  if (
    t.includes("tile") ||
    t.includes("brick") ||
    t.includes("grass") ||
    t.includes("ground") ||
    t.includes("wall") ||
    t.includes("floor")
  )
    return "tile";
  if (
    t.includes("tree") ||
    t.includes("rock") ||
    t.includes("crate") ||
    t.includes("chest") ||
    t.includes("door") ||
    t.includes("prop")
  )
    return "prop";
  return "character";
}

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}
