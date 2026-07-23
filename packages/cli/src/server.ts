import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
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
  getSceneMtime,
} from "./project.js";
import { runDoctor } from "./doctor.js";
import { buildProject } from "./build.js";
import { validateScene } from "@gamekit/schema";
import { z } from "zod";
import { handleAgentRoute } from "./agent/routes.js";

export type EditorServerOptions = {
  root: string;
  port?: number;
  host?: string;
  editorDist?: string;
};

export async function startEditorServer(options: EditorServerOptions): Promise<void> {
  const port = options.port ?? 4177;
  const host = options.host ?? "127.0.0.1";
  await initProject(options.root);

  const server = createServer(async (request, response) => {
    try {
      await handleRequest(options, request, response);
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unknown server error"
      });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      console.log(`Playroom editor: http://${host}:${port}`);
      resolve();
    });
  });
}

const BuildRequestSchema = z.object({
  platform: z.enum(["web", "mobile"]).optional(),
  outDir: z.string().optional(),
  skipDoctor: z.boolean().optional(),
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
    sendJson(response, 200, await readScene(options.root, url.searchParams.get("file") ?? "main.scene.json"));
    return;
  }

  if (url.pathname === "/api/scene/meta" && request.method === "GET") {
    const file = url.searchParams.get("file") ?? "main.scene.json";
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
