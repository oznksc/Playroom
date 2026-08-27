import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createServer as createHttpsServer, type ServerOptions as HttpsServerOptions } from "node:https";
import { existsSync, readFileSync } from "node:fs";
import { readFile, stat, unlink } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getGameKitRoot,
  getProjectSnapshot,
  importAssetBuffer,
  initProject,
  readScene,
  removeAsset,
  writeScene,
  writeProject,
  readProject,
  listPrefabs,
  createPrefabFromEntity,
  instantiatePrefab,
  removePrefab,
  listSkills,
  applySkill,
  listRecipes,
  describeRecipe,
  applyRecipe,
  getSceneMtime,
} from "./project.js";
import {
  scaffoldProject,
  detectPackageManagers,
  openNativeFolderDialog,
  GENRE_TEMPLATES,
  type ProjectPlatform,
  type ProjectGenre,
  type PackageManager,
} from "./scaffold.js";
import { runDoctor } from "./doctor.js";
import { buildProject } from "./build.js";
import { validateScene } from "@gamekit/schema";
import { z } from "zod";
import { handleAgentRoute } from "./agent/routes.js";
import {
  generateSprite,
  generateCharacterSpritesheet,
  synthesizeSfx,
  synthesizeMusic,
  SFX_PRESETS,
  MUSIC_PRESETS,
  PALETTES,
  type SpriteCategory,
  type PaletteName,
  type SfxPreset,
  type MusicPreset,
  type MusicalKey,
  type MusicalScale,
  type AnimationAction,
} from "./generators/index.js";

export type EditorTlsOptions = {
  /** PEM contents or path to a certificate file. */
  cert: string | Buffer;
  /** PEM contents or path to a private key file. */
  key: string | Buffer;
  /** PEM contents or path to the CA that signs client certificates (mTLS). */
  ca?: string | Buffer;
  /** Ask clients for a certificate. Pair with `rejectUnauthorized` for mTLS. */
  requestCert?: boolean;
  /** Reject clients whose certificate is missing or untrusted. Default: same as `requestCert`. */
  rejectUnauthorized?: boolean;
};

export type EditorServerOptions = {
  root: string;
  port?: number;
  host?: string;
  editorDist?: string;
  tls?: EditorTlsOptions;
};

export type EditorServerHandle = {
  host: string;
  port: number;
  url: string;
  protocol: "http" | "https";
  mtls: boolean;
  close: () => Promise<void>;
};

function resolvePem(value: string | Buffer, label: string): string | Buffer {
  if (Buffer.isBuffer(value)) return value;
  const trimmed = value.trim();
  if (trimmed.includes("BEGIN")) return trimmed;
  if (!existsSync(trimmed)) {
    throw new Error(`TLS ${label} file not found: ${trimmed}`);
  }
  return readFileSync(trimmed);
}

function buildHttpsOptions(tls: EditorTlsOptions): HttpsServerOptions {
  const requestCert = tls.requestCert === true;
  return {
    cert: resolvePem(tls.cert, "cert"),
    key: resolvePem(tls.key, "key"),
    ...(tls.ca ? { ca: resolvePem(tls.ca, "ca") } : {}),
    requestCert,
    rejectUnauthorized: tls.rejectUnauthorized ?? requestCert,
  };
}

/**
 * Start the editor HTTP(S) server. Returns a handle so tests/CI can shut it down.
 * Pass `port: 0` to bind an ephemeral free port.
 * Pass `tls` (cert + key) for HTTPS; set `tls.requestCert` + `tls.ca` for mTLS.
 */
