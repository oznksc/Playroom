import {
  Layers,
  FileCode,
  Boxes,
  Sparkles,
  Map,
  LayoutGrid,
  Package,
  Globe,
  Trophy,
} from "lucide-react";
import { cn } from "@/ui";
import type { EditorSidebarTab } from "../lib/editor-layout.js";

export type SidebarTabId = EditorSidebarTab;

export type SidebarRailItem = {
  id: SidebarTabId;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
};

const ICONS: Record<SidebarTabId, React.ReactNode> = {
  entities: <Layers size={15} strokeWidth={1.75} />,
  scenes: <FileCode size={15} strokeWidth={1.75} />,
  prefabs: <Boxes size={15} strokeWidth={1.75} />,
  agent: <Sparkles size={15} strokeWidth={1.75} />,
  world: <Globe size={15} strokeWidth={1.75} />,
  levels: <Map size={15} strokeWidth={1.75} />,
  guis: <LayoutGrid size={15} strokeWidth={1.75} />,
  components: <Package size={15} strokeWidth={1.75} />,
  recipes: <Sparkles size={15} strokeWidth={1.75} />,
  services: <Trophy size={15} strokeWidth={1.75} />,
};

type SidebarRailProps = {
  active: SidebarTabId;
  items: { id: SidebarTabId; label: string }[];
  onChange: (id: SidebarTabId) => void;
};

export function SidebarRail({ active, items, onChange }: SidebarRailProps) {
  return (
    <nav
      id="tour-activity-rail"
      className="sidebar-rail"
      aria-label="Workspace panels"
      role="tablist"
      aria-orientation="vertical"
    >
      {items.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            id={item.id === "agent" ? "tour-agent-button" : undefined}
            type="button"
            role="tab"
            aria-selected={isActive}
            title={item.label}
            onClick={() => onChange(item.id)}
            className={cn("sidebar-rail-btn", isActive && "active")}
          >
            <span className="sidebar-rail-icon" aria-hidden>
              {ICONS[item.id]}
            </span>
            <span className="sidebar-rail-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
