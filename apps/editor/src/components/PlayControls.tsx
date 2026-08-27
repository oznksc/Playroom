import { Play, Pause, Square, Cpu, Activity, MonitorPlay, Loader2 } from "lucide-react";
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
  isNativeRunning?: boolean;
  isNativeLaunching?: boolean;
  onPlayToggle: () => void;
  onStop: () => void;
  onToggleProfiler?: () => void;
  onNativePlayToggle?: () => void;
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
  isNativeRunning = false,
  isNativeLaunching = false,
  onPlayToggle,
  onStop,
  onToggleProfiler,
  onNativePlayToggle,
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

      {onNativePlayToggle && (
        <>
          <div className="h-3.5 w-px bg-white/10 mx-0.5" aria-hidden />
          <button
            type="button"
            data-testid="native-play-toggle"
            className={cn(
              styles["play-controls-btn"],
              isNativeRunning && styles.live,
              isNativeLaunching && "animate-pulse"
            )}
            title={
              isNativeLaunching
                ? "Launching Native Desktop..."
                : isNativeRunning
                  ? "Stop Native Desktop (libGDX)"
                  : "Run Native Desktop (libGDX)"
            }
            aria-label={isNativeRunning ? "Stop Native Game" : "Run Native Desktop"}
            onClick={onNativePlayToggle}
          >
            {isNativeLaunching ? (
              <Loader2 size={13} className="animate-spin text-amber-400" />
            ) : isNativeRunning ? (
              <Square size={10} fill="currentColor" className="text-red-400" />
            ) : (
              <MonitorPlay size={13} className="text-cyan-400" />
            )}
          </button>
        </>
      )}

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
