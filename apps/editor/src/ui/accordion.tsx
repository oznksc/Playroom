import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "./cn";
import { IconButton } from "./icon-button";

export type AccordionSectionProps = {
  icon?: React.ReactNode;
  label: string;
  open: boolean;
  onToggle: () => void;
  removable?: boolean;
  onRemove?: () => void;
  children?: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  /** When true, header is non-interactive (section always shown when open). */
  staticHeader?: boolean;
};

/**
 * Glass card accordion. Uniform 1px edge — no rainbow left borders.
 * Open state uses a slightly stronger surface, not a different accent color.
 */
export function AccordionSection({
  icon,
  label,
  open,
  onToggle,
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
        "mb-1.5 overflow-hidden rounded-[10px] border border-white/[0.07] bg-white/[0.03]",
        open && "bg-white/[0.045] border-white/[0.09]",
        className,
      )}
    >
      <div className="flex h-9 items-center gap-0.5 px-1">
        <button
          type="button"
          onClick={staticHeader ? undefined : onToggle}
          disabled={staticHeader}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 rounded-[8px] px-1.5 py-1 text-left text-[12px] font-medium tracking-[-0.01em] text-[rgba(245,245,247,0.9)]",
            !staticHeader && "hover:bg-white/[0.06]",
            staticHeader && "cursor-default disabled:opacity-100",
          )}
        >
          {!staticHeader &&
            (open ? (
              <ChevronDown size={12} className="shrink-0 text-[rgba(235,235,245,0.4)]" />
            ) : (
              <ChevronRight size={12} className="shrink-0 text-[rgba(235,235,245,0.4)]" />
            ))}
          {icon && (
            <span className="shrink-0 text-[rgba(235,235,245,0.5)] [&_svg]:size-3">{icon}</span>
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
      {open && (
        <div className="flex flex-col gap-1.5 border-t border-white/[0.05] p-2">{children}</div>
      )}
    </div>
  );
}
