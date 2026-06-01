import type { McpClient } from "./client.js";
import type { ModelTool } from "../providers/types.js";

type McpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export async function listTools(client: McpClient): Promise<McpTool[]> {
  const result = (await client.request("tools/list")) as { tools: McpTool[] };
  return result.tools ?? [];
}

export function toModelTools(
  tools: McpTool[],
  providerId: string,
): ModelTool[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: convertSchema(t.inputSchema, providerId),
  }));
}

function convertSchema(
  schema: Record<string, unknown>,
  providerId: string,
): Record<string, unknown> {
  // Anthropic uses input_schema directly — same shape as JSON Schema
  // OpenAI uses "parameters" — same shape
  // All providers accept standard JSON Schema, so passthrough for Sprint A
  return schema;
}
