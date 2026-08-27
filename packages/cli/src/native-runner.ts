import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, chmod } from "node:fs/promises";
import { join } from "node:path";
import { exportProject, getGameKitRoot } from "./project.js";

export type NativeRunnerStatus = "idle" | "launching" | "running" | "stopped" | "error";

export type NativeRunnerState = {
  running: boolean;
  status: NativeRunnerStatus;
  pid?: number;
  exitCode?: number | null;
  logs: string[];
};

export class NativeRunnerManager {
  private childProcess: ChildProcess | null = null;
  private currentStatus: NativeRunnerStatus = "idle";
  private logsBuffer: string[] = [];
  private readonly maxLogs = 250;
  private logListeners = new Set<(line: string) => void>();

  public getState(): NativeRunnerState {
    return {
      running: this.childProcess !== null && !this.childProcess.killed,
      status: this.currentStatus,
      pid: this.childProcess?.pid,
      exitCode: this.childProcess?.exitCode ?? null,
      logs: [...this.logsBuffer],
    };
  }

  public addLogListener(listener: (line: string) => void): () => void {
    this.logListeners.add(listener);
    return () => this.logListeners.delete(listener);
  }

  private appendLog(line: string) {
    const trimmed = line.trimEnd();
    if (!trimmed) return;
    this.logsBuffer.push(trimmed);
    if (this.logsBuffer.length > this.maxLogs) {
      this.logsBuffer.shift();
    }
    for (const listener of this.logListeners) {
      try {
        listener(trimmed);
      } catch (err) {
        console.error("Error in log listener:", err);
      }
    }
  }

  public async syncProjectToNative(root: string): Promise<string> {
    const nativeDir = join(root, ".playroom", "native");
    const buildGradle = join(nativeDir, "build.gradle");

    if (!existsSync(buildGradle)) {
      this.appendLog("[NativeRunner] Initializing libGDX native project under .playroom/native...");
      await exportProject(root, nativeDir, "libgdx");
    } else {
      // Incremental sync of scenes, project.json, and assets
      const gamekitRoot = getGameKitRoot(root);
      const targetGamekit = join(nativeDir, "assets", "gamekit");

      try {
        const scenesSrc = join(gamekitRoot, "scenes");
        if (existsSync(scenesSrc)) {
          await cp(scenesSrc, join(targetGamekit, "scenes"), { recursive: true });
        }

        const projJson = join(gamekitRoot, "project.json");
        if (existsSync(projJson)) {
          await cp(projJson, join(targetGamekit, "project.json"));
        }

        const assetsSrc = join(gamekitRoot, "assets");
        if (existsSync(assetsSrc)) {
          await cp(assetsSrc, join(targetGamekit, "assets"), { recursive: true });
        }
      } catch (err) {
        this.appendLog(`[NativeRunner] Warning: Incremental sync error: ${err}`);
      }
    }

    // Ensure gradlew has executable permission
    try {
      const gradlewPath = join(nativeDir, "gradlew");
      if (existsSync(gradlewPath)) {
        await chmod(gradlewPath, 0o755);
      }
    } catch (_) {}

    return nativeDir;
  }

  public async start(root: string): Promise<NativeRunnerState> {
    if (this.childProcess && !this.childProcess.killed) {
      await this.stop();
    }

    this.currentStatus = "launching";
    this.appendLog("[NativeRunner] Preparing native desktop runner...");

    let nativeDir: string;
    try {
      nativeDir = await this.syncProjectToNative(root);
    } catch (err) {
      this.currentStatus = "error";
      this.appendLog(`[NativeRunner] Failed to sync project: ${err}`);
      return this.getState();
    }

    const isWindows = process.platform === "win32";
    const gradlewCmd = isWindows ? "gradlew.bat" : "./gradlew";

    this.appendLog(`[NativeRunner] Spawning: ${gradlewCmd} lwjgl3:run in ${nativeDir}`);

    const child = spawn(gradlewCmd, ["lwjgl3:run"], {
      cwd: nativeDir,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    this.childProcess = child;
    this.currentStatus = "running";

    child.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.trim()) {
          this.appendLog(line);
        }
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.trim()) {
          this.appendLog(`[STDERR] ${line}`);
        }
      }
    });

    child.on("error", (err) => {
      this.appendLog(`[NativeRunner] Process error: ${err.message}`);
      this.currentStatus = "error";
    });

    child.on("close", (code) => {
      this.appendLog(`[NativeRunner] Process exited with code ${code}`);
      this.currentStatus = "stopped";
      this.childProcess = null;
    });

    return this.getState();
  }

  public async stop(): Promise<void> {
    if (!this.childProcess || this.childProcess.killed) {
      this.currentStatus = "stopped";
      this.childProcess = null;
      return;
    }

    this.appendLog("[NativeRunner] Terminating native process...");
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (this.childProcess && !this.childProcess.killed) {
          this.childProcess.kill("SIGKILL");
        }
        this.currentStatus = "stopped";
        this.childProcess = null;
        resolve();
      }, 2000);

      this.childProcess?.once("close", () => {
        clearTimeout(timeout);
        this.currentStatus = "stopped";
        this.childProcess = null;
        resolve();
      });

      this.childProcess?.kill("SIGTERM");
    });
  }
}

export const defaultNativeRunner = new NativeRunnerManager();