export async function startEditorServer(options: EditorServerOptions): Promise<EditorServerHandle> {
  const preferredPort = options.port ?? 4177;
  const host = options.host ?? "127.0.0.1";
  await initProject(options.root);

  const onRequest = async (request: IncomingMessage, response: ServerResponse) => {
    try {
      await handleRequest(options, request, response);
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unknown server error"
      });
    }
  };

  const httpsOptions = options.tls ? buildHttpsOptions(options.tls) : undefined;
  const server = httpsOptions
    ? createHttpsServer(httpsOptions, onRequest)
    : createServer(onRequest);

  const protocol: "http" | "https" = httpsOptions ? "https" : "http";
  const mtls = Boolean(httpsOptions?.requestCert && httpsOptions.rejectUnauthorized);

  const port = await new Promise<number>((resolve, reject) => {
    server.once("error", reject);
    server.listen(preferredPort, host, () => {
      server.off("error", reject);
      const addr = server.address();
      const bound =
        typeof addr === "object" && addr && typeof addr.port === "number"
          ? addr.port
          : preferredPort;
      const mtlsNote = mtls ? " (mTLS)" : "";
      console.log(`Playroom editor: ${protocol}://${host}:${bound}${mtlsNote}`);
      resolve(bound);
    });
  });

  return {
    host,
    port,
    protocol,
    mtls,
    url: `${protocol}://${host}:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

const BuildRequestSchema = z.object({
  platform: z.enum(["web", "mobile"]).optional(),
  outDir: z.string().optional(),
  skipDoctor: z.boolean().optional(),
  pack: z.boolean().optional(),
});

const PrefabRequestSchema = z.object({
  action: z.string().optional(),
  sceneFile: z.string().optional(),
  entityId: z.string().optional(),
  name: z.string().optional(),
  prefabId: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
});

const SkillApplySchema = z.object({
  skillId: z.string().min(1, "skillId is required"),
  sceneName: z.string().optional(),
});

const RecipeApplySchema = z.object({
  recipeId: z.string().min(1, "recipeId is required"),
  scenePath: z.string().min(1, "scenePath is required"),
  entityId: z.string().optional(),
  params: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const ProjectCreateSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  targetDir: z.string().min(1, "Target directory is required"),
  platform: z.enum(["expo", "web", "tauri"]).default("web"),
  genre: z.enum(["platformer", "topdown", "puzzle", "topdown-shooter", "endless-runner", "physics-puzzle", "blank"]).default("platformer"),
  packageManager: z.enum(["pnpm", "bun", "yarn", "npm"]).optional(),
  runInstall: z.boolean().default(true),
  initGit: z.boolean().default(false),
});

async function handleRequest(options: EditorServerOptions, request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400"
    });
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

  if (url.pathname === "/api/projects/templates" && request.method === "GET") {
    sendJson(response, 200, {
      templates: GENRE_TEMPLATES,
      platforms: [
        {
          id: "web",
          name: "Web Game (Phaser + Vite)",
          description: "Runs instantly in any modern browser with 60FPS Phaser rendering and fast Vite HMR.",
          icon: "Globe",
        },
        {
          id: "expo",
          name: "Expo Mobile (React Native + Skia)",
          description: "Native iOS and Android gaming with high-performance Skia GPU rendering and touch controls.",
          icon: "Smartphone",
        },
        {
          id: "tauri",
          name: "Desktop App (Tauri + Phaser)",
          description: "Ultra-lightweight native desktop app for macOS, Windows, and Linux powered by Rust & Webview.",
          icon: "Monitor",
        },
      ],
    });
    return;
  }

  if (url.pathname === "/api/system/environment" && request.method === "GET") {
    const envInfo = await detectPackageManagers();
    sendJson(response, 200, {
      packageManagers: envInfo.available,
      preferredPackageManager: envInfo.preferred,
      nodeVersion: process.version,
      platform: process.platform,
      cwd: process.cwd(),
    });
    return;
  }

  if (url.pathname === "/api/system/pick-directory" && (request.method === "POST" || request.method === "GET")) {
    const selected = await openNativeFolderDialog();
    sendJson(response, 200, { path: selected });
    return;
  }

  if (url.pathname === "/api/projects/create" && request.method === "POST") {
    try {
      const raw = JSON.parse((await readBody(request)).toString("utf8"));
      const parsed = ProjectCreateSchema.parse(raw);
      const result = await scaffoldProject({
        targetDir: parsed.targetDir,
        name: parsed.name,
        platform: parsed.platform as ProjectPlatform,
        genre: parsed.genre as ProjectGenre,
        packageManager: parsed.packageManager as PackageManager | undefined,
        runInstall: parsed.runInstall,
        initGit: parsed.initGit,
      });
      sendJson(response, 200, result);
    } catch (err) {
      sendJson(response, 400, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return;
  }

  if (url.pathname === "/api/project" && request.method === "GET") {
    sendJson(response, 200, await getProjectSnapshot(options.root));
    return;
  }

  if (url.pathname === "/api/project" && request.method === "POST") {
    const body = z.record(z.unknown()).parse(JSON.parse((await readBody(request)).toString("utf8")));
    const project = await readProject(options.root);
    const updated = { ...project, ...body };
    await writeProject(options.root, updated);
    sendJson(response, 200, await getProjectSnapshot(options.root));
    return;
  }

  if (url.pathname === "/api/scene" && request.method === "GET") {
    const fileParam = url.searchParams.get("file")?.trim();
    const file = fileParam || "main.scene.json";
    try {
      sendJson(response, 200, await readScene(options.root, file));
    } catch (error) {
      sendJson(response, 404, {
        error: error instanceof Error ? error.message : `Scene not found: ${file}`,
      });
    }
    return;
  }

  if (url.pathname === "/api/scene/meta" && request.method === "GET") {
    const fileParam = url.searchParams.get("file")?.trim();
    const file = fileParam || "main.scene.json";
    try {
      const mtimeMs = await getSceneMtime(options.root, file);
      sendJson(response, 200, { file, mtimeMs });
    } catch (error) {
      sendJson(response, 404, { error: error instanceof Error ? error.message : "Scene not found" });
    }
    return;
  }

  if (url.pathname === "/api/doctor" && request.method === "GET") {
    sendJson(response, 200, await runDoctor(options.root));
    return;
  }

  if (url.pathname === "/api/build" && request.method === "POST") {
    const body = BuildRequestSchema.parse(JSON.parse((await readBody(request)).toString("utf8") || "{}"));
    try {
      const result = await buildProject(options.root, {
        platform: body.platform ?? "mobile",
        outDir: body.outDir,
        skipDoctor: body.skipDoctor,
        pack: body.pack,
      });
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Build failed",
      });
    }
    return;
  }

  if (url.pathname === "/api/scene" && request.method === "POST") {
    const scene = JSON.parse((await readBody(request)).toString("utf8")) as unknown;
    const result = validateScene(scene);
    if (!result.ok) {
      sendJson(response, 400, { errors: result.errors });
      return;
    }
    await writeScene(options.root, result.value, url.searchParams.get("file") ?? "main.scene.json");
    sendJson(response, 200, result.value);
    return;
  }

  if (url.pathname === "/api/scene" && request.method === "DELETE") {
    const file = url.searchParams.get("file") ?? "main.scene.json";
    const scenePath = join(getGameKitRoot(options.root), "scenes", file);
    try {
      await unlink(scenePath);
      sendJson(response, 200, { deleted: file });
    } catch {
      sendJson(response, 404, { error: `Scene file not found: ${file}` });
    }
    return;
  }

  if (url.pathname === "/api/assets" && request.method === "DELETE") {
    const assetId = url.searchParams.get("id");
    if (!assetId) {
      sendJson(response, 400, { error: "Missing id query parameter." });
      return;
    }
    try {
      await removeAsset(options.root, assetId);
      sendJson(response, 200, { deleted: assetId });
    } catch (error) {
      sendJson(response, 404, { error: error instanceof Error ? error.message : "Asset not found" });
    }
    return;
  }

  if (url.pathname === "/api/assets" && request.method === "POST") {
    const filename = url.searchParams.get("filename");
    if (!filename) {
      sendJson(response, 400, { error: "Missing filename query parameter." });
      return;
    }
    const asset = await importAssetBuffer(options.root, filename, await readBody(request));
    sendJson(response, 200, asset);
    return;
  }

  if (url.pathname === "/api/assets/generator-presets" && request.method === "GET") {
    sendJson(response, 200, {
      sfxPresets: Object.keys(SFX_PRESETS),
      musicPresets: Object.keys(MUSIC_PRESETS),
      palettes: Object.keys(PALETTES),
      spriteCategories: ["character", "enemy", "item", "tile", "prop", "icon"],
      characterArchetypes: ["hero", "knight", "rogue", "wizard", "monster", "slime", "robot", "alien"],
      animationActions: ["idle", "walk", "run", "jump", "attack", "hurt", "die"],
      musicalScales: ["major", "minor", "pentatonic", "dorian", "blues", "harmonic_minor"],
      musicalKeys: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
    });
    return;
  }

  if (url.pathname === "/api/assets/generate/sprite" && request.method === "POST") {
    try {
      const body = JSON.parse((await readBody(request)).toString("utf8") || "{}");
      const sprite = generateSprite({
        id: body.id,
        category: body.category as SpriteCategory | undefined,
        archetype: body.archetype,
        palette: body.palette as PaletteName | undefined,
        size: body.size,
        prompt: body.prompt,
      });
      const fileName = `${sprite.id}.png`;
      const asset = await importAssetBuffer(options.root, fileName, sprite.buffer);
      sendJson(response, 200, {
        asset,
        dataUrl: sprite.dataUrl,
        width: sprite.width,
        height: sprite.height,
        category: sprite.category,
        palette: sprite.palette,
      });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Failed to generate sprite",
      });
    }
    return;
  }

  if (url.pathname === "/api/assets/generate/spritesheet" && request.method === "POST") {
    try {
      const body = JSON.parse((await readBody(request)).toString("utf8") || "{}");
      const sheet = generateCharacterSpritesheet({
        id: body.id,
        archetype: body.archetype,
        animation: body.animation as AnimationAction | undefined,
        frameCount: body.frameCount,
        frameSize: body.frameSize,
        fps: body.fps,
        palette: body.palette as PaletteName | undefined,
      });
      const fileName = `${sheet.id}.png`;
      const asset = await importAssetBuffer(options.root, fileName, sheet.buffer);
      sendJson(response, 200, {
        asset,
        dataUrl: sheet.dataUrl,
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
        totalFrames: sheet.totalFrames,
        framesPerSecond: sheet.framesPerSecond,
        sheetWidth: sheet.sheetWidth,
        sheetHeight: sheet.sheetHeight,
        animation: sheet.animation,
        archetype: sheet.archetype,
      });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Failed to generate spritesheet",
      });
    }
    return;
  }

  if (url.pathname === "/api/assets/generate/sfx" && request.method === "POST") {
    try {
      const body = JSON.parse((await readBody(request)).toString("utf8") || "{}");
      const wavBuffer = synthesizeSfx({
        preset: body.preset as SfxPreset | undefined,
        waveType: body.waveType,
        startFreq: body.startFreq,
        endFreq: body.endFreq,
        attack: body.attack,
        decay: body.decay,
        sustain: body.sustain,
        release: body.release,
        volume: body.volume,
        vibratoSpeed: body.vibratoSpeed,
        vibratoDepth: body.vibratoDepth,
        dutyCycle: body.dutyCycle,
        noiseMix: body.noiseMix,
      });
      const id = body.id || `sfx-${body.preset || "custom"}`;
      const fileName = `${id}.wav`;
      const asset = await importAssetBuffer(options.root, fileName, Buffer.from(wavBuffer));
      sendJson(response, 200, {
        asset,
        preset: body.preset,
        kind: "audio",
      });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Failed to synthesize SFX",
      });
    }
    return;
  }

  if (url.pathname === "/api/assets/generate/music" && request.method === "POST") {
    try {
      const body = JSON.parse((await readBody(request)).toString("utf8") || "{}");
      const wavBuffer = synthesizeMusic({
        preset: body.preset as MusicPreset | undefined,
        bpm: body.bpm,
        durationSec: body.durationSec,
        key: body.key as MusicalKey | undefined,
        scale: body.scale as MusicalScale | undefined,
        volume: body.volume,
        leadWave: body.leadWave,
        bassWave: body.bassWave,
        hasDrums: body.hasDrums,
      });
      const id = body.id || `bgm-${body.preset || "theme"}`;
      const fileName = `${id}.wav`;
      const asset = await importAssetBuffer(options.root, fileName, Buffer.from(wavBuffer));
      sendJson(response, 200, {
        asset,
        preset: body.preset,
        kind: "audio",
      });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Failed to synthesize music track",
      });
    }
    return;
  }

  if (url.pathname.startsWith("/gamekit/assets/") && request.method === "GET") {
    await serveProjectAsset(options.root, url.pathname, response);
    return;
  }

  // Prefabs
  if (url.pathname === "/api/prefabs" && request.method === "GET") {
    sendJson(response, 200, { prefabs: await listPrefabs(options.root) });
    return;
  }

  if (url.pathname === "/api/prefabs" && request.method === "POST") {
    const body = PrefabRequestSchema.parse(JSON.parse((await readBody(request)).toString("utf8")));

    if (body.action === "instantiate") {
      if (!body.sceneFile || !body.prefabId) {
        sendJson(response, 400, { error: "Missing required field: sceneFile and prefabId are required for instantiate action." });
        return;
      }
      try {
        const result = await instantiatePrefab(options.root, body.sceneFile, body.prefabId, {
          x: body.x,
          y: body.y,
          name: body.name,
        });
        sendJson(response, 200, { ok: true, ...result });
      } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : "Instantiate failed" });
      }
      return;
    }

    // default: create from entity
    if (!body.sceneFile || !body.entityId) {
      sendJson(response, 400, { error: "Missing required field: sceneFile and entityId are required for create action." });
      return;
    }
    try {
      const result = await createPrefabFromEntity(
        options.root,
        body.sceneFile,
        body.entityId,
        body.name,
      );
      sendJson(response, 200, {
        ok: true,
        file: result.file,
        prefab: {
          id: result.prefab.id,
          name: result.prefab.name,
          componentTypes: result.prefab.components.map((c) => c.type),
        },
      });
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : "Create prefab failed" });
    }
    return;
  }

  if (url.pathname === "/api/prefabs" && request.method === "DELETE") {
    const prefabId = url.searchParams.get("id");
    if (!prefabId) {
      sendJson(response, 400, { error: "Missing id query parameter" });
      return;
    }
    try {
      const removed = await removePrefab(options.root, prefabId);
      sendJson(response, 200, { ok: true, removed });
    } catch (error) {
      sendJson(response, 404, { error: error instanceof Error ? error.message : "Prefab not found" });
    }
    return;
  }

  // Skills (genre templates)
  if (url.pathname === "/api/skills" && request.method === "GET") {
    sendJson(response, 200, { skills: await listSkills() });
    return;
  }

  if (url.pathname === "/api/skills/apply" && request.method === "POST") {
    const body = SkillApplySchema.parse(JSON.parse((await readBody(request)).toString("utf8")));
    try {
      const result = await applySkill(options.root, body.skillId, body.sceneName);
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Apply skill failed",
      });
    }
    return;
  }

  // Recipes (effects / mechanics / scripts / animations / gestures)
  if (url.pathname === "/api/recipes" && request.method === "GET") {
    const category = url.searchParams.get("category") ?? undefined;
    const query = url.searchParams.get("query") ?? undefined;
    const tags = url.searchParams.get("tag")
      ? url.searchParams.get("tag")!.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;
    sendJson(response, 200, { recipes: await listRecipes({ category, query, tags }) });
    return;
  }

  if (url.pathname.startsWith("/api/recipes/") && request.method === "GET") {
    const recipeId = decodeURIComponent(url.pathname.replace("/api/recipes/", ""));
    if (!recipeId || recipeId.includes("/")) {
      sendJson(response, 400, { error: "Invalid recipe id" });
      return;
    }
    try {
      const recipe = await describeRecipe(recipeId);
      sendJson(response, 200, { recipe });
    } catch (error) {
      sendJson(response, 404, {
        error: error instanceof Error ? error.message : "Recipe not found",
      });
    }
    return;
  }

  if (url.pathname === "/api/recipes/apply" && request.method === "POST") {
    const body = RecipeApplySchema.parse(JSON.parse((await readBody(request)).toString("utf8")));
    try {
      const result = await applyRecipe(options.root, body.recipeId, {
        scenePath: body.scenePath,
        entityId: body.entityId,
        params: body.params,
      });
      sendJson(response, 200, { ok: true, ...result });
    } catch (error) {
      sendJson(response, 400, {
        error: error instanceof Error ? error.message : "Apply recipe failed",
      });
    }
    return;
  }

  // Agent routes — delegate to agent handler
  if (url.pathname.startsWith("/api/agent/")) {
    const handled = await handleAgentRoute(options.root, request, response, url.pathname, request.method ?? "GET");
    if (handled) return;
  }

  await serveEditorAsset(options, url.pathname, response);
}

async function serveProjectAsset(root: string, pathname: string, response: ServerResponse): Promise<void> {
  const fileName = decodeURIComponent(pathname.replace("/gamekit/assets/", ""));
  const normalized = normalize(fileName);
  if (normalized.includes("..") || normalized.startsWith("/")) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  const filePath = join(getGameKitRoot(root), "assets", normalized);
  try {
    response.writeHead(200, {
      "content-type": contentType(filePath),
      "access-control-allow-origin": "*"
    });
    response.end(await readFile(filePath));
  } catch {
    sendJson(response, 404, { error: "Asset not found" });
  }
}

async function serveEditorAsset(options: EditorServerOptions, pathname: string, response: ServerResponse): Promise<void> {
  const root = options.editorDist ?? process.env.GAMEKIT_EDITOR_DIST ?? fileURLToPath(new URL("../../../apps/editor/dist", import.meta.url));
  const normalized = normalize(pathname === "/" ? "/index.html" : pathname);

  if (normalized.includes("..")) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  const filePath = join(root, normalized);
  try {
    const info = await stat(filePath);
    if (!info.isFile()) {
      throw new Error("Not a file");
    }
    response.writeHead(200, { "content-type": contentType(filePath) });
    response.end(await readFile(filePath));
  } catch {
    if (pathname === "/" || pathname.endsWith(".html")) {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(fallbackHtml);
      return;
    }
    sendJson(response, 404, { error: "Not found" });
  }
}

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let totalLength = 0;
  const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10 MB
  for await (const chunk of request) {
    totalLength += chunk.length;
    if (totalLength > MAX_BODY_SIZE) {
      throw new Error("Request body exceeds 10 MB limit");
    }
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*"
  });
  response.end(JSON.stringify(body, null, 2));
}

function contentType(path: string): string {
  switch (extname(path)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

const fallbackHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Playroom Editor</title>
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; background: #101820; color: white; display: grid; place-items: center; min-height: 100vh; }
      main { max-width: 560px; padding: 32px; }
      code { background: rgba(255,255,255,.12); padding: 2px 6px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Playroom Editor</h1>
      <p>The editor API is running. Build <code>@gamekit/editor</code> to serve the full WebUI from this CLI.</p>
    </main>
  </body>
</html>`;
