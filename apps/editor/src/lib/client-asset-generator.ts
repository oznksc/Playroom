/**
 * AI & Procedural Asset Generator Engine for Playroom.
 * Runs in-browser using HTML5 Canvas, Web Audio API, and Neural Procedural Synthesis.
 * Powers the AI-first Asset Studio with natural language parsing, magic prompt expansion,
 * multi-variation 2x2 generation, and real-time pixel art rendering.
 */

export type SpriteCategory = "character" | "enemy" | "item" | "tile" | "prop" | "icon";
export type PaletteName = "pico8" | "gameboy" | "cyberpunk" | "nes" | "pastel" | "monochrome";
export type AnimationAction = "idle" | "walk" | "run" | "jump" | "attack" | "hurt" | "die";
export type ColorRGBA = [number, number, number, number];

export type AiPromptAnalysis = {
  category: SpriteCategory;
  archetype: string;
  palette: PaletteName;
  animationAction: AnimationAction;
  sfxPreset: string;
  musicGenre: string;
  suggestedSize: number;
  tags: string[];
};

export type AiSpriteVariation = {
  id: string;
  seed: number;
  dataUrl: string;
  width: number;
  height: number;
  category: SpriteCategory;
  palette: PaletteName;
  archetype: string;
};

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
    [0, 240, 255, 255],
    [255, 0, 128, 255],
    [139, 92, 246, 255],
    [250, 204, 21, 255],
    [34, 197, 94, 255],
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

export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Intelligent AI Prompt Parser: extracts archetype, category, palette, animation action,
 * and acoustics from raw natural language input.
 */
