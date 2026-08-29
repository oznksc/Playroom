import { Globe, Smartphone, Monitor, Check, Loader2, FolderOpen, Zap, Layers, Coffee } from "lucide-react";
import { Button, Input, Field, Badge, cn } from "@/ui";
import type { ProjectPlatform, ProjectLanguage } from "../NewProjectWizard.js";

type WizardStepPlatformProps = {
  projectName: string;
  setProjectName: (v: string) => void;
  projectLocation: string;
  setProjectLocation: (v: string) => void;
  platform: ProjectPlatform;
  setPlatform: (p: ProjectPlatform) => void;
  language: ProjectLanguage;
  setLanguage: (l: ProjectLanguage) => void;
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
    description: "Kotlin / Java + Gradle. Android, Desktop & Multiplatform.",
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

type LanguageVariant = {
  id: ProjectLanguage;
  name: string;
  badge: string;
  badgeVariant?: "accent" | "danger" | "default" | "muted" | "mono" | "success" | "purple" | "green" | "red" | "gold";
  description: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
};

const LIBGDX_LANGUAGES: LanguageVariant[] = [
  {
    id: "kotlin",
    name: "Kotlin (LibKTX)",
    badge: "Recommended",
    badgeVariant: "purple",
    description: "Idiomatic Kotlin JVM/Android runtime with LibKTX DSLs, extension utilities, and coroutines.",
    icon: Zap,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-500/15",
  },
  {
    id: "java",
    name: "Java 17 (Classic)",
    badge: "Classic",
    badgeVariant: "muted",
    description: "Standard LibGDX 1.13.1 + Box2D engine. Lightweight, robust, and maximum backward compatibility.",
    icon: Coffee,
    iconColor: "text-amber-400",
    iconBg: "bg-amber-400/15",
  },
  {
    id: "kmp",
    name: "Kotlin Multiplatform",
    badge: "KMP",
    badgeVariant: "accent",
    description: "Shared commonMain game logic and expect/actual services targeting Desktop, Android, iOS & Web.",
    icon: Layers,
    iconColor: "text-cyan-400",
    iconBg: "bg-cyan-400/15",
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
  language,
  setLanguage,
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

      {/* LibGDX Language / Architecture Options */}
      {platform === "libgdx" && (
        <div className="pt-2 border-t border-border-default/60 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
              Language & Architecture
            </label>
            <span className="text-[11px] text-text-muted">Targeting LibGDX 1.13.1 + Box2D</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {LIBGDX_LANGUAGES.map((variant) => {
              const Icon = variant.icon;
              const isSelected = language === variant.id;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setLanguage(variant.id)}
                  className={cn(
                    "flex flex-col text-left p-3 rounded-lg border transition-all relative group",
                    isSelected
                      ? "border-amber-400 bg-amber-400/10 shadow-[0_0_15px_rgba(251,191,36,0.1)]"
                      : "border-border-default bg-bg-elevated/30 hover:bg-bg-elevated hover:border-border-strong"
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={cn("size-6 rounded-md flex items-center justify-center", variant.iconBg, variant.iconColor)}>
                        <Icon size={14} />
                      </div>
                      <span className="text-xs font-semibold text-text-primary">{variant.name}</span>
                    </div>
                    {isSelected ? (
                      <div className="size-4 rounded-full bg-amber-400 text-[#06090e] flex items-center justify-center">
                        <Check size={10} strokeWidth={3} />
                      </div>
                    ) : (
                      <Badge variant={variant.badgeVariant} className="text-[10px] px-1.5 py-0">
                        {variant.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted leading-tight line-clamp-2">
                    {variant.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
