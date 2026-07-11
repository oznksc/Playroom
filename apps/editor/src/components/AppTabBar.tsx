import { useRef } from "react";
import {
  Layers,
  SlidersHorizontal,
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
} from "lucide-react";
import { cn } from "@/ui";
import type { SaveState } from "../types.js";

export type TabBarDestination = "hierarchy" | "inspector" | "content" | "agent";
export type CanvasTool = "select" | "translate" | "rotate" | "scale" | "paint" | "erase";

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
  onHierarchy: () => void;
  onInspector: () => void;
  onContent: () => void;
  onAgent: () => void;
  onSave: () => void;
  onRefresh: () => void;
  onImport: (file: File) => void;
  onAddEntity: () => void;
  onOpenWizard?: () => void;
  onSettings: () => void;
  onCloseProject?: () => void;
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

/**
 * Single chrome surface: every editor action lives here (Apple-style dock).
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
  onHierarchy,
  onInspector,
  onContent,
  onAgent,
  onSave,
  onRefresh,
  onImport,
  onAddEntity,
  onOpenWizard,
  onSettings,
  onCloseProject,
  onActiveToolChange,
  onSnapToggle,
  onSnapSizeChange,
  onToggleGrid,
  onToggleColliders,
  onZoomChange,
  onCenterView,
}: AppTabBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <nav className="app-tabbar" aria-label="Editor">
      <div className="app-tabbar-scroll">
        {/* Panels */}
        <TabItem
          label="Hierarchy"
          active={active === "hierarchy"}
          onClick={onHierarchy}
          icon={<Layers size={18} strokeWidth={1.75} />}
        />
        <TabItem
          label="Inspector"
          active={active === "inspector"}
          onClick={onInspector}
          icon={<SlidersHorizontal size={18} strokeWidth={1.75} />}
        />
        <TabItem
          label="Content"
          active={active === "content"}
          onClick={onContent}
          icon={<Folder size={18} strokeWidth={1.75} />}
        />
        <TabItem
          label="Agent"
          active={active === "agent"}
          onClick={onAgent}
          icon={<Sparkles size={18} strokeWidth={1.75} />}
        />

        <span className="app-tabbar-sep" aria-hidden />

        {/* Project */}
        <TabItem
          label="Refresh"
          active={false}
          onClick={onRefresh}
          icon={<RefreshCw size={18} strokeWidth={1.75} />}
        />
        <TabItem
          label="Import"
          active={false}
          onClick={() => fileInputRef.current?.click()}
          icon={<Upload size={18} strokeWidth={1.75} />}
        />
        <TabItem
          label="Add"
          active={false}
          onClick={onAddEntity}
          icon={<Plus size={18} strokeWidth={1.75} />}
        />
        {onOpenWizard && (
          <TabItem
            label="Template"
            active={false}
            onClick={onOpenWizard}
            icon={<LayoutTemplate size={18} strokeWidth={1.75} />}
          />
        )}

        <span className="app-tabbar-sep" aria-hidden />

        {/* Canvas tools (were top-left HUD) */}
        <TabItem
          label="Select"
          active={activeTool === "select"}
          onClick={() => onActiveToolChange("select")}
          icon={<MousePointer size={18} strokeWidth={1.75} />}
        />
        <TabItem
          label="Move"
          active={activeTool === "translate"}
          onClick={() => onActiveToolChange("translate")}
          icon={<Move size={18} strokeWidth={1.75} />}
        />
        <TabItem
          label="Rotate"
          active={activeTool === "rotate"}
          onClick={() => onActiveToolChange("rotate")}
          icon={<RefreshCcw size={18} strokeWidth={1.75} />}
        />
        <TabItem
          label="Scale"
          active={activeTool === "scale"}
          onClick={() => onActiveToolChange("scale")}
          icon={<Maximize size={18} strokeWidth={1.75} />}
        />
        <TabItem
          label="Paint"
          active={activeTool === "paint"}
          onClick={() => onActiveToolChange("paint")}
          icon={<Paintbrush size={18} strokeWidth={1.75} />}
        />
        <TabItem
          label="Erase"
          active={activeTool === "erase"}
          onClick={() => onActiveToolChange("erase")}
          icon={<Eraser size={18} strokeWidth={1.75} />}
        />
        <TabItem
          label="Snap"
          active={snap}
          onClick={() => onSnapToggle(!snap)}
          icon={<Magnet size={18} strokeWidth={1.75} />}
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

        <span className="app-tabbar-sep" aria-hidden />

        {/* View (were top-right HUD) */}
        <TabItem
          label="Grid"
          active={showGrid}
          onClick={() => onToggleGrid(!showGrid)}
          icon={<Grid3x3 size={18} strokeWidth={1.75} />}
        />
        <TabItem
          label="Colliders"
          active={showColliders}
          onClick={() => onToggleColliders(!showColliders)}
          icon={showColliders ? <Eye size={18} strokeWidth={1.75} /> : <EyeOff size={18} strokeWidth={1.75} />}
        />
        <TabItem
          label="Center"
          active={false}
          onClick={onCenterView}
          icon={<Focus size={18} strokeWidth={1.75} />}
        />
        <TabItem
          label="Zoom −"
          active={false}
          onClick={() => onZoomChange(Math.max(MIN_ZOOM, zoom - 0.1))}
          icon={<ZoomOut size={18} strokeWidth={1.75} />}
        />
        <span className="app-tabbar-zoom" title="Zoom">
          {Math.round(zoom * 100)}%
        </span>
        <TabItem
          label="Zoom +"
          active={false}
          onClick={() => onZoomChange(Math.min(MAX_ZOOM, zoom + 0.1))}
          icon={<ZoomIn size={18} strokeWidth={1.75} />}
        />

        <span className="app-tabbar-sep" aria-hidden />

        <TabItem
          label="Save"
          active={saveState === "saved"}
          onClick={onSave}
          icon={
            saveState === "saved" ? (
              <Check size={18} strokeWidth={2} />
            ) : (
              <Save size={18} strokeWidth={1.75} />
            )
          }
          tone={saveState === "error" ? "error" : saveState === "saved" ? "success" : undefined}
        />
        <TabItem
          label="Settings"
          active={false}
          onClick={onSettings}
          icon={<Settings size={18} strokeWidth={1.75} />}
        />
        {projectPath && onCloseProject && (
          <TabItem
            label="Close"
            active={false}
            onClick={onCloseProject}
            icon={<LogOut size={18} strokeWidth={1.75} />}
          />
        )}
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

function TabItem({
  label,
  icon,
  active,
  onClick,
  tone,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  tone?: "success" | "error";
}) {
  return (
    <button
      type="button"
      className={cn(
        "app-tabbar-item",
        active && "active",
        tone === "success" && "tone-success",
        tone === "error" && "tone-error"
      )}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-current={active ? "page" : undefined}
    >
      <span className="app-tabbar-icon">{icon}</span>
      <span className="app-tabbar-label">{label}</span>
    </button>
  );
}
