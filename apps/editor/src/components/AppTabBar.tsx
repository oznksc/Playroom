import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Layers,
  Folder,
  Sparkles,
  Save,
  Check,
  RefreshCw,
  Upload,
  Plus,
  LayoutTemplate,
  LogOut,
  Settings,
  MousePointer,
  Move,
  RefreshCcw,
  Maximize,
  Paintbrush,
  Eraser,
  Magnet,
  Grid3x3,
  Eye,
  EyeOff,
  Focus,
  ZoomIn,
  ZoomOut,
  ScanEye,
  MoreHorizontal,
  ChevronUp,
  Command,
  Globe,
  FileCode,
  Boxes,
  Map,
  Route,
} from "lucide-react";
import { cn } from "@/ui";
import type { SaveState } from "../types.js";

/** Left workspace destinations (shown on tab bar). */
export type TabBarDestination =
  | "hierarchy"
  | "scenes"
  | "prefabs"
  | "levels"
  | "content"
  | "agent"
  | "world";
export type CanvasTool = "select" | "translate" | "rotate" | "scale" | "paint" | "erase" | "polygon-edit";

type AppTabBarProps = {
  active: TabBarDestination | null;
  saveState: SaveState;
  projectPath?: string | null;
  activeTool: CanvasTool;
  snap: boolean;
  snapSize: number;
  showGrid: boolean;
  showColliders: boolean;
  zoom: number;
  showLevels?: boolean;
  onHierarchy: () => void;
  onScenes: () => void;
  onPrefabs: () => void;
  onLevels?: () => void;
  onContent: () => void;
  onAgent: () => void;
  onWorld: () => void;
  onSave: () => void;
  onRefresh: () => void;
  onImport: (file: File) => void;
  onAddEntity: () => void;
  onOpenWizard?: () => void;
  onSettings: () => void;
  onCloseProject?: () => void;
  onOpenCommandPalette?: () => void;
  onActiveToolChange: (tool: CanvasTool) => void;
  onSnapToggle: (snap: boolean) => void;
  onSnapSizeChange: (size: number) => void;
  onToggleGrid: (val: boolean) => void;
  onToggleColliders: (val: boolean) => void;
  onZoomChange: (zoom: number) => void;
  onCenterView: () => void;
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

type GroupId = "project" | "tools" | "view" | "create" | "more";

const TOOL_META: Record<
  CanvasTool,
  { label: string; icon: (size?: number) => ReactNode }
> = {
  select: {
    label: "Select",
    icon: (s = 18) => <MousePointer size={s} strokeWidth={1.75} />,
  },
  translate: {
    label: "Move",
    icon: (s = 18) => <Move size={s} strokeWidth={1.75} />,
  },
  rotate: {
    label: "Rotate",
    icon: (s = 18) => <RefreshCcw size={s} strokeWidth={1.75} />,
  },
  scale: {
    label: "Scale",
    icon: (s = 18) => <Maximize size={s} strokeWidth={1.75} />,
  },
  paint: {
    label: "Paint",
    icon: (s = 18) => <Paintbrush size={s} strokeWidth={1.75} />,
  },
  erase: {
    label: "Erase",
    icon: (s = 18) => <Eraser size={s} strokeWidth={1.75} />,
  },
  "polygon-edit": {
    label: "Polygon",
    icon: (s = 18) => <Route size={s} strokeWidth={1.75} />,
  },
};

/**
 * Compact glass dock: primary panels stay visible; related actions live in
 * expandable groups that open as flyouts above the bar.
 */
export function AppTabBar({
  active,
  saveState,
  projectPath,
  activeTool,
  snap,
  snapSize,
  showGrid,
  showColliders,
  zoom,
  showLevels = true,
  onHierarchy,
  onScenes,
  onPrefabs,
  onLevels,
  onContent,
  onAgent,
  onWorld,
  onSave,
  onRefresh,
  onImport,
  onAddEntity,
  onOpenWizard,
  onSettings,
  onCloseProject,
  onOpenCommandPalette,
  onActiveToolChange,
  onSnapToggle,
  onSnapSizeChange,
  onToggleGrid,
  onToggleColliders,
  onZoomChange,
  onCenterView,
}: AppTabBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const [openGroup, setOpenGroup] = useState<GroupId | null>(null);

  useEffect(() => {
    if (!openGroup) return;

    function onPointerDown(event: PointerEvent) {
      if (!barRef.current?.contains(event.target as Node)) {
        setOpenGroup(null);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenGroup(null);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openGroup]);

  function toggleGroup(id: GroupId) {
    setOpenGroup((prev) => (prev === id ? null : id));
  }

  function runAndClose(action: () => void) {
    action();
    setOpenGroup(null);
  }

  const toolMeta = TOOL_META[activeTool];
  const viewActive = showGrid || showColliders;
  const projectActive =
    active === "hierarchy" ||
    active === "scenes" ||
    active === "prefabs" ||
    active === "levels";

  const projectFace =
    active === "scenes"
      ? { label: "Scenes", icon: <FileCode size={18} strokeWidth={1.75} /> }
      : active === "prefabs"
        ? { label: "Prefabs", icon: <Boxes size={18} strokeWidth={1.75} /> }
        : active === "levels"
          ? { label: "Levels", icon: <Map size={18} strokeWidth={1.75} /> }
          : { label: "Hierarchy", icon: <Layers size={18} strokeWidth={1.75} /> };

  return (
    <nav ref={barRef} className="app-tabbar" aria-label="Editor">
      <div className="app-tabbar-scroll">
        {/* Project workspace — Hierarchy / Scenes / Prefabs / Levels */}
        <TabGroup
          id="project"
          label={projectFace.label}
          icon={projectFace.icon}
          open={openGroup === "project"}
          active={openGroup === "project" || projectActive}
          onToggle={() => toggleGroup("project")}
          layout="column"
        >
          <TabItem
            label="Hierarchy"
            active={active === "hierarchy"}
            compact
            row
            onClick={() => runAndClose(onHierarchy)}
            icon={<Layers size={16} strokeWidth={1.75} />}
          />
          <TabItem
            label="Scenes"
            active={active === "scenes"}
            compact
            row
            onClick={() => runAndClose(onScenes)}
            icon={<FileCode size={16} strokeWidth={1.75} />}
          />
          <TabItem
            label="Prefabs"
            active={active === "prefabs"}
            compact
            row
            onClick={() => runAndClose(onPrefabs)}
            icon={<Boxes size={16} strokeWidth={1.75} />}
          />
          {showLevels && onLevels && (
            <TabItem
              label="Levels"
              active={active === "levels"}
              compact
              row
              onClick={() => runAndClose(onLevels)}
              icon={<Map size={16} strokeWidth={1.75} />}
            />
          )}
        </TabGroup>

        <TabItem
          label="Content"
          active={active === "content"}
          onClick={() => {
            setOpenGroup(null);
            onContent();
          }}
          icon={<Folder size={18} strokeWidth={1.75} />}
        />
        <TabItem
          label="Agent"
          active={active === "agent"}
          onClick={() => {
            setOpenGroup(null);
            onAgent();
          }}
          icon={<Sparkles size={18} strokeWidth={1.75} />}
        />
        <TabItem
          label="World"
          active={active === "world"}
          onClick={() => {
            setOpenGroup(null);
            onWorld();
          }}
          icon={<Globe size={18} strokeWidth={1.75} />}
        />

        <span className="app-tabbar-sep" aria-hidden />

        {/* Tools group — current tool icon on the face */}
        <TabGroup
          id="tools"
          label={toolMeta.label}
          icon={toolMeta.icon(18)}
          open={openGroup === "tools"}
          active={openGroup === "tools" || activeTool !== "select" || snap}
          onToggle={() => toggleGroup("tools")}
          layout="row"
        >
          {(Object.keys(TOOL_META) as CanvasTool[]).map((tool) => (
            <TabItem
              key={tool}
              label={TOOL_META[tool].label}
              active={activeTool === tool}
              compact
              onClick={() => {
                onActiveToolChange(tool);
                // Keep tools open so snap stays reachable while switching tools
              }}
              icon={TOOL_META[tool].icon(16)}
            />
          ))}
          <span className="app-tabbar-flyout-sep" aria-hidden />
          <TabItem
            label="Snap"
            active={snap}
            compact
            onClick={() => onSnapToggle(!snap)}
            icon={<Magnet size={16} strokeWidth={1.75} />}
          />
          {snap && (
            <label className="app-tabbar-select" title="Snap size">
              <select
                value={snapSize}
                onChange={(e) => onSnapSizeChange(Number(e.target.value))}
              >
                <option value={8}>8</option>
                <option value={16}>16</option>
                <option value={32}>32</option>
                <option value={64}>64</option>
              </select>
            </label>
          )}
        </TabGroup>

        {/* View group */}
        <TabGroup
          id="view"
          label="View"
          icon={<ScanEye size={18} strokeWidth={1.75} />}
          open={openGroup === "view"}
          active={openGroup === "view" || viewActive}
          onToggle={() => toggleGroup("view")}
          layout="row"
        >
          <TabItem
            label="Grid"
            active={showGrid}
            compact
            onClick={() => onToggleGrid(!showGrid)}
            icon={<Grid3x3 size={16} strokeWidth={1.75} />}
          />
          <TabItem
            label="Colliders"
            active={showColliders}
            compact
            onClick={() => onToggleColliders(!showColliders)}
            icon={
              showColliders ? (
                <Eye size={16} strokeWidth={1.75} />
              ) : (
                <EyeOff size={16} strokeWidth={1.75} />
              )
            }
          />
          <TabItem
            label="Center"
            active={false}
            compact
            onClick={() => runAndClose(onCenterView)}
            icon={<Focus size={16} strokeWidth={1.75} />}
          />
          <span className="app-tabbar-flyout-sep" aria-hidden />
          <TabItem
            label="Zoom −"
            active={false}
            compact
            onClick={() => onZoomChange(Math.max(MIN_ZOOM, zoom - 0.1))}
            icon={<ZoomOut size={16} strokeWidth={1.75} />}
          />
          <span className="app-tabbar-zoom" title="Zoom">
            {Math.round(zoom * 100)}%
          </span>
          <TabItem
            label="Zoom +"
            active={false}
            compact
            onClick={() => onZoomChange(Math.min(MAX_ZOOM, zoom + 0.1))}
            icon={<ZoomIn size={16} strokeWidth={1.75} />}
          />
        </TabGroup>

        {/* Create group */}
        <TabGroup
          id="create"
          label="Create"
          icon={<Plus size={18} strokeWidth={1.75} />}
          open={openGroup === "create"}
          active={openGroup === "create"}
          onToggle={() => toggleGroup("create")}
          layout="column"
        >
          <TabItem
            label="Add entity"
            active={false}
            compact
            row
            onClick={() => runAndClose(onAddEntity)}
            icon={<Plus size={16} strokeWidth={1.75} />}
          />
          <TabItem
            label="Import asset"
            active={false}
            compact
            row
            onClick={() => {
              fileInputRef.current?.click();
              setOpenGroup(null);
            }}
            icon={<Upload size={16} strokeWidth={1.75} />}
          />
          {onOpenWizard && (
            <TabItem
              label="Template"
              active={false}
              compact
              row
              onClick={() => runAndClose(onOpenWizard)}
              icon={<LayoutTemplate size={16} strokeWidth={1.75} />}
            />
          )}
          <TabItem
            label="Refresh"
            active={false}
            compact
            row
            onClick={() => runAndClose(onRefresh)}
            icon={<RefreshCw size={16} strokeWidth={1.75} />}
          />
        </TabGroup>

        <span className="app-tabbar-sep" aria-hidden />

        <TabItem
          label="Save"
          active={saveState === "saved"}
          onClick={() => {
            setOpenGroup(null);
            onSave();
          }}
          icon={
            saveState === "saved" ? (
              <Check size={18} strokeWidth={2} />
            ) : (
              <Save size={18} strokeWidth={1.75} />
            )
          }
          tone={
            saveState === "error" ? "error" : saveState === "saved" ? "success" : undefined
          }
        />

        <TabGroup
          id="more"
          label="More"
          icon={<MoreHorizontal size={18} strokeWidth={1.75} />}
          open={openGroup === "more"}
          active={openGroup === "more"}
          onToggle={() => toggleGroup("more")}
          layout="column"
          align="end"
        >
          {onOpenCommandPalette && (
            <TabItem
              label="Command menu"
              active={false}
              compact
              row
              onClick={() => runAndClose(onOpenCommandPalette)}
              icon={<Command size={16} strokeWidth={1.75} />}
            />
          )}
          <TabItem
            label="Settings"
            active={false}
            compact
            row
            onClick={() => runAndClose(onSettings)}
            icon={<Settings size={16} strokeWidth={1.75} />}
          />
          {projectPath && onCloseProject && (
            <TabItem
              label="Close project"
              active={false}
              compact
              row
              onClick={() => runAndClose(onCloseProject)}
              icon={<LogOut size={16} strokeWidth={1.75} />}
            />
          )}
        </TabGroup>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) onImport(file);
          event.currentTarget.value = "";
        }}
      />
    </nav>
  );
}

