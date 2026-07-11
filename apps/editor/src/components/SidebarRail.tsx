import {
  Layers,
  FileCode,
  Boxes,
  Sparkles,
  Map,
  LayoutGrid,
  Package,
} from "lucide-react";
import { cn } from "@/ui";

export type SidebarTabId =
  | "entities"
  | "scenes"
  | "prefabs"
  | "agent"
  | "levels"
  | "guis"
  | "components";

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
  levels: <Map size={15} strokeWidth={1.75} />,
  guis: <LayoutGrid size={15} strokeWidth={1.75} />,
  components: <Package size={15} strokeWidth={1.75} />,
};

type SidebarRailProps = {
  active: SidebarTabId;
  items: { id: SidebarTabId; label: string }[];
  onChange: (id: SidebarTabId) => void;
};

export function SidebarRail({ active, items, onChange }: SidebarRailProps) {
  return (
    <nav
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
