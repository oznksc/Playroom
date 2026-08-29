import { spawn } from "node:child_process";

export type ExecResult = {
  command: string;
  args: string[];
  cwd?: string;
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
};

export type ExecFn = (
  command: string,
  args: string[],
  options?: { cwd?: string; timeoutMs?: number; env?: NodeJS.ProcessEnv }
) => Promise<ExecResult>;

const MAX_CAPTURE = 250_000;

function truncate(s: string): string {
  if (s.length <= MAX_CAPTURE) return s;
  return `${s.slice(0, MAX_CAPTURE)}\n… truncated ${s.length - MAX_CAPTURE} chars`;
}

const defaultExec: ExecFn = (command, args, options) => {
  const timeoutMs = options?.timeoutMs ?? 60_000;
  const cwd = options?.cwd;
  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...options?.env },
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
      }, 1500);
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        command,
        args,
        cwd,
        code: null,
        stdout: truncate(stdout),
        stderr: truncate(`${stderr}\n${err.message}`),
        timedOut,
        durationMs: Date.now() - started,
      });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        command,
        args,
        cwd,
        code,
        stdout: truncate(stdout),
        stderr: truncate(stderr),
        timedOut,
        durationMs: Date.now() - started,
      });
    });
  });
};

let execImpl: ExecFn = defaultExec;

export function setLibgdxExec(fn: ExecFn | null): void {
  execImpl = fn ?? defaultExec;
}

export function getLibgdxExec(): ExecFn {
  return execImpl;
}

export function runCommand(
  command: string,
  args: string[],
  options?: { cwd?: string; timeoutMs?: number; env?: NodeJS.ProcessEnv }
): Promise<ExecResult> {
  return execImpl(command, args, options);
}

export function spawnDetached(
  command: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv }
): { pid?: number; command: string; args: string[] } {
  const child = spawn(command, args, {
    cwd: options?.cwd,
    env: { ...process.env, ...options?.env },
    stdio: "ignore",
    detached: true,
  });
  child.unref();
  return { pid: child.pid, command, args };
}

export async function which(bin: string): Promise<string | null> {
  const cmd = process.platform === "win32" ? "where" : "which";
  const result = await runCommand(cmd, [bin], { timeoutMs: 5000 });
  if (result.code !== 0) return null;
  const line = result.stdout.trim().split(/\r?\n/)[0];
  return line || null;
}
