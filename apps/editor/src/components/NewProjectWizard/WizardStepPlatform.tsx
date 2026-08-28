import { Globe, Smartphone, Monitor, Check, Loader2, FolderOpen } from "lucide-react";
import { Button, Input, Field, cn } from "@/ui";
import type { ProjectPlatform } from "../NewProjectWizard.js";

type WizardStepPlatformProps = {
  projectName: string;
  setProjectName: (v: string) => void;
  projectLocation: string;
  setProjectLocation: (v: string) => void;
  platform: ProjectPlatform;
  setPlatform: (p: ProjectPlatform) => void;
  isPickingFolder: boolean;
  fullTargetPath: string;
  onBrowseFolder: () => void;
};

type PlatformCard = {
  id: ProjectPlatform;
  label: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  activeBorder: string;
  activeBg: string;
  activeShadow: string;
  checkBg: string;
  checkText: string;
};

const PLATFORMS: PlatformCard[] = [
  {
    id: "web",
    label: "Web Game",
    description: "Phaser 3 + Vite. Instant browser play at 60 FPS.",
    icon: Globe,
    iconBg: "bg-accent/15",
    iconColor: "text-accent",
    activeBorder: "border-accent",
    activeBg: "bg-accent/10",
    activeShadow: "shadow-[0_0_20px_rgba(0,240,255,0.12)]",
    checkBg: "bg-accent",
    checkText: "text-[#06090e]",
  },
  {
    id: "expo",
    label: "Expo Mobile",
    description: "React Native + Skia. iOS & Android with touch pads.",
    icon: Smartphone,
    iconBg: "bg-purple-500/15",
    iconColor: "text-purple-400",
    activeBorder: "border-accent",
    activeBg: "bg-accent/10",
    activeShadow: "shadow-[0_0_20px_rgba(0,240,255,0.12)]",
    checkBg: "bg-accent",
    checkText: "text-[#06090e]",
  },
  {
    id: "tauri",
    label: "Desktop App",
    description: "Tauri v2 + Rust. Native macOS/Windows/Linux app.",
    icon: Monitor,
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    activeBorder: "border-accent",
    activeBg: "bg-accent/10",
    activeShadow: "shadow-[0_0_20px_rgba(0,240,255,0.12)]",
    checkBg: "bg-accent",
    checkText: "text-[#06090e]",
  },
  {
    id: "libgdx",
    label: "LibGDX Native",
    description: "Java/Kotlin + Gradle. Android, Desktop & iOS.",
    icon: Monitor,
    iconBg: "bg-amber-400/15",
    iconColor: "text-amber-400",
    activeBorder: "border-amber-400",
    activeBg: "bg-amber-400/10",
    activeShadow: "shadow-[0_0_20px_rgba(251,191,36,0.12)]",
    checkBg: "bg-amber-400",
    checkText: "text-[#06090e]",
  },
];

/** Step 1: project name, location, and target platform. */
export function WizardStepPlatform({
  projectName,
  setProjectName,
  projectLocation,
  setProjectLocation,
  platform,
  setPlatform,
  isPickingFolder,
  fullTargetPath,
  onBrowseFolder,
}: WizardStepPlatformProps) {
  return (
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
              onClick={onBrowseFolder}
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
          {PLATFORMS.map(
            ({
              id,
              label,
              description,
              icon: Icon,
              iconBg,
              iconColor,
              activeBorder,
              activeBg,
              activeShadow,
              checkBg,
              checkText,
            }) => {
              const isSelected = platform === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPlatform(id)}
                  className={cn(
                    "flex flex-col text-left p-4 rounded-xl border transition-all relative group",
                    isSelected
                      ? `${activeBorder} ${activeBg} ${activeShadow}`
                      : "border-border-default bg-bg-elevated/40 hover:bg-bg-elevated hover:border-border-strong"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div
                      className={cn(
                        "size-9 rounded-lg border border-current/30 flex items-center justify-center",
                        iconBg,
                        iconColor
                      )}
                    >
                      <Icon size={18} />
                    </div>
                    {isSelected && (
                      <div
                        className={cn(
                          "size-5 rounded-full flex items-center justify-center",
                          checkBg,
                          checkText
                        )}
                      >
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-text-primary block">{label}</span>
                  <span className="text-[11px] text-text-muted mt-0.5 block leading-tight">
                    {description}
                  </span>
                </button>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}
