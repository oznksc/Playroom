import { useState, useEffect } from "react";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  FolderOpen,
  Globe,
  Smartphone,
  Monitor,
  Gamepad2,
  Compass,
  Crosshair,
  Boxes,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  Package,
} from "lucide-react";
import { getApiUrl } from "../lib/api.js";
import { Dialog, ModalShell, Button, Input, Field, Badge, Checkbox, cn } from "@/ui";

export type ProjectPlatform = "web" | "expo" | "tauri" | "libgdx";
export type ProjectGenre =
  "platformer" | "topdown" | "topdown-shooter" | "physics-puzzle" | "endless-runner" | "blank";
export type PackageManager = "pnpm" | "bun" | "yarn" | "npm";

export interface GenreOption {
  id: ProjectGenre;
  name: string;
  description: string;
  tag: string;
  icon: typeof Gamepad2;
}

const GENRES: GenreOption[] = [
  {
    id: "platformer",
    name: "2D Platformer",
    description: "Jump, run, collect coins, avoid hazard spikes, and clear levels.",
    tag: "Popular",
    icon: Gamepad2,
  },
  {
    id: "topdown",
    name: "Top-Down Adventure",
    description: "8-way exploration with obstacles, chests, and camera follow.",
    tag: "RPG",
    icon: Compass,
  },
  {
    id: "topdown-shooter",
    name: "Action Shooter",
    description: "Arena shooter with enemy combat, health points, and score.",
    tag: "Action",
    icon: Crosshair,
  },
  {
    id: "physics-puzzle",
    name: "Physics & Puzzle",
    description: "Push blocks, trigger pressure plates, and reach goal sockets.",
    tag: "Puzzle",
    icon: Boxes,
  },
  {
    id: "endless-runner",
    name: "Endless Runner",
    description: "Fast-paced reflex runner with coin streaks and instant retries.",
    tag: "Arcade",
    icon: Zap,
  },
  {
    id: "blank",
    name: "Blank Canvas",
    description: "Clean starting template with player entity and camera follow.",
    tag: "Clean",
    icon: Sparkles,
  },
];

interface NewProjectWizardProps {
  open: boolean;
  onClose: () => void;
  onProjectCreated: (projectPath: string) => void;
  defaultPlatform?: ProjectPlatform;
  defaultGenre?: ProjectGenre;
}

