import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: string;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

type PendingRequest = {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
};

export class McpClient {
  private process: ChildProcess | null = null;
  private pending = new Map<string, PendingRequest>();
  private buffer = "";
  private closed = false;
  private respawnCount = 0;
  private readonly maxRespawns = 3;

  constructor(
    private readonly cliPath: string,
    private readonly projectPath: string,
  ) {}

  async connect(): Promise<void> {
    await this.spawnProcess();
  }

  private async spawnProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn("node", [this.cliPath, "mcp", this.projectPath], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env },
      });

      this.process.stdout!.on("data", (chunk: Buffer) => {
        this.handleStdout(chunk);
      });

      this.process.stderr!.on("data", (chunk: Buffer) => {
        // MCP server logs to stderr — ignore
      });

      this.process.on("close", (code) => {
        if (!this.closed) {
          this.rejectAllPending(new Error(`MCP process exited with code ${code}`));
          this.tryRespawn().then(resolve).catch(reject);
          return;
        }
        resolve();
      });

      this.process.on("error", (err) => {
        reject(err);
      });

      // Give the process a moment to start
      setTimeout(() => resolve(), 200);
    });
  }

  private async tryRespawn(): Promise<void> {
    if (this.respawnCount >= this.maxRespawns) {
      throw new Error(`MCP process crashed ${this.maxRespawns} times — giving up`);
    }
    this.respawnCount++;
    const delay = Math.pow(2, this.respawnCount) * 500;
    await new Promise((r) => setTimeout(r, delay));
    await this.spawnProcess();
  }

  private handleStdout(chunk: Buffer): void {
    this.buffer += chunk.toString();
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const msg = JSON.parse(trimmed) as JsonRpcResponse;
        const pending = this.pending.get(msg.id);
        if (pending) {
          this.pending.delete(msg.id);
          if (msg.error) {
            pending.reject(new Error(`MCP error ${msg.error.code}: ${msg.error.message}`));
          } else {
            pending.resolve(msg.result);
          }
        }
      } catch {
        // not JSON — ignore
      }
    }
  }

  private rejectAllPending(error: Error): void {
    for (const [id, pending] of this.pending) {
      pending.reject(error);
      this.pending.delete(id);
    }
  }

  async request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.process || !this.process.stdin) {
      throw new Error("MCP client not connected");
    }

    const id = randomUUID();
    const msg: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.process!.stdin!.write(JSON.stringify(msg) + "\n");

      // Timeout after 30s
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`MCP request timed out: ${method}`));
        }
      }, 30_000);
    });
  }

  async close(): Promise<void> {
    this.closed = true;
    this.rejectAllPending(new Error("MCP client closed"));
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}
