import type { McpClient } from "./client.js";
import { normalizeToolResult, type NormalizedToolResult } from "../loop/tool-runtime.js";

export type ToolResult = NormalizedToolResult;

export async function callTool(
  client: McpClient,
  name: string,
  args: unknown,
  _signal?: AbortSignal,
): Promise<ToolResult> {
  const raw = await client.request("tools/call", {
    name,
    arguments: args,
  });
  return normalizeToolResult(raw);
}
