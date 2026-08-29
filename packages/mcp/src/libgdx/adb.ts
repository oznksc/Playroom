import { runCommand, which } from "./exec.js";

export type AndroidDevice = {
  serial: string;
  state: string;
  usb?: string;
  product?: string;
  model?: string;
  device?: string;
  transportId?: string;
  emulator: boolean;
  description: string;
};

export function parseAdbDevices(output: string): AndroidDevice[] {
  const devices: AndroidDevice[] = [];
  const lines = output.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim() || line.startsWith("List of devices")) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const serial = parts[0];
    const state = parts[1];
    const extra: Record<string, string> = {};
    for (const token of parts.slice(2)) {
      const eq = token.indexOf(":");
      if (eq > 0) extra[token.slice(0, eq)] = token.slice(eq + 1);
    }
    devices.push({
      serial,
      state,
      usb: extra.usb,
      product: extra.product,
      model: extra.model,
      device: extra.device,
      transportId: extra.transport_id,
      emulator: serial.startsWith("emulator-") || extra.product?.includes("sdk_gphone") === true,
      description: line.trim(),
    });
  }
  return devices;
}

export function parseAvdList(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("INFO") && !l.startsWith("ERROR"));
}

export async function adbPath(): Promise<string | null> {
  return which("adb");
}

export async function emulatorPath(): Promise<string | null> {
  return which("emulator");
}

export async function adb(
  args: string[],
  options?: { timeoutMs?: number }
): Promise<{ ok: boolean; result: Awaited<ReturnType<typeof runCommand>>; adb: string | null }> {
  const bin = await adbPath();
  if (!bin) {
    return {
      ok: false,
      adb: null,
      result: {
        command: "adb",
        args,
        code: null,
        stdout: "",
        stderr: "adb not found on PATH. Install Android platform-tools.",
        timedOut: false,
        durationMs: 0,
      },
    };
  }
  const result = await runCommand(bin, args, { timeoutMs: options?.timeoutMs ?? 30_000 });
  return { ok: result.code === 0 && !result.timedOut, result, adb: bin };
}
