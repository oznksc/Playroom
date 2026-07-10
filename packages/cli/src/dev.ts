import { watch } from "node:fs";
import { join } from "node:path";
import { getGameKitRoot, generateAssetRegistry } from "./project.js";
import { runDoctor } from "./doctor.js";

export type DevWatchOptions = {
  platform?: "web" | "mobile";
  onChange?: (event: { type: string; path: string }) => void;
};

/**
 * Watch gamekit/scenes and gamekit/assets; re-run generate + lightweight doctor on change.
 * Returns a stop() function.
 */
export function startDevWatch(root: string, options: DevWatchOptions = {}): { stop: () => void } {
  const gamekitRoot = getGameKitRoot(root);
  const platform = options.platform ?? "mobile";
  let timer: ReturnType<typeof setTimeout> | null = null;
  const watchers: Array<ReturnType<typeof watch>> = [];

  const schedule = (type: string, path: string) => {
    options.onChange?.({ type, path });
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void (async () => {
        try {
          await generateAssetRegistry(root, platform);
          const report = await runDoctor(root);
          const errs = report.summary.errors;
          const warns = report.summary.warnings;
          console.log(
            `[gamekit dev] ${type}: ${path} → assets regenerated · doctor ${errs} error(s), ${warns} warning(s)`,
          );
        } catch (e) {
          console.error(`[gamekit dev] failed:`, e instanceof Error ? e.message : e);
        }
      })();
    }, 250);
  };

  for (const sub of ["scenes", "assets", "prefabs"]) {
    const dir = join(gamekitRoot, sub);
    try {
      const w = watch(dir, { recursive: true }, (event, filename) => {
        schedule(event, filename ? join(sub, filename.toString()) : sub);
      });
      watchers.push(w);
    } catch {
      // directory may not exist yet
    }
  }

  // Also watch project.json
  try {
    const w = watch(join(gamekitRoot, "project.json"), (event) => {
      schedule(event, "project.json");
    });
    watchers.push(w);
  } catch {
    // ignore
  }

  console.log(`[gamekit dev] watching ${gamekitRoot} (platform=${platform})`);
  console.log(`[gamekit dev] edit scenes/assets — Ctrl+C to stop`);

  return {
    stop() {
      if (timer) clearTimeout(timer);
      for (const w of watchers) w.close();
    },
  };
}
