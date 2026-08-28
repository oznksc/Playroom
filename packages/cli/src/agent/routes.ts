import type { IncomingMessage, ServerResponse } from "node:http";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile, readdir, unlink, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import {
  McpClient,
  createProvider,
  PROVIDER_CATALOG,
  defaultModelFor,
  runAgent,
  globalApprovalGate,
  callTool,
  AgentAuditLogger,
  type ApprovalMode,
  type PromptContext,
  type PriorTurn,
  type AuditQueryOptions,
  type AuditEntryStatus,
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
  method: string
): Promise<boolean> {
  // GET /api/agent/providers
  if (pathname === "/api/agent/providers" && method === "GET") {
    sendJson(response, 200, { providers: PROVIDER_CATALOG });
    return true;
  }

  // GET /api/agent/keys — which providers the CLI currently has (no secrets)
  if (pathname === "/api/agent/keys" && method === "GET") {
    sendJson(response, 200, {
      providers: [...keyStore.entries()].map(([id, stored]) => ({
        id,
        hasKey: Boolean(stored.apiKey) && stored.apiKey !== "local",
        model: stored.model,
        baseUrl: stored.baseUrl,
      })),
    });
    return true;
  }

  // POST /api/agent/validate
  if (pathname === "/api/agent/validate" && method === "POST") {
    const body = JSON.parse((await readBody(request)).toString("utf8")) as {
      provider?: string;
      apiKey?: string;
      baseUrl?: string;
    };
    if (!body?.provider) {
      sendJson(response, 400, { error: "Missing provider" });
      return true;
    }
    const adapter = createProvider(body.provider);
    if (!adapter) {
      sendJson(response, 400, { error: `Unknown provider: ${body.provider}` });
      return true;
    }
    const apiKey = body.apiKey || keyStore.get(body.provider)?.apiKey || "";
    if (adapter.requiresApiKey && !apiKey) {
      sendJson(response, 400, { error: "Missing apiKey" });
      return true;
    }
    const result = await adapter.validateKey({
      apiKey: apiKey || "local",
      baseUrl: body.baseUrl || keyStore.get(body.provider)?.baseUrl || adapter.defaultBaseUrl,
      signal: new AbortController().signal,
    });
    sendJson(response, result.ok ? 200 : 400, result);
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
      model: body.model ?? defaultModelFor(body.provider),
    });
    return true;
  }

  // POST /api/agent/chat (SSE stream)
  if (pathname === "/api/agent/chat" && method === "POST") {
    const body = JSON.parse((await readBody(request)).toString("utf8")) as {
      sceneId: string;
      message: string;
      screenshot?: string;
      model: string;
      provider: string;
      approvalMode: ApprovalMode;
      planMode?: boolean;
      history?: PriorTurn[];
      toolCalls?: Array<{ tool: string; status: string }>;
      apiKey?: string;
      baseUrl?: string;
    };

    if (!body?.sceneId || !body?.message) {
      sendJson(response, 400, { error: "Missing sceneId or message" });
      return true;
    }

    const provider = createProvider(body.provider ?? "anthropic");
    if (!provider) {
      sendJson(response, 400, { error: `Unknown provider: ${body.provider}` });
      return true;
    }

    if (body.apiKey) {
      const prev = keyStore.get(body.provider) ?? { provider: body.provider, apiKey: body.apiKey };
      keyStore.set(body.provider, {
        ...prev,
        apiKey: body.apiKey,
        baseUrl: body.baseUrl ?? prev.baseUrl,
        model: body.model ?? prev.model,
      });
    }

    const storedKey = keyStore.get(body.provider ?? "anthropic");
    if (provider.requiresApiKey && !storedKey?.apiKey) {
      sendJson(response, 401, {
        error: `No API key for ${body.provider}. Open Agent settings, connect the provider, then send again.`,
      });
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
    const cliDir = __dirname.includes("dist")
      ? join(__dirname, "..")
      : join(__dirname, "..", "..", "dist");
    const mcpClient = new McpClient(join(cliDir, "index.js"), root);

    try {
      await mcpClient.connect();
    } catch (e) {
      sendJson(response, 500, {
        error: `Failed to start MCP: ${e instanceof Error ? e.message : e}`,
      });
      return true;
    }

    // Session undo snapshot before agent mutates the scene
    let sessionSnapshotId: string | undefined;
    try {
      const snap = await callTool(mcpClient, "snapshot_undo_point", { scenePath: body.sceneId });
      sessionSnapshotId = extractSnapshotId(snap.content);
    } catch {
      // Snapshot is best-effort; agent can still run without it.
    }

    const abortController = new AbortController();
    const chatId = `${body.sceneId}:${Date.now()}`;
    activeChats.set(chatId, abortController);

    beginSse(response);

    if (sessionSnapshotId) {
      writeSse(response, "session_snapshot", {
        snapshotId: sessionSnapshotId,
        sceneId: body.sceneId,
      });
    }

    const defaultModel = body.model ?? storedKey?.model ?? defaultModelFor(provider.id);
    const defaultBaseUrl = body.baseUrl ?? storedKey?.baseUrl ?? provider.defaultBaseUrl;

    const auditLogger = new AgentAuditLogger(root);

    try {
      const stream = runAgent(
        {
          message: body.message,
          screenshot: body.screenshot,
          model: defaultModel,
          apiKey: storedKey?.apiKey ?? "local",
          baseUrl: defaultBaseUrl,
          approvalMode: body.approvalMode ?? "destructive-only",
          planMode: body.planMode === true || body.approvalMode === "plan",
          sessionSnapshotId,
          sceneContext,
          priorTurns: body.history,
          priorTools: body.toolCalls,
          sessionId: chatId,
          signal: abortController.signal,
        },
        { provider, mcpClient, approvalGate: globalApprovalGate, auditLogger }
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

  // GET /api/agent/models/:provider
  if (pathname.startsWith("/api/agent/models/") && method === "GET") {
    const providerId = pathname.slice("/api/agent/models/".length);
    const providerAdapter = createProvider(providerId);

    if (!providerAdapter) {
      sendJson(response, 400, { error: `Invalid provider: ${providerId}` });
      return true;
    }

    const storedKey = keyStore.get(providerId);
    const apiKey = storedKey?.apiKey ?? "";
    const baseUrl = storedKey?.baseUrl;

    if (providerAdapter.requiresApiKey && !apiKey) {
      const defaults: Record<string, string[]> = {
        anthropic: ["claude-sonnet-4-5", "claude-haiku-4-5", "claude-opus-4-5"],
        openai: ["gpt-4o", "gpt-4o-mini", "gpt-5"],
        xai: ["grok-4", "grok-3", "grok-3-mini"],
        google: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
        openrouter: ["anthropic/claude-sonnet-4.5", "openai/gpt-4o", "x-ai/grok-4"],
      };
      sendJson(response, 200, { models: defaults[providerId] ?? [] });
      return true;
    }

    try {
      const abortController = new AbortController();
      const models = await providerAdapter.listModels({
        apiKey,
        baseUrl,
        signal: abortController.signal,
      });
      sendJson(response, 200, { models });
    } catch (e) {
      sendJson(response, 500, { error: e instanceof Error ? e.message : "Failed to fetch models" });
    }
    return true;
  }

  // POST /api/agent/approve
  if (pathname === "/api/agent/approve" && method === "POST") {
    const body = JSON.parse((await readBody(request)).toString("utf8")) as {
      requestId?: string;
      decision?: "allow" | "deny";
    };
    if (!body?.requestId || (body.decision !== "allow" && body.decision !== "deny")) {
      sendJson(response, 400, { error: "Missing requestId or decision (allow|deny)" });
      return true;
    }
    const resolved = globalApprovalGate.resolveApproval(body.requestId, body.decision);
    if (!resolved) {
      sendJson(response, 404, { error: `No pending approval for requestId: ${body.requestId}` });
      return true;
    }
    sendJson(response, 200, { ok: true, requestId: body.requestId, decision: body.decision });
    return true;
  }

  // POST /api/agent/abort
  if (pathname === "/api/agent/abort" && method === "POST") {
    for (const [id, controller] of activeChats) {
      controller.abort();
      activeChats.delete(id);
    }
    globalApprovalGate.rejectAll();
    sendJson(response, 200, { ok: true });
    return true;
  }

  // GET /api/agent/history/:sceneId
  if (pathname.startsWith("/api/agent/history/") && method === "GET") {
    const sceneId = decodeURIComponent(pathname.slice("/api/agent/history/".length));
    const historyPath = join(getGameKitRoot(root), "agent", sanitizeHistoryId(sceneId));
    try {
      const data = await readFile(historyPath, "utf8");
      sendJson(response, 200, JSON.parse(data));
    } catch {
      sendJson(response, 404, { error: "History not found" });
    }
    return true;
  }

  // PUT /api/agent/history/:sceneId
  if (pathname.startsWith("/api/agent/history/") && method === "PUT") {
    const sceneId = decodeURIComponent(pathname.slice("/api/agent/history/".length));
    const body = JSON.parse((await readBody(request)).toString("utf8")) as {
      messages?: unknown[];
      toolCalls?: unknown[];
    };
    const agentDir = join(getGameKitRoot(root), "agent");
    await mkdir(agentDir, { recursive: true });
    const historyPath = join(agentDir, sanitizeHistoryId(sceneId));
    await writeFile(
      historyPath,
      JSON.stringify(
        {
          sceneId,
          updatedAt: Date.now(),
          messages: Array.isArray(body.messages) ? body.messages : [],
          toolCalls: Array.isArray(body.toolCalls) ? body.toolCalls : [],
        },
        null,
        2
      )
    );
    sendJson(response, 200, { ok: true });
    return true;
  }

  // DELETE /api/agent/history/:sceneId
  if (pathname.startsWith("/api/agent/history/") && method === "DELETE") {
    const sceneId = decodeURIComponent(pathname.slice("/api/agent/history/".length));
    const historyPath = join(getGameKitRoot(root), "agent", sanitizeHistoryId(sceneId));
    try {
      await unlink(historyPath);
      sendJson(response, 200, { ok: true });
    } catch {
      sendJson(response, 404, { error: "History not found" });
    }
    return true;
  }

  // GET /api/agent/audit
  if (pathname === "/api/agent/audit" && method === "GET") {
    const urlObj = new URL(request.url ?? pathname, "http://localhost");
    const limit = urlObj.searchParams.get("limit") ? Number(urlObj.searchParams.get("limit")) : 50;
    const sceneId = urlObj.searchParams.get("sceneId") ?? undefined;
    const tool = urlObj.searchParams.get("tool") ?? undefined;
    const status = (urlObj.searchParams.get("status") as AuditEntryStatus | null) ?? undefined;
    const since = urlObj.searchParams.get("since")
      ? Number(urlObj.searchParams.get("since"))
      : undefined;
    const until = urlObj.searchParams.get("until")
      ? Number(urlObj.searchParams.get("until"))
      : undefined;
    const sessionId = urlObj.searchParams.get("sessionId") ?? undefined;

    const auditLogger = new AgentAuditLogger(root);
    const entries = await auditLogger.query({
      limit,
      sceneId,
      tool,
      status,
      since,
      until,
      sessionId,
    });
    sendJson(response, 200, { entries, total: entries.length });
    return true;
  }

  // DELETE /api/agent/audit
  if (pathname === "/api/agent/audit" && method === "DELETE") {
    const auditLogger = new AgentAuditLogger(root);
    await auditLogger.clear();
    sendJson(response, 200, { ok: true });
    return true;
  }

  return false;
}

function sanitizeHistoryId(sceneId: string): string {
  const base = sceneId.replace(/\.scene\.json$/i, "").replace(/[^a-zA-Z0-9._-]+/g, "_");
  return `${base || "main"}.json`;
}

function extractSnapshotId(content: unknown): string | undefined {
  if (
    content &&
    typeof content === "object" &&
    !Array.isArray(content) &&
    "snapshotId" in content
  ) {
    const id = (content as { snapshotId?: unknown }).snapshotId;
    return typeof id === "string" ? id : undefined;
  }
  let text: string | undefined;
  if (typeof content === "string") {
    text = content;
  } else if (Array.isArray(content)) {
    text = (content as Array<{ text?: string }>)[0]?.text;
  } else if (content && typeof content === "object" && "content" in content) {
    const nested = (content as { content?: unknown }).content;
    if (Array.isArray(nested)) {
      text = (nested as Array<{ text?: string }>)[0]?.text;
    }
  }
  if (!text) return undefined;
  try {
    const parsed = JSON.parse(text) as { snapshotId?: string };
    return parsed.snapshotId;
  } catch {
    return undefined;
  }
}

function summarizeScene(scene: Record<string, unknown>): string {
  const entities = (scene.entities ?? []) as Array<{
    id?: string;
    name: string;
    tags?: string[];
    components: Array<{ type: string; position?: { x: number; y: number } }>;
  }>;
  const viewport = scene.viewport as
    { width?: number; height?: number; background?: string } | undefined;
  const gravity = scene.gravity as { x?: number; y?: number } | undefined;
  const lines = [
    `Scene: ${scene.name ?? "untitled"} (${scene.id ?? "?"})`,
    `Entities: ${entities.length}`,
  ];
  if (viewport?.width && viewport.height) {
    lines.push(`Viewport: ${viewport.width}×${viewport.height} bg=${viewport.background ?? "?"}`);
  }
  if (gravity) {
    lines.push(`Gravity: (${gravity.x}, ${gravity.y})`);
  }

  for (const e of entities.slice(0, 24)) {
    const comps = e.components.map((c) => c.type).join(", ");
    const transform = e.components.find((c) => c.type === "Transform");
    const pos =
      transform?.position && typeof transform.position.x === "number"
        ? ` @ (${Math.round(transform.position.x)}, ${Math.round(transform.position.y)})`
        : "";
    const tags = e.tags && e.tags.length > 0 ? ` tags=${e.tags.join(",")}` : "";
    lines.push(`  - ${e.name} id=${e.id ?? "?"}${pos}${tags} [${comps}]`);
  }

  if (entities.length > 24) {
    lines.push(`  ... and ${entities.length - 24} more`);
  }

  return lines.join("\n");
}

async function loadSkillSummaries(
  skillsDir: string
): Promise<Array<{ name: string; description: string }>> {
  const summaries: Array<{ name: string; description: string }> = [];
  try {
    const files = await readdir(skillsDir);
    for (const file of files.filter((f) => f.endsWith(".json"))) {
      try {
        const raw = JSON.parse(await readFile(join(skillsDir, file), "utf8"));
        summaries.push({
          name: raw.name ?? file.replace(".json", ""),
          description: raw.description ?? "",
        });
      } catch {
        /* skip */
      }
    }
  } catch {
    /* dir not found */
  }
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
