import { Play, Pause, Square, Cpu, Activity } from "lucide-react";
import { cn } from "@/ui";
import styles from "./PlayControls.module.css";

type PlayControlsProps = {
  isPlaying: boolean;
  isPaused: boolean;
  playFps?: number;
  playFrameMs?: number;
  entityCount?: number;
  drawCalls?: number;
  profilerOpen?: boolean;
  onPlayToggle: () => void;
  onStop: () => void;
  onToggleProfiler?: () => void;
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
  drawCalls = 0,
  profilerOpen = false,
  onPlayToggle,
  onStop,
  onToggleProfiler,
}: PlayControlsProps) {
  const live = isPlaying && !isPaused;

  return (
    <div id="tour-topbar-play" className={styles["play-controls"]} role="toolbar" aria-label="Simulation">
      <button
        type="button"
        data-testid="play-toggle"
        className={cn(styles["play-controls-btn"], styles.play, live && styles.live, isPaused && styles.paused)}
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
        data-testid="play-stop"
        className={cn(styles["play-controls-btn"], styles.stop)}
        title="Stop"
        aria-label="Stop simulation"
        disabled={!isPlaying}
        onClick={onStop}
      >
        <Square size={11} fill="currentColor" strokeWidth={0} />
      </button>

      {isPlaying && (
        <div className={styles["play-controls-telemetry"]} title="WASD · Arrows · Space">
          <Cpu size={11} className={styles["play-controls-cpu"]} aria-hidden />
          <span className={styles["play-controls-stat"]}>
            <strong>{playFps || "—"}</strong>
            <em>fps</em>
          </span>
          <span className={styles["play-controls-dot"]} aria-hidden />
          <span className={styles["play-controls-stat"]}>
            <strong>{playFrameMs || "—"}</strong>
            <em>ms</em>
          </span>
          <span className={styles["play-controls-dot"]} aria-hidden />
          <span className={styles["play-controls-stat"]}>
            <strong>{entityCount}</strong>
            <em>ent</em>
          </span>
          <span className={styles["play-controls-dot"]} aria-hidden />
          <span className={styles["play-controls-stat"]} title="GPU draw calls (pipeline flushes)">
            <strong>{drawCalls || "—"}</strong>
            <em>dc</em>
          </span>
          {onToggleProfiler && (
            <button
              type="button"
              className={cn(styles["play-controls-btn"], styles.profiler, profilerOpen && styles.live)}
              title={profilerOpen ? "Hide profiler" : "Show profiler"}
              aria-label="Toggle profiler"
              aria-pressed={profilerOpen}
              data-testid="profiler-toggle"
              onClick={onToggleProfiler}
            >
              <Activity size={12} strokeWidth={1.75} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
