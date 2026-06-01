/**
 * Dynamically resolves API and asset endpoints based on execution context.
 * When running in Tauri, endpoints are resolved to http://127.0.0.1:4177.
 * When running in a standard web browser (via local dev server or CLI server proxy), 
 * paths are resolved relatively.
 */
export function getApiUrl(path: string): string {
  const isTauri =
    typeof window !== "undefined" &&
    (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__);
  
  if (isTauri) {
    // Strip leading slashes to prevent duplication if path has a leading slash
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `http://127.0.0.1:4177${cleanPath}`;
  }
  
  return path;
}
