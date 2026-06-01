import type { McpClient } from "./client.js";

export type ToolResult = {
  content: unknown;
  isError?: boolean;
};

export async function callTool(
  client: McpClient,
  name: string,
  args: unknown,
  signal?: AbortSignal,
): Promise<ToolResult> {
  const result = (await client.request("tools/call", {
    name,
    arguments: args,
  })) as ToolResult;

  return result;
}
