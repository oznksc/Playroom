import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import { readFile, writeFile, readdir, unlink, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import {
  McpClient,
  AnthropicAdapter,
  LmStudioAdapter,
  runAgent,
  type ApprovalMode,
  type PromptContext,
} from "@gamekit/agent";
import { readScene, getGameKitRoot } from "../project.js";
import { beginSse, writeSse, endSse } from "./sse.js";

type StoredKey = {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
};

// In-memory key store (per server session)
const keyStore = new Map<string, StoredKey>();

// Active chat sessions
const activeChats = new Map<string, AbortController>();

export async function handleAgentRoute(
  root: string,
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
  method: string,
): Promise<boolean> {
  // GET /api/agent/providers
  if (pathname === "/api/agent/providers" && method === "GET") {
    sendJson(response, 200, {
      providers: [
        {
          id: "anthropic",
          label: "Anthropic Claude",
          defaultBaseUrl: "https://api.anthropic.com",
          requiresApiKey: true,
          defaultModel: "claude-sonnet-4-5",
          supported: true,
        },
        {
          id: "openai",
          label: "OpenAI",
          defaultBaseUrl: "https://api.openai.com",
          requiresApiKey: true,
          defaultModel: "gpt-4o",
          supported: false,
        },
        {
          id: "google",
          label: "Google AI",
          defaultBaseUrl: "https://generativelanguage.googleapis.com",
          requiresApiKey: true,
          defaultModel: "gemini-2.0-flash",
          supported: false,
        },
        {
          id: "ollama",
          label: "Ollama (local)",
          defaultBaseUrl: "http://127.0.0.1:11434",
          requiresApiKey: false,
          defaultModel: "llama3.1:8b",
          supported: false,
        },
        {
          id: "lmstudio",
          label: "LM Studio (local)",
          defaultBaseUrl: "http://127.0.0.1:1234",
          requiresApiKey: false,
          defaultModel: "local-model",
          supported: true,
        },
      ],
    });
    return true;
  }

  // POST /api/agent/keys
  if (pathname === "/api/agent/keys" && method === "POST") {
    const body = JSON.parse((await readBody(request)).toString("utf8")) as StoredKey;
    if (!body?.provider || !body?.apiKey) {
      sendJson(response, 400, { error: "Missing provider or apiKey" });
      return true;
    }
    keyStore.set(body.provider, body);
    sendJson(response, 200, {
      ok: true,
      provider: body.provider,
      model: body.model ?? "claude-sonnet-4-5",
    });
    return true;
  }

  // POST /api/agent/chat (SSE stream)
  if (pathname === "/api/agent/chat" && method === "POST") {
    const body = JSON.parse((await readBody(request)).toString("utf8")) as {
      sceneId: string;
      message: string;
      model: string;
      provider: string;
      approvalMode: ApprovalMode;
    };

    if (!body?.sceneId || !body?.message) {
      sendJson(response, 400, { error: "Missing sceneId or message" });
      return true;
    }

    const storedKey = keyStore.get(body.provider ?? "anthropic");
    const isLmStudio = body.provider === "lmstudio";
    if (!storedKey && !isLmStudio) {
      sendJson(response, 401, { error: `No API key for provider: ${body.provider ?? "anthropic"}` });
      return true;
    }

    // Build scene context
    let scene;
    try {
      scene = await readScene(root, body.sceneId);
    } catch {
      sendJson(response, 404, { error: `Scene not found: ${body.sceneId}` });
      return true;
    }

    const sceneSummary = summarizeScene(scene);
    const skillsDir = join(__dirname, "..", "..", "..", "mcp", "skills");
    const skills = await loadSkillSummaries(skillsDir);

    const sceneContext: PromptContext = {
      projectPath: root,
      sceneId: body.sceneId,
      approvalMode: body.approvalMode ?? "destructive-only",
      sceneSummary,
      skills,
      viewport: scene.viewport ?? { width: 844, height: 390 },
      orientation: scene.responsive?.orientation ?? "landscape",
      gravity: scene.gravity ?? { x: 0, y: 1800 },
      schemaVersion: 1,
    };

    // Spawn MCP client
    const mcpClient = new McpClient(
      join(__dirname, "..", "index.js"),
      root,
    );

    try {
      await mcpClient.connect();
    } catch (e) {
      sendJson(response, 500, { error: `Failed to start MCP: ${e instanceof Error ? e.message : e}` });
      return true;
    }

    const provider = isLmStudio
      ? new LmStudioAdapter()
      : new AnthropicAdapter();
    const abortController = new AbortController();
    const chatId = `${body.sceneId}:${Date.now()}`;
    activeChats.set(chatId, abortController);

    beginSse(response);

    try {
      const stream = runAgent(
        {
          message: body.message,
          model: body.model ?? (isLmStudio ? "local-model" : "claude-sonnet-4-5"),
          apiKey: storedKey?.apiKey ?? "lm-studio",
          baseUrl: storedKey?.baseUrl ?? (isLmStudio ? "http://127.0.0.1:1234" : undefined),
          approvalMode: body.approvalMode ?? "destructive-only",
          sceneContext,
          signal: abortController.signal,
        },
        { provider, mcpClient },
      );

      for await (const event of stream) {
        writeSse(response, event.type, event);
      }
    } catch (e) {
      if (!abortController.signal.aborted) {
        writeSse(response, "error", { message: e instanceof Error ? e.message : "Agent error" });
      }
    } finally {
      activeChats.delete(chatId);
      endSse(response);
      await mcpClient.close();
    }

    return true;
  }

  // POST /api/agent/approve
  if (pathname === "/api/agent/approve" && method === "POST") {
    // Approval is handled via in-memory gate in the agent loop
    // This endpoint is a placeholder for the editor to POST to
    sendJson(response, 200, { ok: true });
    return true;
  }

  // POST /api/agent/abort
  if (pathname === "/api/agent/abort" && method === "POST") {
    for (const [id, controller] of activeChats) {
      controller.abort();
      activeChats.delete(id);
    }
    sendJson(response, 200, { ok: true });
    return true;
  }

  // GET /api/agent/history/:sceneId
  if (pathname.startsWith("/api/agent/history/") && method === "GET") {
    const sceneId = pathname.slice("/api/agent/history/".length);
    const historyPath = join(getGameKitRoot(root), "agent", `${sceneId}.json`);
    try {
      const data = await readFile(historyPath, "utf8");
      sendJson(response, 200, JSON.parse(data));
    } catch {
      sendJson(response, 404, { error: "History not found" });
    }
    return true;
  }

  // DELETE /api/agent/history/:sceneId
  if (pathname.startsWith("/api/agent/history/") && method === "DELETE") {
    const sceneId = pathname.slice("/api/agent/history/".length);
    const historyPath = join(getGameKitRoot(root), "agent", `${sceneId}.json`);
    try {
      await unlink(historyPath);
      sendJson(response, 200, { ok: true });
    } catch {
      sendJson(response, 404, { error: "History not found" });
    }
    return true;
  }

  return false;
}

function summarizeScene(scene: Record<string, unknown>): string {
  const entities = (scene.entities ?? []) as Array<{ name: string; components: Array<{ type: string }> }>;
  const lines = [`Scene: ${scene.name ?? "untitled"}`, `Entities: ${entities.length}`];

  for (const e of entities.slice(0, 20)) {
    const comps = e.components.map((c) => c.type).join(", ");
    lines.push(`  - ${e.name} [${comps}]`);
  }

  if (entities.length > 20) {
    lines.push(`  ... and ${entities.length - 20} more`);
  }

  return lines.join("\n");
}

async function loadSkillSummaries(skillsDir: string): Promise<Array<{ name: string; description: string }>> {
  const summaries: Array<{ name: string; description: string }> = [];
  try {
    const files = await readdir(skillsDir);
    for (const file of files.filter((f) => f.endsWith(".json"))) {
      try {
        const raw = JSON.parse(await readFile(join(skillsDir, file), "utf8"));
        summaries.push({ name: raw.name ?? file.replace(".json", ""), description: raw.description ?? "" });
      } catch { /* skip */ }
    }
  } catch { /* dir not found */ }
  return summaries;
}

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let totalLength = 0;
  const MAX_BODY_SIZE = 10 * 1024 * 1024;
  for await (const chunk of request) {
    totalLength += chunk.length;
    if (totalLength > MAX_BODY_SIZE) throw new Error("Request body exceeds 10 MB limit");
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  });
  response.end(JSON.stringify(body, null, 2));
}
