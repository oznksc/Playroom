import { useState, useEffect } from "react";
import {
  Sparkles,
  FolderOpen,
  Folder,
  Globe,
  Smartphone,
  Monitor,
  Gamepad2,
  Compass,
  Boxes,
  Zap,
  Plus,
  Play,
  Trash2,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Terminal,
  Clock,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import {
  Button,
  Badge,
  EmptyState,
  cn,
} from "@/ui";
import { NewProjectWizard, type ProjectPlatform, type ProjectGenre } from "./NewProjectWizard.js";
import logoUrl from "../../../../logo.png";

interface ExampleProject {
  id: string;
  name: string;
  description: string;
  path: string;
}

interface WelcomeHubProps {
  recentProjects: string[];
  exampleProjects: string[];
  isLoadingProject: boolean;
  projectLoadError: string | null;
  onOpenFolder: () => void;
  onSelectProject: (path: string) => void;
  onRemoveRecent?: (path: string) => void;
}

export function WelcomeHub({
  recentProjects,
  exampleProjects,
  isLoadingProject,
  projectLoadError,
  onOpenFolder,
  onSelectProject,
  onRemoveRecent,
}: WelcomeHubProps) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<ProjectPlatform>("web");
  const [selectedGenre, setSelectedGenre] = useState<ProjectGenre>("platformer");

  function openWizardWith(platform: ProjectPlatform, genre: ProjectGenre) {
    setSelectedPlatform(platform);
    setSelectedGenre(genre);
    setWizardOpen(true);
  }

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-y-auto bg-bg-base text-text-primary select-none font-sans">
      {/* Ambient background glows */}
      <div
        className="pointer-events-none fixed inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 20% 15%, rgba(0,240,255,0.07) 0%, transparent 45%), radial-gradient(circle at 80% 85%, rgba(139,92,246,0.08) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(16,185,129,0.03) 0%, transparent 60%)",
        }}
      />

      {/* Grid Pattern */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Header bar */}
      <header className="relative z-10 flex h-14 w-full shrink-0 items-center justify-between border-b border-border-default bg-bg-base/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="Playroom" className="size-8 object-contain" />
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wider text-sm font-mono text-text-primary">
              PLAYROOM
            </span>
            <Badge variant="accent" className="text-[10px] uppercase font-mono px-1.5 py-0.5">
              v0.1 STUDIO
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.open("https://github.com/oznksc/Playroom", "_blank")}
            className="gap-1.5 text-xs text-text-muted hover:text-text-primary"
          >
            <BookOpen size={13} />
            Documentation
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setWizardOpen(true)}
            className="gap-1.5 bg-accent text-[#06090e] font-semibold hover:bg-accent-hover text-xs shadow-[0_0_12px_rgba(0,240,255,0.25)]"
          >
            <Plus size={14} className="text-[#06090e]" />
            New Game Project
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 p-6 md:p-10">
        {/* Hero Section */}
        <div className="flex flex-col items-start md:flex-row md:items-center md:justify-between gap-6 border-b border-border-default pb-8">
          <div className="space-y-2 max-w-2xl">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary flex items-center gap-3">
              Next-Gen 2D Game Creation
              <span className="inline-block size-2 rounded-full bg-accent animate-pulse" />
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              Build high-performance games for Web (Phaser 3), Mobile iOS & Android (Expo + Skia), and Desktop (Tauri).
              Scaffold full projects with one click, edit scenes visually, and test instantly in real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="lg"
              disabled={isLoadingProject}
              onClick={onOpenFolder}
              className="gap-2 text-sm border-border-strong bg-bg-elevated hover:bg-bg-hover hover:border-accent/40"
            >
              <FolderOpen size={16} className="text-accent" />
              {isLoadingProject ? "Opening..." : "Open Existing Project"}
            </Button>

            <Button
              variant="primary"
              size="lg"
              onClick={() => setWizardOpen(true)}
              className="gap-2 text-sm bg-accent text-[#06090e] hover:bg-accent-hover font-semibold px-5 shadow-[0_0_20px_rgba(0,240,255,0.3)]"
            >
              <Sparkles size={16} className="text-[#06090e]" />
              Create New Game
            </Button>
          </div>
        </div>

        {/* Error Alert if any */}
        {projectLoadError && (
          <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-xs leading-relaxed text-error flex items-start gap-3">
            <div className="size-5 rounded-full bg-error/20 flex items-center justify-center shrink-0 mt-0.5">
              ✖
            </div>
            <div className="space-y-1">
              <span className="font-semibold block">Failed to open project</span>
              <p className="text-error/90 font-mono text-[11px] whitespace-pre-wrap">{projectLoadError}</p>
            </div>
          </div>
        )}

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
          {/* Card 1: 2D Platformer */}
          <div
            onClick={() => openWizardWith("web", "platformer")}
            className="group cursor-pointer rounded-2xl border border-border-default bg-bg-elevated/40 p-5 transition-all duration-200 hover:border-accent/50 hover:bg-bg-elevated hover:shadow-[0_8px_30px_rgba(0,240,255,0.08)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="size-10 rounded-xl border border-accent/30 bg-accent/15 flex items-center justify-center text-accent group-hover:scale-105 transition-transform">
                  <Gamepad2 size={20} />
                </div>
                <Badge variant="accent" className="text-[10px]">
                  Starter Pack
                </Badge>
              </div>
              <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors flex items-center gap-1.5">
                2D Platformer
                <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Physics engine, responsive jump arcs, animated hero sprite, coin collection triggers, and hazard spikes.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/[0.04] text-[11px] text-text-secondary">
              <span>Web / Expo / Tauri</span>
              <span className="font-mono text-accent">Quick Scaffold →</span>
            </div>
          </div>

          {/* Card 2: Top-Down Adventure */}
          <div
            onClick={() => openWizardWith("web", "topdown")}
            className="group cursor-pointer rounded-2xl border border-border-default bg-bg-elevated/40 p-5 transition-all duration-200 hover:border-accent/50 hover:bg-bg-elevated hover:shadow-[0_8px_30px_rgba(0,240,255,0.08)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="size-10 rounded-xl border border-purple-500/30 bg-purple-500/15 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                  <Compass size={20} />
                </div>
                <Badge variant="muted" className="text-[10px]">
                  RPG Template
                </Badge>
              </div>
              <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors flex items-center gap-1.5">
                Top-Down Adventure
                <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                8-directional movement, wall collision bounds, camera target smoothing, and collectible inventory.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/[0.04] text-[11px] text-text-secondary">
              <span>Web / Expo / Tauri</span>
              <span className="font-mono text-accent">Quick Scaffold →</span>
            </div>
          </div>

          {/* Card 3: Physics Puzzle */}
          <div
            onClick={() => openWizardWith("web", "physics-puzzle")}
            className="group cursor-pointer rounded-2xl border border-border-default bg-bg-elevated/40 p-5 transition-all duration-200 hover:border-accent/50 hover:bg-bg-elevated hover:shadow-[0_8px_30px_rgba(0,240,255,0.08)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="size-10 rounded-xl border border-emerald-500/30 bg-emerald-500/15 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Boxes size={20} />
                </div>
                <Badge variant="muted" className="text-[10px]">
                  Physics & Logic
                </Badge>
              </div>
              <h3 className="text-base font-semibold text-text-primary group-hover:text-accent transition-colors flex items-center gap-1.5">
                Physics & Puzzle
                <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Rigid bodies, pushable puzzle boxes, pressure socket triggers, and multi-level progress states.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/[0.04] text-[11px] text-text-secondary">
              <span>Web / Expo / Tauri</span>
              <span className="font-mono text-accent">Quick Scaffold →</span>
            </div>
          </div>

        {/* Card 4: LibGDX Native */}
        <div
          onClick={() => openWizardWith("libgdx" as ProjectPlatform, "platformer")}
          className="group cursor-pointer rounded-2xl border border-border-default bg-bg-elevated/40 p-5 transition-all duration-200 hover:border-amber-400/50 hover:bg-bg-elevated hover:shadow-[0_8px_30px_rgba(251,191,36,0.08)] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="size-10 rounded-xl border border-amber-400/30 bg-amber-400/15 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Monitor size={20} />
              </div>
              <Badge variant="muted" className="text-[10px]">
                LibGDX
              </Badge>
            </div>
            <h3 className="text-base font-semibold text-text-primary group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
              Native Desktop
              <ArrowUpRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Java/Kotlin + Gradle pipeline for Android, Desktop, and iOS via libGDX runtime.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between pt-3 border-t border-white/[0.04] text-[11px] text-text-secondary">
            <span>Android / Desktop / iOS</span>
            <span className="font-mono text-amber-400">Quick Scaffold →</span>
          </div>
        </div>
      </div>

        {/* Lower Grid: Recent Projects & Built-in Starters */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
          {/* Recent Projects */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-2 font-mono">
                <Clock size={14} className="text-accent" />
                Recent Projects
              </h2>
              <span className="text-[11px] text-text-muted">
                {recentProjects.length} saved
              </span>
            </div>

            {recentProjects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-default p-8 text-center bg-bg-surface/50">
                <FolderOpen size={24} className="mx-auto text-text-muted mb-2" />
                <p className="text-xs text-text-muted">No recent projects yet</p>
                <p className="text-[11px] text-text-muted/60 mt-0.5">
                  Create a new project or open an existing directory above.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                {recentProjects.map((path) => {
                  const parts = path.split(/[\/\\]/);
                  const folderName = parts[parts.length - 1] || path;
                  return (
                    <div
                      key={path}
                      className="group flex items-center justify-between rounded-xl border border-border-default bg-bg-elevated/40 p-3 hover:border-accent/40 hover:bg-bg-elevated transition-all"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectProject(path)}
                        className="flex items-center gap-3 text-left min-w-0 flex-1"
                      >
                        <div className="size-8 rounded-lg border border-border-default bg-bg-base flex items-center justify-center text-accent shrink-0">
                          <Folder size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-semibold text-text-primary truncate block group-hover:text-accent">
                            {folderName}
                          </span>
                          <span className="text-[10px] text-text-muted font-mono truncate block" title={path}>
                            {path}
                          </span>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {onRemoveRecent && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveRecent(path);
                            }}
                            className="size-7 rounded-md text-text-muted hover:text-error hover:bg-error/10 flex items-center justify-center transition-colors"
                            title="Remove from recents"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectProject(path)}
                          className="size-7 rounded-md text-accent hover:bg-accent/10 flex items-center justify-center transition-colors"
                          title="Open project"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Engine Features / Documentation Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary flex items-center gap-2 font-mono">
                <Layers size={14} className="text-accent" />
                Playroom Capabilities
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-xl border border-border-default bg-bg-elevated/30">
                <span className="text-xs font-semibold text-text-primary block mb-1 flex items-center gap-1.5">
                  <Smartphone size={13} className="text-purple-400" />
                  React Native Skia
                </span>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Full mobile 2D pipeline with GPU shaders, gesture listeners, and touch controls.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border-default bg-bg-elevated/30">
                <span className="text-xs font-semibold text-text-primary block mb-1 flex items-center gap-1.5">
                  <Globe size={13} className="text-accent" />
                  Phaser 3 Web Runtime
                </span>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Fast 60FPS browser canvas with SceneManager and live hot-swapping.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border-default bg-bg-elevated/30">
                <span className="text-xs font-semibold text-text-primary block mb-1 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-accent" />
                  AI Asset Studio
                </span>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Generate pixel art sprites, walk animations, chiptune sound effects, and music.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border-default bg-bg-elevated/30">
                <span className="text-xs font-semibold text-text-primary block mb-1 flex items-center gap-1.5">
                  <Terminal size={13} className="text-emerald-400" />
                  MCP Agent Tools
                </span>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Natural language game editing with integrated Model Context Protocol server.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-400/20 bg-amber-400/[0.05]">
                <span className="text-xs font-semibold text-text-primary block mb-1 flex items-center gap-1.5">
                  <Monitor size={13} className="text-amber-400" />
                  LibGDX Native
                </span>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Gradle multi-project targeting Android, Desktop, iOS, and HTML via Java/Kotlin.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* New Project Wizard Modal */}
      <NewProjectWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        defaultPlatform={selectedPlatform}
        defaultGenre={selectedGenre}
        onProjectCreated={(projectPath) => {
          onSelectProject(projectPath);
        }}
      />
    </div>
  );
}
