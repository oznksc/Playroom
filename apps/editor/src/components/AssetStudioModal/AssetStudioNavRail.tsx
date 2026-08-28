import React from "react";
import { Bot, ImageIcon, Film, Volume2, Music, CheckCircle2 } from "lucide-react";
import { cn } from "@/ui";
import type { AssetStudioTab } from "../../hooks/useAssetStudioGeneration.js";

type AssetStudioNavRailProps = {
  activeTab: AssetStudioTab;
  resolvedModel: string;
  onSelectCopilot: () => void;
  onSelectSprites: () => void;
  onSelectAnimated: () => void;
  onSelectSfx: () => void;
  onSelectMusic: () => void;
};

type NavItemConfig = {
  tab: AssetStudioTab;
  label: string;
  icon: React.ElementType;
  activeClass: string;
  iconActiveClass: string;
  iconInactiveClass: string;
  onClick: () => void;
};

export function AssetStudioNavRail({
  activeTab,
  resolvedModel,
  onSelectCopilot,
  onSelectSprites,
  onSelectAnimated,
  onSelectSfx,
  onSelectMusic,
}: AssetStudioNavRailProps) {
  const navItems: NavItemConfig[] = [
    {
      tab: "copilot",
      label: "AI Asset Copilot",
      icon: Bot,
      activeClass:
        "bg-gradient-to-r from-cyan-500/25 to-violet-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_20px_rgba(0,240,255,0.15)]",
      iconActiveClass: "bg-cyan-500 text-black font-bold scale-105",
      iconInactiveClass: "bg-white/[0.06] text-cyan-400",
      onClick: onSelectCopilot,
    },
    {
      tab: "sprites",
      label: "Sprites & Props Matrix",
      icon: ImageIcon,
      activeClass:
        "bg-gradient-to-r from-blue-500/20 to-cyan-500/10 text-blue-300 border border-blue-500/30",
      iconActiveClass: "bg-blue-500 text-black font-bold scale-105",
      iconInactiveClass: "bg-white/[0.06] text-blue-400",
      onClick: onSelectSprites,
    },
    {
      tab: "animated",
      label: "Animation Cycles",
      icon: Film,
      activeClass:
        "bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 text-violet-300 border border-violet-500/30",
      iconActiveClass: "bg-violet-500 text-white font-bold scale-105",
      iconInactiveClass: "bg-white/[0.06] text-violet-400",
      onClick: onSelectAnimated,
    },
    {
      tab: "sfx",
      label: "Sound FX (SFX)",
      icon: Volume2,
      activeClass:
        "bg-gradient-to-r from-yellow-500/20 to-amber-500/10 text-yellow-300 border border-yellow-500/30",
      iconActiveClass: "bg-yellow-500 text-black font-bold scale-105",
      iconInactiveClass: "bg-white/[0.06] text-yellow-400",
      onClick: onSelectSfx,
    },
    {
      tab: "music",
      label: "Chiptune BGM Studio",
      icon: Music,
      activeClass:
        "bg-gradient-to-r from-purple-500/20 to-pink-500/10 text-purple-300 border border-purple-500/30",
      iconActiveClass: "bg-purple-500 text-white font-bold scale-105",
      iconInactiveClass: "bg-white/[0.06] text-purple-400",
      onClick: onSelectMusic,
    },
  ];

  return (
    <nav className="w-56 border-r border-white/[0.06] bg-black/30 p-3 flex flex-col justify-between shrink-0 select-none">
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-muted px-2 mb-1">
          Studio Stations
        </span>

        {navItems.map(
          ({
            tab,
            label,
            icon: Icon,
            activeClass,
            iconActiveClass,
            iconInactiveClass,
            onClick,
          }) => (
            <button
              key={tab}
              type="button"
              onClick={onClick}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-left active:scale-[0.98]",
                activeTab === tab
                  ? activeClass
                  : "text-text-muted hover:bg-white/[0.04] hover:text-white"
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-transform duration-150",
                  activeTab === tab ? iconActiveClass : iconInactiveClass
                )}
              >
                <Icon size={13} />
              </div>
              <span>{label}</span>
            </button>
          )
        )}
      </div>

      {/* Agent Engine Status */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 flex flex-col gap-1.5 text-[10px] text-text-muted">
        <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
          <CheckCircle2 size={12} className="text-cyan-400" />
          <span>Agent Connected</span>
        </div>
        <span className="text-white/60">Model: {resolvedModel}</span>
        <span className="text-white/40">MCP Tools: Active</span>
      </div>
    </nav>
  );
}