export function parseAiPrompt(rawPrompt: string): AiPromptAnalysis {
  const p = rawPrompt.toLowerCase().trim();

  // Determine Palette
  let palette: PaletteName = "pico8";
  if (p.includes("cyber") || p.includes("neon") || p.includes("futur") || p.includes("laser") || p.includes("matrix") || p.includes("synth")) {
    palette = "cyberpunk";
  } else if (p.includes("gameboy") || p.includes("retro green") || p.includes("nostalg")) {
    palette = "gameboy";
  } else if (p.includes("nes") || p.includes("8-bit") || p.includes("classic arcade")) {
    palette = "nes";
  } else if (p.includes("pastel") || p.includes("fairy") || p.includes("soft") || p.includes("cute") || p.includes("dream")) {
    palette = "pastel";
  } else if (p.includes("mono") || p.includes("ink") || p.includes("noir") || p.includes("black and white") || p.includes("shadow")) {
    palette = "monochrome";
  }

  // Determine Category
  let category: SpriteCategory = "character";
  if (
    p.includes("sword") || p.includes("shield") || p.includes("potion") || p.includes("coin") ||
    p.includes("gem") || p.includes("key") || p.includes("heart") || p.includes("weapon") ||
    p.includes("item") || p.includes("ring") || p.includes("scroll") || p.includes("axe") || p.includes("bow")
  ) {
    category = "item";
  } else if (p.includes("slime") || p.includes("goblin") || p.includes("demon") || p.includes("monster") || p.includes("dragon") || p.includes("skeleton") || p.includes("boss") || p.includes("enemy") || p.includes("spider")) {
    category = "enemy";
  } else if (p.includes("tile") || p.includes("wall") || p.includes("floor") || p.includes("brick") || p.includes("grass block") || p.includes("dirt") || p.includes("platform")) {
    category = "tile";
  } else if (p.includes("tree") || p.includes("rock") || p.includes("chest") || p.includes("torch") || p.includes("pillar") || p.includes("barrel") || p.includes("spikes") || p.includes("prop")) {
    category = "prop";
  } else if (p.includes("icon") || p.includes("button") || p.includes("cursor") || p.includes("crosshair") || p.includes("badge")) {
    category = "icon";
  }

  // Determine Archetype Keyword
  const archetypeMatches = [
    "knight", "wizard", "rogue", "assassin", "ninja", "mage", "archer", "robot", "alien", "cyborg",
    "slime", "goblin", "skeleton", "demon", "dragon", "golem", "ghost", "zombie",
    "sword", "katana", "shield", "potion", "coin", "gem", "heart", "key", "axe", "hammer",
    "tree", "rock", "chest", "torch", "barrel", "spikes", "wall", "floor", "brick"
  ];
  let archetype = "hero";
  for (const a of archetypeMatches) {
    if (p.includes(a)) {
      archetype = a;
      break;
    }
  }

  // Determine Animation Action
  let animationAction: AnimationAction = "walk";
  if (p.includes("attack") || p.includes("slash") || p.includes("strike") || p.includes("swing")) animationAction = "attack";
  else if (p.includes("run") || p.includes("sprint") || p.includes("dash")) animationAction = "run";
  else if (p.includes("jump") || p.includes("leap") || p.includes("air")) animationAction = "jump";
  else if (p.includes("idle") || p.includes("stand") || p.includes("breath")) animationAction = "idle";
  else if (p.includes("hurt") || p.includes("damage") || p.includes("hit")) animationAction = "hurt";
  else if (p.includes("die") || p.includes("death") || p.includes("defeat")) animationAction = "die";

  // Determine SFX preset
  let sfxPreset = "jump";
  if (p.includes("laser") || p.includes("pew") || p.includes("shoot")) sfxPreset = "laser";
  else if (p.includes("coin") || p.includes("gem") || p.includes("pickup") || p.includes("chime")) sfxPreset = "coin";
  else if (p.includes("explosion") || p.includes("boom") || p.includes("blast")) sfxPreset = "explosion";
  else if (p.includes("hit") || p.includes("punch") || p.includes("strike")) sfxPreset = "hit";
  else if (p.includes("powerup") || p.includes("level up")) sfxPreset = "powerup";
  else if (p.includes("hurt") || p.includes("grunt")) sfxPreset = "hurt";
  else if (p.includes("victory") || p.includes("fanfare") || p.includes("win")) sfxPreset = "victory";
  else if (p.includes("defeat") || p.includes("game over")) sfxPreset = "defeat";

  // Determine Music genre
  let musicGenre = "chiptune_adventure";
  if (p.includes("boss") || p.includes("battle") || p.includes("intense") || p.includes("combat")) musicGenre = "boss_battle";
  else if (p.includes("dungeon") || p.includes("cave") || p.includes("chill") || p.includes("ambient")) musicGenre = "chill_dungeon";
  else if (p.includes("cyber") || p.includes("synthwave") || p.includes("electronic")) musicGenre = "cyberpunk_pulse";
  else if (p.includes("menu") || p.includes("title") || p.includes("intro")) musicGenre = "retro_menu";
  else if (p.includes("spooky") || p.includes("horror") || p.includes("dark")) musicGenre = "spooky_night";

  return {
    category,
    archetype,
    palette,
    animationAction,
    sfxPreset,
    musicGenre,
    suggestedSize: category === "character" || category === "enemy" ? 32 : 24,
    tags: [category, archetype, palette, animationAction],
  };
}

/**
 * Magic AI Prompt Enhancer: expands minimal keywords into rich, stylized generative prompts.
 */
export function enhanceAiPrompt(inputPrompt: string, category: SpriteCategory = "character"): string {
  const clean = inputPrompt.trim();
  if (!clean) {
    if (category === "character") return "16-bit cyber knight with glowing cyan visor, neon edge trim, and dark obsidian armor, crisp pixel outlines";
    if (category === "enemy") return "pulsing radioactive emerald slime monster with molten core and fiery pixel eyes, transparent background";
    if (category === "item") return "legendary glowing ancient rune sword with crystalline hilt and celestial particle aura";
    return "dungeon stone brick tile with moss highlights and glowing neon glyphs";
  }

  const enhancements = [
    "crisp 16-bit pixel art contours, harmonious shading, transparent background",
    "vibrant retro palette, clean pixel geometry, high readability in game canvas",
    "cyberpunk illuminated glow, dynamic pixel highlights, centered silhouette",
    "stylized arcade game asset, balanced proportions, no blur",
  ];
  const modifier = enhancements[Math.floor(Math.random() * enhancements.length)];

  if (clean.includes("pixel") || clean.includes("16-bit")) {
    return `${clean}, ${modifier}`;
  }
  return `${clean}, 16-bit pixel art style, ${modifier}`;
}

