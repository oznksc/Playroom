import { Play, Pause, Square, Cpu } from "lucide-react";
import { cn } from "@/ui";

type PlayControlsProps = {
  isPlaying: boolean;
  isPaused: boolean;
  playFps?: number;
  playFrameMs?: number;
  entityCount?: number;
  onPlayToggle: () => void;
  onStop: () => void;
};

/**
 * Compact Apple-style control pill — top center.
 * Simulation transport only (play / pause / stop + live telemetry).
 */
export function PlayControls({
  isPlaying,
  isPaused,
  playFps = 0,
  playFrameMs = 0,
  entityCount = 0,
  onPlayToggle,
  onStop,
}: PlayControlsProps) {
  const live = isPlaying && !isPaused;

  return (
    <div className="play-controls" role="toolbar" aria-label="Simulation">
      <button
        type="button"
        className={cn("play-controls-btn play", live && "live", isPaused && "paused")}
        title={live ? "Pause" : isPlaying ? "Resume" : "Play"}
        aria-label={live ? "Pause" : "Play"}
        onClick={onPlayToggle}
      >
        {live ? (
          <Pause size={14} fill="currentColor" strokeWidth={0} />
        ) : (
          <Play size={14} fill="currentColor" strokeWidth={0} className="translate-x-px" />
        )}
      </button>

      <button
        type="button"
        className="play-controls-btn stop"
        title="Stop"
        aria-label="Stop simulation"
        disabled={!isPlaying}
        onClick={onStop}
      >
        <Square size={11} fill="currentColor" strokeWidth={0} />
      </button>

      {isPlaying && (
        <div className="play-controls-telemetry">
          <Cpu size={11} className="play-controls-cpu" aria-hidden />
          <span className="play-controls-stat">
            <strong>{playFps || "—"}</strong>
            <em>fps</em>
          </span>
          <span className="play-controls-dot" aria-hidden />
          <span className="play-controls-stat">
            <strong>{playFrameMs || "—"}</strong>
            <em>ms</em>
          </span>
          <span className="play-controls-dot" aria-hidden />
          <span className="play-controls-stat">
            <strong>{entityCount}</strong>
            <em>ent</em>
          </span>
        </div>
      )}
    </div>
  );
}
