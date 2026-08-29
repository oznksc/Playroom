import { runCommand, which } from "./exec.js";

export type IosSimulator = {
  udid: string;
  name: string;
  state: string;
  isAvailable: boolean;
  runtime: string;
};

export function parseSimctlJson(output: string): IosSimulator[] {
  const devices: IosSimulator[] = [];
  try {
    const json = JSON.parse(output) as {
      devices?: Record<string, Array<{ udid: string; name: string; state: string; isAvailable?: boolean }>>;
    };
    for (const [runtime, list] of Object.entries(json.devices ?? {})) {
      for (const d of list ?? []) {
        devices.push({
          udid: d.udid,
          name: d.name,
          state: d.state,
          isAvailable: d.isAvailable !== false,
          runtime,
        });
      }
    }
  } catch {
    // fall through to empty
  }
  return devices;
}

export async function xcrunPath(): Promise<string | null> {
  if (process.platform !== "darwin") return null;
  return which("xcrun");
}

export async function simctl(
  args: string[],
  options?: { timeoutMs?: number }
): Promise<{ ok: boolean; result: Awaited<ReturnType<typeof runCommand>>; xcrun: string | null }> {
  const bin = await xcrunPath();
  if (!bin) {
    return {
      ok: false,
      xcrun: null,
      result: {
        command: "xcrun",
        args: ["simctl", ...args],
        code: null,
        stdout: "",
        stderr:
          process.platform === "darwin"
            ? "xcrun not found. Install Xcode command-line tools."
            : "iOS Simulator control requires macOS + Xcode.",
        timedOut: false,
        durationMs: 0,
      },
    };
  }
  const result = await runCommand(bin, ["simctl", ...args], { timeoutMs: options?.timeoutMs ?? 30_000 });
  return { ok: result.code === 0 && !result.timedOut, result, xcrun: bin };
}
