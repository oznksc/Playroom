import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "./cn";
import { IconButton } from "./icon-button";

export type AccordionAccent = "cyan" | "purple" | "green" | "gold" | "red" | "muted";

const accentBorder: Record<AccordionAccent, string> = {
  cyan: "border-l-accent",
  purple: "border-l-accent-purple",
  green: "border-l-accent-green",
  gold: "border-l-selection",
  red: "border-l-error",
  muted: "border-l-white/15",
};

export type AccordionSectionProps = {
  icon?: React.ReactNode;
  label: string;
  open: boolean;
  onToggle: () => void;
  accent?: AccordionAccent;
  removable?: boolean;
  onRemove?: () => void;
  children?: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  /** When true, header is non-interactive (section always shown when open). */
  staticHeader?: boolean;
};

/** Glass card accordion — matches tab-bar chip language */
export function AccordionSection({
  icon,
  label,
  open,
  onToggle,
  accent = "cyan",
  removable,
  onRemove,
  children,
  className,
  actions,
  staticHeader = false,
}: AccordionSectionProps) {
  return (
    <div
      className={cn(
        "mb-1.5 overflow-hidden rounded-[12px] border border-white/[0.06] border-l-2 bg-white/[0.05]",
        accentBorder[accent],
        className
      )}
    >
      <div className="flex h-9 items-center gap-0.5 px-1">
        <button
          type="button"
          onClick={staticHeader ? undefined : onToggle}
          disabled={staticHeader}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 rounded-[10px] px-1.5 py-1 text-left text-[12px] font-medium tracking-[-0.01em] text-[rgba(245,245,247,0.9)]",
            !staticHeader && "hover:bg-white/[0.06]",
            staticHeader && "cursor-default disabled:opacity-100"
          )}
        >
          {!staticHeader &&
            (open ? (
              <ChevronDown size={12} className="shrink-0 text-[rgba(235,235,245,0.4)]" />
            ) : (
              <ChevronRight size={12} className="shrink-0 text-[rgba(235,235,245,0.4)]" />
            ))}
          {icon && (
            <span className="shrink-0 text-[rgba(235,235,245,0.55)] [&_svg]:size-3">{icon}</span>
          )}
          <span className="truncate">{label}</span>
        </button>
        <span className="flex shrink-0 items-center gap-0.5 pr-0.5">
          {actions}
          {removable && onRemove && (
            <IconButton
              size="sm"
              variant="danger"
              title={`Remove ${label}`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <span className="text-[11px] leading-none">−</span>
            </IconButton>
          )}
        </span>
      </div>
      {open && <div className="flex flex-col gap-1.5 border-t border-white/[0.05] p-2">{children}</div>}
    </div>
  );
}
