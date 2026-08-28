import { useState } from "react";
import { Sparkles, Play, Wand2, Gamepad2, Layers, X, Share2, Compass } from "lucide-react";
import { Button, Badge, cn } from "@/ui";

interface QuickStartBannerProps {
  onPlayTest: () => void;
  onOpenAssetStudio: () => void;
  onOpenLevels: () => void;
  onOpenTour: () => void;
  onNewProject?: () => void;
}

export function QuickStartBanner({
  onPlayTest,
  onOpenAssetStudio,
  onOpenLevels,
  onOpenTour,
  onNewProject,
}: QuickStartBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem("gamekit_quickstart_dismissed") === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    try {
      localStorage.setItem("gamekit_quickstart_dismissed", "1");
    } catch {
      // ignore
    }
  }

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 w-[min(680px,calc(100vw-32px))] animate-tab-enter">
      <div className="rounded-2xl border border-accent/30 bg-bg-surface/90 p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-8 rounded-xl border border-accent/40 bg-accent/15 flex items-center justify-center text-accent shrink-0">
            <Sparkles size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-primary truncate">
                Game Playground Ready!
              </span>
              <Badge variant="accent" className="text-[9px] uppercase font-mono px-1 py-0">
                Ready to play
              </Badge>
            </div>
            <p className="text-[11px] text-text-muted truncate">
              Press{" "}
              <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[10px] text-accent">
                Space
              </kbd>{" "}
              to test gameplay mechanics immediately.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onPlayTest}
            className="gap-1 bg-accent text-black font-semibold hover:bg-accent-hover text-xs h-7 px-2.5 shadow-[0_0_10px_rgba(0,240,255,0.25)]"
          >
            <Play size={12} fill="currentColor" />
            Play Test
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onOpenAssetStudio}
            className="gap-1 text-xs h-7 px-2"
            title="Open AI Asset Studio"
          >
            <Wand2 size={12} className="text-accent" />
            Assets
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onOpenTour}
            className="gap-1 text-xs h-7 px-2 text-text-muted hover:text-text-primary"
            title="Start interactive tour"
          >
            <Compass size={12} />
            Tour
          </Button>

          <button
            type="button"
            onClick={handleDismiss}
            className="size-7 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/10 flex items-center justify-center transition-colors ml-1"
            title="Dismiss quick start banner"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
