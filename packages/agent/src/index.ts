export type {
  ProviderAdapter,
  ProviderMessage,
  ToolCall,
  ModelTool,
  StreamInput,
  StreamEvent,
  ProviderId,
} from "./providers/types.js";

export { AnthropicAdapter } from "./providers/anthropic.js";
export { LmStudioAdapter } from "./providers/lmstudio.js";

export type { SseEvent } from "./loop/streaming.js";
export { encodeSse } from "./loop/streaming.js";

export type { KeyVault, StoredKey } from "./store/keys.js";

export { McpClient } from "./mcp/client.js";
export { listTools, toModelTools } from "./mcp/tools.js";
export { callTool } from "./mcp/executor.js";

export type { AgentInput, AgentDeps } from "./loop/agent.js";
export { runAgent } from "./loop/agent.js";

export { MessageHistory } from "./loop/history.js";
export { ApprovalGate } from "./loop/approval.js";
export type { ApprovalMode } from "./loop/approval.js";

export { buildSystemPrompt } from "./system/prompt.js";
export type { PromptContext } from "./system/prompt.js";
export { loadSkillSummaries } from "./system/skills-loader.js";