function TabGroup({
  id,
  label,
  icon,
  open,
  active,
  onToggle,
  layout,
  align = "center",
  children,
}: {
  id: GroupId;
  label: string;
  icon: ReactNode;
  open: boolean;
  active: boolean;
  onToggle: () => void;
  layout: "row" | "column";
  align?: "center" | "end";
  children: ReactNode;
}) {
  return (
    <div
      className={cn("app-tabbar-group", open && "open", active && "has-active")}
      data-group={id}
    >
      <button
        type="button"
        className={cn("app-tabbar-item", "app-tabbar-group-trigger", open && "active")}
        onClick={onToggle}
        title={label}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="app-tabbar-icon">{icon}</span>
        <span className="app-tabbar-label">
          {label}
          <ChevronUp
            size={8}
            strokeWidth={2.5}
            className={cn("app-tabbar-chevron", open && "open")}
            aria-hidden
          />
        </span>
      </button>
      {open && (
        <div
          className={cn(
            "app-tabbar-flyout",
            layout === "column" && "column",
            align === "end" && "align-end"
          )}
          role="menu"
          aria-label={label}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function TabItem({
  label,
  icon,
  active,
  onClick,
  tone,
  compact,
  row,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
  tone?: "success" | "error";
  compact?: boolean;
  /** Horizontal row layout for list-style flyouts */
  row?: boolean;
}) {
  return (
    <button
      type="button"
      role={compact ? "menuitem" : undefined}
      className={cn(
        "app-tabbar-item",
        compact && "compact",
        row && "row",
        active && "active",
        tone === "success" && "tone-success",
        tone === "error" && "tone-error"
      )}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-current={active ? "true" : undefined}
    >
      <span className="app-tabbar-icon">{icon}</span>
      <span className="app-tabbar-label">{label}</span>
    </button>
  );
}
