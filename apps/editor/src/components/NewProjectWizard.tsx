import { useState, useEffect } from "react";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Gamepad2,
  Compass,
  Crosshair,
  Boxes,
  Zap,
  Check,
} from "lucide-react";
import { getApiUrl } from "../lib/api.js";
import { Dialog, ModalShell, Button, Badge, Checkbox, cn } from "@/ui";
import { WizardStepPlatform } from "./NewProjectWizard/WizardStepPlatform.js";
import { WizardStepBuild } from "./NewProjectWizard/WizardStepBuild.js";

export type ProjectPlatform = "web" | "expo" | "tauri" | "libgdx";
export type ProjectLanguage = "java" | "kotlin" | "kmp";
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
  defaultLanguage?: ProjectLanguage;
  defaultGenre?: ProjectGenre;
}

export function NewProjectWizard({
  open,
  onClose,
  onProjectCreated,
  defaultPlatform = "web",
  defaultLanguage = "kotlin",
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
  const [language, setLanguage] = useState<ProjectLanguage>(defaultLanguage);
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

    fetch(getApiUrl("/api/system/environment"))
      .then((r) => r.json())
      .then(
        (data: {
          packageManagers?: PackageManager[];
          preferredPackageManager?: PackageManager;
          cwd?: string;
        }) => {
          if (data.packageManagers?.length) setDetectedPMs(data.packageManagers);
          if (data.preferredPackageManager) setPackageManager(data.preferredPackageManager);
          if (data.cwd && !projectLocation) setProjectLocation(`${data.cwd}/games`);
        }
      )
      .catch(() => {});
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
        if (selected) setProjectLocation(selected);
      } else {
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
          /* fallback */
        }

        if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
          try {
            const handle = await (
              window as unknown as { showDirectoryPicker: () => Promise<{ name: string }> }
            ).showDirectoryPicker();
            if (handle?.name)
              setProjectLocation(
                projectLocation ? `${projectLocation}/${handle.name}` : handle.name
              );
          } catch {
            /* Cancelled */
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
      `Platform: ${platform.toUpperCase()}${platform === "libgdx" ? ` (${language.toUpperCase()})` : ""} | Genre: ${genre}`,
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
          language: platform === "libgdx" ? language : undefined,
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
        const res = await fetch(getApiUrl("/api/projects/create"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: projectName,
            targetDir: fullTargetPath,
            platform,
            language: platform === "libgdx" ? language : undefined,
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
        if (!res.ok || !data.success) throw new Error(data.error ?? "Failed to create project");

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
          for (const w of data.warnings) setBuildLogs((prev) => [...prev, `⚠ ${w}`]);
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
          <WizardStepPlatform
            projectName={projectName}
            setProjectName={setProjectName}
            projectLocation={projectLocation}
            setProjectLocation={setProjectLocation}
            platform={platform}
            setPlatform={setPlatform}
            language={language}
            setLanguage={setLanguage}
            isPickingFolder={isPickingFolder}
            fullTargetPath={fullTargetPath}
            onBrowseFolder={handleBrowseFolder}
          />
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
          <WizardStepBuild
            isBuilding={isBuilding}
            buildError={buildError}
            buildStepMsg={buildStepMsg}
            buildLogs={buildLogs}
          />
        )}
      </ModalShell>
    </Dialog>
  );
}
