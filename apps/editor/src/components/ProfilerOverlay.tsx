import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import {
  EMPTY_PROFILER_SAMPLE,
  pushSample,
  sparklinePath,
  type PlayProfilerSample,
} from "../lib/play-profiler.js";

type ProfilerOverlayProps = {
  sample: PlayProfilerSample | null;
  open: boolean;
};

export function ProfilerOverlay({ sample, open }: ProfilerOverlayProps) {
  const current = sample ?? EMPTY_PROFILER_SAMPLE;
  const [fpsHistory, setFpsHistory] = useState<number[]>([]);
  const [drawHistory, setDrawHistory] = useState<number[]>([]);

  useEffect(() => {
    if (!open || !sample) return;
    setFpsHistory((prev) => pushSample(prev, sample.fps));
    setDrawHistory((prev) => pushSample(prev, sample.drawCalls));
  }, [open, sample]);

  if (!open) return null;

  const fpsPath = sparklinePath(fpsHistory, 216, 36);
  const drawPath = sparklinePath(drawHistory, 216, 36);
  const rows: Array<[string, string | number]> = [
    ["Draw calls", current.drawCalls],
    ["Display list", `${current.visible}/${current.displayList}`],
    ["Sprites", current.breakdown.sprites],
    ["Images", current.breakdown.images],
    ["Text", current.breakdown.texts],
    ["Tilemaps", current.breakdown.tilemaps],
    ["Graphics", current.breakdown.graphics],
    ["Particles", current.breakdown.particles],
    ["Bodies", `${current.bodies} dyn · ${current.staticBodies} st`],
    ["Textures", current.textures],
    ["Cameras", current.cameras],
    ["Lights", current.lights],
  ];
  if (current.jsHeapMb != null) rows.push(["JS heap", `${current.jsHeapMb} MB`]);

  return (
    <aside className="profiler-overlay" data-testid="profiler-overlay" aria-label="Play profiler">
      <header className="profiler-overlay-head">
        <Activity size={12} strokeWidth={1.75} />
        <span>Profiler</span>
        <span className="profiler-overlay-fps type-mono">
          {current.fps || "—"} fps · {current.frameMs || "—"} ms
        </span>
      </header>
      <svg className="profiler-spark" viewBox="0 0 216 36" aria-hidden>
        <path d={fpsPath} className="profiler-spark-fps" />
        <path d={drawPath} className="profiler-spark-draws" />
      </svg>
      <dl className="profiler-rows">
        {rows.map(([label, value]) => (
          <div key={label} className="profiler-row">
            <dt>{label}</dt>
            <dd className="type-mono">{value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
