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
  muted: "border-l-border-strong",
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
        "mb-1.5 overflow-hidden rounded-md border-l-2 bg-bg-elevated/35",
        accentBorder[accent],
        className
      )}
    >
      <div className="flex h-[34px] items-center gap-0.5 bg-bg-base/50 px-1">
        <button
          type="button"
          onClick={staticHeader ? undefined : onToggle}
          disabled={staticHeader}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 rounded-sm px-1.5 py-1 text-left text-sm font-medium text-text-primary",
            !staticHeader && "hover:bg-bg-hover",
            staticHeader && "cursor-default disabled:opacity-100"
          )}
        >
          {!staticHeader && (
            open ? (
              <ChevronDown size={12} className="shrink-0 text-text-muted" />
            ) : (
              <ChevronRight size={12} className="shrink-0 text-text-muted" />
            )
          )}
          {icon && <span className="shrink-0 text-text-secondary [&_svg]:size-3">{icon}</span>}
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
      {open && <div className="flex flex-col gap-1.5 p-2">{children}</div>}
    </div>
  );
}