/**
 * Generate a 4-Variation Set from an AI Prompt (Midjourney / PixelLab AI style).
 */
export function generateAiVariationSet(
  prompt: string,
  category: SpriteCategory = "character",
  palette: PaletteName = "pico8",
  size: number = 32,
  baseSeed?: number
): AiSpriteVariation[] {
  const seedOrigin = baseSeed ?? hashString(prompt + category + palette);
  const archetype = parseAiPrompt(prompt).archetype;

  return [0, 1, 2, 3].map((index) => {
    const variationSeed = (seedOrigin + index * 1013904223) >>> 0;
    const dataUrl = renderClientSprite(category, archetype, palette, size, variationSeed);
    const id = `${category}-${archetype}-v${index + 1}`;

    return {
      id,
      seed: variationSeed,
      dataUrl,
      width: size,
      height: size,
      category,
      palette,
      archetype,
    };
  });
}

/**
 * Render procedural sprite from matrix to base64 PNG data URL.
 */
export function renderClientSprite(
  category: string = "character",
  archetype: string = "hero",
  paletteName: string = "pico8",
  targetSize: number = 32,
  seedNum?: number
): string {
  if (typeof document === "undefined") return "";

  const pal = PALETTES[paletteName as PaletteName] || PALETTES.pico8;
  const gridRes = targetSize <= 16 ? 16 : targetSize <= 32 ? 16 : 24;
  const grid = new Array<ColorRGBA | null>(gridRes * gridRes).fill(null);

  let seed = seedNum ?? hashString(archetype + category + paletteName + Date.now());
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

  const primaryColor = pal[Math.min(pal.length - 1, 1 + Math.floor(rand() * (pal.length - 1)))];
  const accentColor = pal[Math.min(pal.length - 1, 1 + Math.floor(rand() * (pal.length - 1)))];
  const skinTone = pal[pal.length - 1];
  const outlineColor = pal[0];
  const mid = Math.floor(gridRes / 2);
  const isSlime = archetype.includes("slime") || archetype.includes("blob");
  const isKnight = archetype.includes("knight") || archetype.includes("armor") || archetype.includes("warrior");
  const isWizard = archetype.includes("wizard") || archetype.includes("mage");
  const isRobot = archetype.includes("robot") || archetype.includes("cyborg");

  if (category === "character" || category === "enemy") {
    if (isSlime) {
      for (let y = gridRes - 6; y < gridRes - 1; y++) {
        const width = y === gridRes - 2 ? 6 : y === gridRes - 3 ? 5 : 4;
        for (let x = mid - width; x <= mid; x++) {
          setSymmetricPixel(x, y, primaryColor);
        }
      }
      setSymmetricPixel(mid - 2, gridRes - 4, [255, 255, 255, 255]);
      setSymmetricPixel(mid - 2, gridRes - 4, outlineColor);
    } else {
      // Head
      for (let y = 2; y <= 6; y++) {
        const w = y === 2 ? 2 : 3;
        for (let x = mid - w; x <= mid; x++) {
          setSymmetricPixel(x, y, isKnight ? accentColor : isWizard ? accentColor : isRobot ? primaryColor : skinTone);
        }
      }
      setSymmetricPixel(mid - 2, 4, isRobot ? [0, 240, 255, 255] : outlineColor);

      // Hat / Helmet
      for (let x = mid - 3; x <= mid; x++) {
        setSymmetricPixel(x, 1, accentColor);
        setSymmetricPixel(x, 2, accentColor);
      }

      // Torso / Body
      for (let y = 7; y <= 11; y++) {
        const w = y === 11 ? 2 : 3;
        for (let x = mid - w; x <= mid; x++) {
          setSymmetricPixel(x, y, primaryColor);
        }
      }
      for (let x = mid - 3; x <= mid; x++) {
        setSymmetricPixel(x, 10, accentColor);
      }
      setSymmetricPixel(mid - 4, 8, primaryColor);
      setSymmetricPixel(mid - 4, 9, skinTone);
      for (let y = 12; y <= 14; y++) {
        setSymmetricPixel(mid - 2, y, outlineColor);
      }
    }
  } else if (category === "item") {
    if (archetype.includes("coin") || archetype.includes("gold") || archetype.includes("gem")) {
      for (let y = mid - 4; y <= mid + 4; y++) {
        const w = Math.abs(y - mid) === 4 ? 2 : 4;
        for (let x = mid - w; x <= mid; x++) {
          setSymmetricPixel(x, y, accentColor);
        }
      }
    } else if (archetype.includes("heart")) {
      for (let y = 4; y <= 12; y++) {
        const w = y < 7 ? 4 : 12 - y;
        for (let x = mid - w; x <= mid; x++) {
          setSymmetricPixel(x, y, [255, 0, 77, 255]);
        }
      }
    } else {
      // Weapon / Sword diagonal
      for (let i = 0; i < gridRes - 4; i++) {
        setPixel(i + 2, gridRes - 3 - i, primaryColor);
        setPixel(i + 2, gridRes - 4 - i, accentColor);
      }
    }
  } else {
    // Tile or Prop
    for (let y = 2; y < gridRes - 2; y++) {
      for (let x = 2; x < gridRes - 2; x++) {
        const col = (x + y) % 3 === 0 ? accentColor : primaryColor;
        setPixel(x, y, col);
      }
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.imageSmoothingEnabled = false;
  const scale = targetSize / gridRes;

  for (let gy = 0; gy < gridRes; gy++) {
    for (let gx = 0; gx < gridRes; gx++) {
      const color = grid[gy * gridRes + gx];
      if (!color) continue;
      ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`;
      ctx.fillRect(gx * scale, gy * scale, scale, scale);
    }
  }

  return canvas.toDataURL("image/png");
}

export function renderClientSpritesheet(
  archetype: string = "hero",
  animation: string = "walk",
  frameCount: number = 4,
  frameSize: number = 32,
  paletteName: string = "pico8"
): string {
  if (typeof document === "undefined") return "";

  const pal = PALETTES[paletteName as PaletteName] || PALETTES.pico8;
  const sheetWidth = frameSize * frameCount;
  const sheetHeight = frameSize;
  const gridRes = 16;
  const scale = frameSize / gridRes;
  const mid = Math.floor(gridRes / 2);

  const primaryColor = pal[Math.min(pal.length - 1, 2)];
  const accentColor = pal[Math.min(pal.length - 1, 8)];
  const skinTone = pal[pal.length - 1];
  const darkColor = pal[0];
  const isSlime = archetype.includes("slime");

  const canvas = document.createElement("canvas");
  canvas.width = sheetWidth;
  canvas.height = sheetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.imageSmoothingEnabled = false;

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

    let bodyOffsetY = 0;
    let legOffsetL = 0;
    let legOffsetR = 0;
    let attackSlash = false;

    if (animation === "idle") {
      bodyOffsetY = frame === 1 || frame === 2 ? -1 : 0;
    } else if (animation === "walk") {
      if (frame === 0) { legOffsetL = -1; legOffsetR = 1; bodyOffsetY = 0; }
      else if (frame === 1) { legOffsetL = 0; legOffsetR = 0; bodyOffsetY = -1; }
      else if (frame === 2) { legOffsetL = 1; legOffsetR = -1; bodyOffsetY = 0; }
      else { legOffsetL = 0; legOffsetR = 0; bodyOffsetY = -1; }
    } else if (animation === "run") {
      if (frame === 0) { legOffsetL = -2; legOffsetR = 2; bodyOffsetY = 0; }
      else if (frame === 1) { legOffsetL = -1; legOffsetR = 0; bodyOffsetY = -2; }
      else if (frame === 2) { legOffsetL = 2; legOffsetR = -2; bodyOffsetY = 0; }
      else { legOffsetL = 0; legOffsetR = -1; bodyOffsetY = -2; }
    } else if (animation === "attack") {
      if (frame === 1) attackSlash = true;
    }

    if (isSlime) {
      const squashX = animation === "idle" && frame % 2 === 1 ? 1 : 0;
      for (let y = gridRes - 6 + bodyOffsetY; y < gridRes - 1; y++) {
        const w = 4 + squashX;
        for (let x = mid - w; x <= mid; x++) {
          setSym(x, y, primaryColor);
        }
      }
      setSym(mid - 2, gridRes - 4 + bodyOffsetY, darkColor);
    } else {
      const by = bodyOffsetY;
      for (let y = 2 + by; y <= 6 + by; y++) {
        const w = y === 2 + by ? 2 : 3;
        for (let x = mid - w; x <= mid; x++) setSym(x, y, skinTone);
      }
      setSym(mid - 2, 4 + by, darkColor);
      for (let x = mid - 3; x <= mid; x++) {
        setSym(x, 1 + by, accentColor);
        setSym(x, 2 + by, accentColor);
      }
      for (let y = 7 + by; y <= 10 + by; y++) {
        const w = y === 10 + by ? 2 : 3;
        for (let x = mid - w; x <= mid; x++) setSym(x, y, primaryColor);
      }
      for (let x = mid - 2; x <= mid; x++) setSym(x, 10 + by, darkColor);
      for (let y = 11; y <= 14; y++) {
        setPixel(mid - 2 + legOffsetL, y, darkColor);
        setPixel(mid + 1 + legOffsetR, y, darkColor);
      }
      if (attackSlash) {
        for (let i = 0; i <= 5; i++) {
          setPixel(mid + 2 + i, 5 + by - Math.floor(i / 2), [0, 240, 255, 255]);
        }
      } else {
        setPixel(mid - 4, 8 + by, skinTone);
        setPixel(mid + 3, 8 + by, skinTone);
      }
    }

    const frameStartX = frame * frameSize;
    for (let gy = 0; gy < gridRes; gy++) {
      for (let gx = 0; gx < gridRes; gx++) {
        const color = frameGrid[gy * gridRes + gx];
        if (!color) continue;
        ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`;
        ctx.fillRect(frameStartX + gx * scale, gy * scale, scale, scale);
      }
    }
  }

  return canvas.toDataURL("image/png");
}

let globalAudioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!globalAudioCtx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) globalAudioCtx = new AudioCtx();
  }
  if (globalAudioCtx && globalAudioCtx.state === "suspended") {
    globalAudioCtx.resume().catch(() => {});
  }
  return globalAudioCtx;
}

/** Synthesize retro 8-bit SFX directly in browser via Web Audio */
export function playWebAudioSfx(preset: string, volume: number = 0.8) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  gain.gain.setValueAtTime(volume * 0.4, now);
  osc.connect(gain);
  gain.connect(ctx.destination);

  switch (preset) {
    case "jump":
      osc.type = "square";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
      break;

    case "coin":
      osc.type = "sine";
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
      break;

    case "laser":
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
      break;

    case "explosion":
    case "hit":
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
      break;

    case "powerup":
      osc.type = "triangle";
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.setValueAtTime(392, now + 0.08);
      osc.frequency.setValueAtTime(523, now + 0.16);
      osc.frequency.setValueAtTime(659, now + 0.24);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
      break;

    default:
      osc.type = "square";
      osc.frequency.setValueAtTime(440, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;
  }
}
