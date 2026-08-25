export type AuditEntryStatus = "ok" | "error" | "denied" | "cached" | "cancelled";

export type AuditApprovalDecision = "none" | "allowed" | "denied";

export type AuditEntry = {
  /** Unique id for this audit log entry */
  id: string;
  /** Timestamp in milliseconds (Date.now()) */
  timestamp: number;
  /** ISO-8601 string */
  isoTime: string;
  /** Scene ID or scene path if available */
  sceneId?: string;
  /** Project root path */
  projectPath?: string;
  /** Tool name */
  tool: string;
  /** Invocation arguments */
  args: unknown;
  /** Final execution status */
  status: AuditEntryStatus;
  /** Whether the result was retrieved from cache */
  cached?: boolean;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** User approval decision */
  approval?: AuditApprovalDecision;
  /** Short human-readable summary of result */
  summary?: string;
  /** Error message if execution failed */
  error?: string;
  /** ReAct turn number within the agent run */
  turn?: number;
  /** Associated session or chat run ID */
  sessionId?: string;
};

export type AuditQueryOptions = {
  limit?: number;
  sceneId?: string;
  tool?: string;
  status?: AuditEntryStatus;
  since?: number;
  until?: number;
  sessionId?: string;
};