export function NewProjectWizard({
  open,
  onClose,
  onProjectCreated,
  defaultPlatform = "web",
  defaultGenre = "platformer",
}: NewProjectWizardProps) {
  const isTauri =
    typeof window !== "undefined" &&
    (Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__) ||
      Boolean((window as unknown as { __TAURI__?: unknown }).__TAURI__));

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [projectName, setProjectName] = useState("My Awesome Game");
  const [projectLocation, setProjectLocation] = useState("");
  const [platform, setPlatform] = useState<ProjectPlatform>(defaultPlatform);
  const [genre, setGenre] = useState<ProjectGenre>(defaultGenre);
  const [packageManager, setPackageManager] = useState<PackageManager>("pnpm");
  const [detectedPMs, setDetectedPMs] = useState<PackageManager[]>(["pnpm", "npm"]);
  const [runInstall, setRunInstall] = useState(true);
  const [initGit, setInitGit] = useState(false);
  const [isPickingFolder, setIsPickingFolder] = useState(false);

  // Build state
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildStepMsg, setBuildStepMsg] = useState("");
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [buildError, setBuildError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setIsBuilding(false);
      setBuildLogs([]);
      setBuildError(null);
      return;
    }

    // Detect system package managers and default path
    fetch(getApiUrl("/api/system/environment"))
      .then((r) => r.json())
      .then(
        (data: {
          packageManagers?: PackageManager[];
          preferredPackageManager?: PackageManager;
          cwd?: string;
        }) => {
          if (data.packageManagers?.length) {
            setDetectedPMs(data.packageManagers);
          }
          if (data.preferredPackageManager) {
            setPackageManager(data.preferredPackageManager);
          }
          if (data.cwd && !projectLocation) {
            setProjectLocation(`${data.cwd}/games`);
          }
        }
      )
      .catch(() => {
        // Fallback
      });
  }, [open, projectLocation]);

  const slug =
    projectName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "my-game";

  const fullTargetPath = projectLocation ? `${projectLocation.replace(/\/+$/, "")}/${slug}` : slug;

  async function handleBrowseFolder() {
    setIsPickingFolder(true);
    try {
      if (isTauri) {
        const { invoke } = await import("@tauri-apps/api/core");
        const selected = await invoke<string | null>("pick_location_directory");
        if (selected) {
          setProjectLocation(selected);
        }
      } else {
        // Try OS native file dialog via local dev server
        try {
          const res = await fetch(getApiUrl("/api/system/pick-directory"), { method: "POST" });
          if (res.ok) {
            const data = (await res.json()) as { path?: string | null };
            if (data.path) {
              setProjectLocation(data.path);
              return;
            }
          }
        } catch {
          // fallback
        }

        // Browser showDirectoryPicker fallback
        if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
          try {
            const handle = await (
              window as unknown as { showDirectoryPicker: () => Promise<{ name: string }> }
            ).showDirectoryPicker();
            if (handle?.name) {
              setProjectLocation(
                projectLocation ? `${projectLocation}/${handle.name}` : handle.name
              );
            }
          } catch {
            // Cancelled
          }
        }
      }
    } catch (err) {
      console.error("Directory picker error:", err);
    } finally {
      setIsPickingFolder(false);
    }
  }

  async function handleCreateProject() {
    setStep(4);
    setIsBuilding(true);
    setBuildError(null);
    setBuildLogs([
      `Scaffolding "${projectName}"...`,
      `Target: ${fullTargetPath}`,
      `Platform: ${platform.toUpperCase()} | Genre: ${genre}`,
      `Tooling: ${packageManager}`,
    ]);
    setBuildStepMsg("Scaffolding project structure & runtime files...");

    try {
      if (isTauri) {
        const { invoke } = await import("@tauri-apps/api/core");
        setBuildLogs((prev) => [...prev, "Running project scaffolding engine..."]);

        const resolved = await invoke<string>("create_new_project", {
          name: projectName,
          targetDir: fullTargetPath,
          platform,
          genre,
          packageManager,
          runInstall,
        });

        setBuildLogs((prev) => [
          ...prev,
          "✔ Project files generated",
          runInstall ? `✔ Packages installed with ${packageManager}` : "ℹ Package install skipped",
          "✔ GameKit scenes and rules ready",
          `Project ready at ${resolved}`,
        ]);
        setBuildStepMsg("Launching workspace in Playroom Studio...");

        setTimeout(() => {
          onProjectCreated(resolved);
          onClose();
        }, 900);
      } else {
        // Web mode: invoke /api/projects/create
        const res = await fetch(getApiUrl("/api/projects/create"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: projectName,
            targetDir: fullTargetPath,
            platform,
            genre,
            packageManager,
            runInstall,
            initGit,
          }),
        });

        const data = (await res.json()) as {
          success?: boolean;
          targetDir?: string;
          error?: string;
          warnings?: string[];
        };

        if (!res.ok || !data.success) {
          throw new Error(data.error ?? "Failed to create project");
        }

        setBuildLogs((prev) => [
          ...prev,
          "✔ Project structure created",
          runInstall
            ? `✔ Dependencies installed via ${packageManager}`
            : "ℹ Dependency install skipped",
          "✔ GameKit runtime initialized",
          `Project ready at ${data.targetDir ?? fullTargetPath}`,
        ]);

        if (data.warnings?.length) {
          for (const w of data.warnings) {
            setBuildLogs((prev) => [...prev, `⚠ ${w}`]);
          }
        }

        setBuildStepMsg("Opening workspace...");
        setTimeout(() => {
          onProjectCreated(data.targetDir ?? fullTargetPath);
          onClose();
        }, 800);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setBuildError(msg);
      setBuildLogs((prev) => [...prev, `✖ ${msg}`]);
      setIsBuilding(false);
    }
  }

  const footerActions = (
    <>
      {step > 1 && step < 4 ? (
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
          className="gap-1.5"
        >
          <ChevronLeft size={14} /> Back
        </Button>
      ) : (
        <Button type="button" variant="secondary" size="md" disabled={isBuilding} onClick={onClose}>
          Cancel
        </Button>
      )}
      {step < 3 && (
        <Button variant="primary" size="md" onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}>
          Next Step <ChevronRight size={14} />
        </Button>
      )}
      {step === 3 && (
        <Button variant="primary" size="md" onClick={handleCreateProject}>
          <Sparkles size={14} /> Create & Launch Game
        </Button>
      )}
      {step === 4 && buildError && (
        <Button variant="primary" size="md" onClick={() => setStep(1)}>
          Try Again
        </Button>
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !isBuilding && onClose()}>
      <ModalShell
        className="w-[min(680px,calc(100vw-32px))] rounded-2xl border-border-strong bg-surface-overlay"
        title="Create New Game Project"
        description={
          step === 1
            ? "Step 1 of 3: Name & Target Platform"
            : step === 2
              ? "Step 2 of 3: Select Gameplay Genre"
              : step === 3
                ? "Step 3 of 3: Package Setup & Options"
                : "Generating Project..."
        }
        icon={<Sparkles size={16} />}
        onClose={isBuilding ? undefined : onClose}
        bodyClassName="max-h-[60vh] space-y-5 p-6"
        footerClassName="justify-between bg-surface-sunken px-6 py-4"
        headerEnd={
          step < 4 ? (
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-200",
                    step === s
                      ? "w-7 bg-accent"
                      : step > s
                        ? "w-2 bg-accent/40"
                        : "w-2 bg-bg-active"
                  )}
                />
              ))}
            </div>
          ) : undefined
        }
        footer={footerActions}
      >
        {/* STEP 1: Name, Location & Platform */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4">
              <Field label="Game Name">
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Cyber Blade, Pixel Quest"
                  className="h-10 text-sm bg-bg-elevated border-border-default focus:border-accent"
                />
              </Field>

              <Field label="Destination Folder">
                <div className="flex gap-2">
                  <Input
                    value={projectLocation}
                    onChange={(e) => setProjectLocation(e.target.value)}
                    placeholder="/Users/username/games or C:\Games"
                    className="h-10 text-xs font-mono bg-bg-elevated border-border-default flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    disabled={isPickingFolder}
                    onClick={handleBrowseFolder}
                    className="gap-1.5 shrink-0 px-3 border-border-strong bg-bg-elevated hover:bg-bg-hover hover:border-accent/40 text-xs"
                    title="Choose folder"
                  >
                    {isPickingFolder ? (
                      <Loader2 size={14} className="animate-spin text-accent" />
                    ) : (
                      <FolderOpen size={14} className="text-accent" />
                    )}
                    {isPickingFolder ? "Choosing..." : "Browse..."}
                  </Button>
                </div>
                <p className="text-[11px] text-text-muted mt-1 font-mono">
                  Path: <span className="text-accent font-semibold">{fullTargetPath}</span>
                </p>
              </Field>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 block">
                Select Target Platform
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Web */}
                <button
                  type="button"
                  onClick={() => setPlatform("web")}
                  className={cn(
                    "flex flex-col text-left p-4 rounded-xl border transition-all relative group",
                    platform === "web"
                      ? "border-accent bg-accent/10 shadow-[0_0_20px_rgba(0,240,255,0.12)]"
                      : "border-border-default bg-bg-elevated/40 hover:bg-bg-elevated hover:border-border-strong"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="size-9 rounded-lg border border-accent/30 bg-accent/15 flex items-center justify-center text-accent">
                      <Globe size={18} />
                    </div>
                    {platform === "web" && (
                      <div className="size-5 rounded-full bg-accent text-[#06090e] flex items-center justify-center">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-text-primary block">Web Game</span>
                  <span className="text-[11px] text-text-muted mt-0.5 block leading-tight">
                    Phaser 3 + Vite. Instant browser play at 60 FPS.
                  </span>
                </button>

                {/* Expo */}
                <button
                  type="button"
                  onClick={() => setPlatform("expo")}
                  className={cn(
                    "flex flex-col text-left p-4 rounded-xl border transition-all relative group",
                    platform === "expo"
                      ? "border-accent bg-accent/10 shadow-[0_0_20px_rgba(0,240,255,0.12)]"
                      : "border-border-default bg-bg-elevated/40 hover:bg-bg-elevated hover:border-border-strong"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="size-9 rounded-lg border border-purple-400/30 bg-purple-500/15 flex items-center justify-center text-purple-400">
                      <Smartphone size={18} />
                    </div>
                    {platform === "expo" && (
                      <div className="size-5 rounded-full bg-accent text-[#06090e] flex items-center justify-center">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-text-primary block">Expo Mobile</span>
                  <span className="text-[11px] text-text-muted mt-0.5 block leading-tight">
                    React Native + Skia. iOS & Android with touch pads.
                  </span>
                </button>

                {/* Tauri */}
                <button
                  type="button"
                  onClick={() => setPlatform("tauri")}
                  className={cn(
                    "flex flex-col text-left p-4 rounded-xl border transition-all relative group",
                    platform === "tauri"
                      ? "border-accent bg-accent/10 shadow-[0_0_20px_rgba(0,240,255,0.12)]"
                      : "border-border-default bg-bg-elevated/40 hover:bg-bg-elevated hover:border-border-strong"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="size-9 rounded-lg border border-emerald-400/30 bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                      <Monitor size={18} />
                    </div>
                    {platform === "tauri" && (
                      <div className="size-5 rounded-full bg-accent text-[#06090e] flex items-center justify-center">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-text-primary block">Desktop App</span>
                  <span className="text-[11px] text-text-muted mt-0.5 block leading-tight">
                    Tauri v2 + Rust. Native macOS/Windows/Linux app.
                  </span>
                </button>

                {/* LibGDX */}
                <button
                  type="button"
                  onClick={() => setPlatform("libgdx")}
                  className={cn(
                    "flex flex-col text-left p-4 rounded-xl border transition-all relative group",
                    platform === "libgdx"
                      ? "border-amber-400 bg-amber-400/10 shadow-[0_0_20px_rgba(251,191,36,0.12)]"
                      : "border-border-default bg-bg-elevated/40 hover:bg-bg-elevated hover:border-border-strong"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="size-9 rounded-lg border border-amber-400/30 bg-amber-400/15 flex items-center justify-center text-amber-400">
                      <Monitor size={18} />
                    </div>
                    {platform === "libgdx" && (
                      <div className="size-5 rounded-full bg-amber-400 text-[#06090e] flex items-center justify-center">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-text-primary block">
                    LibGDX Native
                  </span>
                  <span className="text-[11px] text-text-muted mt-0.5 block leading-tight">
                    Java/Kotlin + Gradle. Android, Desktop &amp; iOS.
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Choose Genre */}
        {step === 2 && (
          <div className="space-y-4">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
              Choose Gameplay Starter
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {GENRES.map((g) => {
                const Icon = g.icon;
                const isSelected = genre === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGenre(g.id)}
                    className={cn(
                      "flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all relative",
                      isSelected
                        ? "border-accent bg-accent/10 shadow-[0_0_18px_rgba(0,240,255,0.12)]"
                        : "border-border-default bg-bg-elevated/40 hover:bg-bg-elevated hover:border-border-strong"
                    )}
                  >
                    <div className="size-9 rounded-lg border border-accent/20 bg-accent/15 flex items-center justify-center text-accent shrink-0 mt-0.5">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-text-primary">{g.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-text-muted font-mono">
                          {g.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted mt-1 leading-snug">
                        {g.description}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="size-4 rounded-full bg-accent text-[#06090e] flex items-center justify-center shrink-0 mt-1">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Setup & Options */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Summary box */}
            <div className="p-4 rounded-xl border border-accent/30 bg-accent/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-accent uppercase tracking-wider font-mono">
                  Project Configuration
                </span>
                <Badge variant="accent" className="font-mono text-[10px] uppercase">
                  {platform} • {genre}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-accent/10 text-text-secondary">
                <div>
                  <span className="text-text-muted text-[11px] block">Name</span>
                  <strong className="text-text-primary">{projectName}</strong>
                </div>
                <div>
                  <span className="text-text-muted text-[11px] block">Folder</span>
                  <strong
                    className="text-text-primary font-mono text-[11px] truncate block"
                    title={fullTargetPath}
                  >
                    {fullTargetPath}
                  </strong>
                </div>
              </div>
            </div>

            {/* Package Manager Options */}
            <div className="p-4 rounded-xl border border-border-default bg-bg-elevated/40 space-y-3">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                Package Tooling
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["pnpm", "bun", "yarn", "npm"] as PackageManager[]).map((pm) => {
                  const isSelected = packageManager === pm;
                  const isDetected = detectedPMs.includes(pm);
                  return (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPackageManager(pm)}
                      className={cn(
                        "p-2.5 rounded-lg border text-center transition-all",
                        isSelected
                          ? "border-accent bg-accent/15 text-accent font-semibold"
                          : "border-border-default bg-bg-base text-text-primary hover:bg-bg-hover"
                      )}
                    >
                      <span className="text-xs font-mono uppercase block">{pm}</span>
                      {isDetected && (
                        <span className="text-[9px] text-text-muted block">Detected</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox
                    checked={runInstall}
                    onCheckedChange={(c) => setRunInstall(Boolean(c))}
                  />
                  <span className="text-xs text-text-primary">
                    Install packages automatically with <strong>{packageManager}</strong>
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <Checkbox checked={initGit} onCheckedChange={(c) => setInitGit(Boolean(c))} />
                  <span className="text-xs text-text-primary">
                    Initialize Git repository (<code>git init</code>)
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Live Build Screen */}
        {step === 4 && (
          <div className="space-y-5 py-4">
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              {isBuilding ? (
                <div className="relative size-14 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
                  <Loader2 size={24} className="text-accent animate-spin" />
                </div>
              ) : buildError ? (
                <div className="size-14 rounded-full bg-error/15 border border-error/30 flex items-center justify-center text-error">
                  <AlertCircle size={28} />
                </div>
              ) : (
                <div className="size-14 rounded-full bg-success/15 border border-success/30 flex items-center justify-center text-success">
                  <CheckCircle2 size={28} />
                </div>
              )}

              <div>
                <h3 className="text-base font-semibold text-text-primary">
                  {isBuilding
                    ? "Generating Your Game Playground..."
                    : buildError
                      ? "Project Creation Failed"
                      : "Playground Created Successfully!"}
                </h3>
                <p className="text-xs text-text-muted mt-1">{buildStepMsg}</p>
              </div>
            </div>

            {/* Terminal Log Box */}
            <div className="rounded-xl border border-border-strong bg-black/60 p-4 font-mono text-xs max-h-48 overflow-y-auto space-y-1 text-text-secondary">
              {buildLogs.map((log, index) => (
                <div
                  key={index}
                  className={cn(
                    "leading-relaxed",
                    log.startsWith("✔")
                      ? "text-success font-semibold"
                      : log.startsWith("✖")
                        ? "text-error font-semibold"
                        : log.startsWith("⚠")
                          ? "text-warning"
                          : "text-text-secondary"
                  )}
                >
                  {log}
                </div>
              ))}
            </div>

            {buildError && (
              <div className="p-3 rounded-lg border border-error/30 bg-error/10 text-xs text-error">
                {buildError}
              </div>
            )}
          </div>
        )}
      </ModalShell>
    </Dialog>
  );
}
