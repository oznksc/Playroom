import { debugBaseUrl, readDebugPortFile, type LibgdxRootInfo } from "./paths.js";

export type DebugClientResult = {
  ok: boolean;
  status?: number;
  url: string;
  data?: unknown;
  error?: string;
  hint?: string;
  diagnostics?: Record<string, unknown>;
};

export type DebugFetchFn = (url: string, init?: RequestInit) => Promise<Response>;

let fetchImpl: DebugFetchFn = (url, init) => fetch(url, init);

export function setLibgdxFetch(fn: DebugFetchFn | null): void {
  fetchImpl = fn ?? ((url, init) => fetch(url, init));
}

async function resolveUrl(path: string, libgdxRoot?: string | null): Promise<string> {
  const portFile = await readDebugPortFile(libgdxRoot ?? null);
  const base = portFile?.port
    ? `http://127.0.0.1:${portFile.port}`
    : debugBaseUrl();
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

export async function debugRequest(
  path: string,
  options?: {
    method?: string;
    query?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
    timeoutMs?: number;
    libgdxRoot?: string | null;
    rootInfo?: LibgdxRootInfo;
  }
): Promise<DebugClientResult> {
  const method = options?.method ?? (options?.body ? "POST" : "GET");
  let url = await resolveUrl(path, options?.libgdxRoot);
  if (options?.query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(options.query)) {
      if (v === undefined) continue;
      params.set(k, String(v));
    }
    const q = params.toString();
    if (q) url += (url.includes("?") ? "&" : "?") + q;
  }

  const timeoutMs = options?.timeoutMs ?? 8000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const init: RequestInit = {
      method,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    };
    if (options?.body !== undefined && method !== "GET") {
      init.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }
    const response = await fetchImpl(url, init);
    const text = await response.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      // keep text
    }
    const ok =
      response.ok &&
      (typeof data !== "object" || data === null || (data as { ok?: boolean }).ok !== false);
    return { ok, status: response.status, url, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      url,
      error: `libGDX debug server not reachable at ${url}: ${message}`,
      hint:
        "Start the desktop game first (`run` / `launch_native_game` / `gamekit play --platform libgdx`). For Android, `run_android` sets up adb reverse to this port.",
      diagnostics: {
        url,
        timeoutMs,
        libgdxRoot: options?.libgdxRoot ?? null,
        rootSource: options?.rootInfo?.source,
        candidates: options?.rootInfo?.candidates,
        PLAYROOM_LIBGDX_DEBUG_URL: process.env.PLAYROOM_LIBGDX_DEBUG_URL ?? null,
        PLAYROOM_DEBUG_PORT: process.env.PLAYROOM_DEBUG_PORT ?? "17478",
      },
    };
  } finally {
    clearTimeout(timer);
  }
}
