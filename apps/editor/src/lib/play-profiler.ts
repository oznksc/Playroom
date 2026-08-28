export type PlayProfilerBreakdown = {
  sprites: number;
  images: number;
  texts: number;
  tilemaps: number;
  graphics: number;
  particles: number;
  lights: number;
  other: number;
};

export type PlayProfilerSample = {
  fps: number;
  frameMs: number;
  drawCalls: number;
  displayList: number;
  visible: number;
  bodies: number;
  staticBodies: number;
  textures: number;
  cameras: number;
  lights: number;
  jsHeapMb: number | null;
  breakdown: PlayProfilerBreakdown;
};

export const EMPTY_PROFILER_SAMPLE: PlayProfilerSample = {
  fps: 0,
  frameMs: 0,
  drawCalls: 0,
  displayList: 0,
  visible: 0,
  bodies: 0,
  staticBodies: 0,
  textures: 0,
  cameras: 0,
  lights: 0,
  jsHeapMb: null,
  breakdown: {
    sprites: 0,
    images: 0,
    texts: 0,
    tilemaps: 0,
    graphics: 0,
    particles: 0,
    lights: 0,
    other: 0,
  },
};

const FLUSH_STATE = "__gamekitFlushState";

type FlushHost = {
  flush?: (...args: unknown[]) => unknown;
  drawCount?: number;
  [FLUSH_STATE]?: { count: number; orig: (...args: unknown[]) => unknown };
};

type GameLike = {
  loop?: { actualFps?: number; delta?: number };
  renderer?: FlushHost;
  textures?: { list?: object };
  events?: {
    on: (event: string, fn: () => void) => void;
    off?: (event: string, fn: () => void) => void;
  };
  scene?: {
    getScene?: (key: string) => PhaserSceneLike | undefined;
    scenes?: PhaserSceneLike[];
  };
};

type PhaserSceneLike = {
  sys?: {
    displayList?: {
      getChildren?: () => Array<{ type?: string; visible?: boolean }>;
      length?: number;
    };
  };
  children?: { length?: number };
  physics?: {
    world?: {
      bodies?: { size?: number };
      staticBodies?: { size?: number };
    };
  };
  cameras?: { cameras?: unknown[] };
  lights?: { lights?: unknown[]; active?: boolean };
};

export function classifyDisplayObject(type: string | undefined): keyof PlayProfilerBreakdown {
  const t = (type ?? "").toLowerCase();
  if (t.includes("sprite")) return "sprites";
  if (t.includes("image") || t.includes("nineslice")) return "images";
  if (t.includes("text") || t.includes("bitmaptext")) return "texts";
  if (t.includes("tilemap") || t.includes("tilelayer") || t.includes("blitter")) return "tilemaps";
  if (t.includes("graphics") || t.includes("shape")) return "graphics";
  if (t.includes("particle")) return "particles";
  if (t.includes("light")) return "lights";
  return "other";
}

export function installDrawCallCounter(game: GameLike): () => number {
  const renderer = game.renderer;
  if (!renderer?.flush) {
    return () => renderer?.drawCount ?? 0;
  }
  if (!renderer[FLUSH_STATE]) {
    const orig = renderer.flush.bind(renderer);
    const state = { count: 0, orig };
    renderer.flush = (...args: unknown[]) => {
      state.count += 1;
      return orig(...args);
    };
    renderer[FLUSH_STATE] = state;
    game.events?.on("prerender", () => {
      state.count = 0;
    });
  }
  return () => renderer[FLUSH_STATE]?.count ?? renderer.drawCount ?? 0;
}

function readHeapMb(): number | null {
  const memory = (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory;
  if (!memory?.usedJSHeapSize) return null;
  return Math.round((memory.usedJSHeapSize / (1024 * 1024)) * 10) / 10;
}

function resolveScene(game: GameLike): PhaserSceneLike | undefined {
  return game.scene?.getScene?.("gamekit") ?? game.scene?.scenes?.[0];
}

export function samplePhaserProfiler(game: GameLike, drawCalls?: number): PlayProfilerSample {
  const fps = Math.round(game.loop?.actualFps || 0);
  const frameMs = Math.round((game.loop?.delta || 0) * 10) / 10;
  const scene = resolveScene(game);
  const children = scene?.sys?.displayList?.getChildren?.() ?? [];
  const breakdown: PlayProfilerBreakdown = {
    sprites: 0,
    images: 0,
    texts: 0,
    tilemaps: 0,
    graphics: 0,
    particles: 0,
    lights: 0,
    other: 0,
  };
  let visible = 0;
  for (const child of children) {
    breakdown[classifyDisplayObject(child.type)] += 1;
    if (child.visible !== false) visible += 1;
  }
  const displayList =
    children.length || scene?.sys?.displayList?.length || scene?.children?.length || 0;
  const textures = game.textures?.list
    ? Object.keys(game.textures.list as Record<string, unknown>).filter(
        (k) => k !== "__DEFAULT" && k !== "__MISSING"
      ).length
    : 0;
  const lights = scene?.lights?.lights?.length ?? 0;
  return {
    fps,
    frameMs,
    drawCalls: drawCalls ?? game.renderer?.drawCount ?? 0,
    displayList,
    visible,
    bodies: scene?.physics?.world?.bodies?.size ?? 0,
    staticBodies: scene?.physics?.world?.staticBodies?.size ?? 0,
    textures,
    cameras: scene?.cameras?.cameras?.length ?? 0,
    lights,
    jsHeapMb: readHeapMb(),
    breakdown,
  };
}

export function sparklinePath(values: number[], width: number, height: number): string {
  if (values.length === 0 || width <= 0 || height <= 0) return "";
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(1e-6, max - min);
  return values
    .map((value, i) => {
      const x = values.length === 1 ? 0 : (i / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 2) - 1;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function pushSample(history: number[], value: number, max = 60): number[] {
  const next = history.length >= max ? history.slice(history.length - max + 1) : history.slice();
  next.push(value);
  return next;
}
