import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "./cn.js";

export type SelectableCardProps = {
  selected: boolean;
  onSelect: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function SelectableCard({
  selected,
  onSelect,
  title,
  description,
  icon,
  badge,
  disabled = false,
  className,
  children,
}: SelectableCardProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col text-left p-3.5 rounded-lg border transition-all duration-150 select-none outline-none",
        "bg-surface-raised border-border-default",
        "hover:bg-bg-overlay hover:border-border-strong",
        "focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:border-accent",
        selected && "border-accent bg-accent-muted/40 shadow-glow-cyan/20 ring-1 ring-accent/30",
        disabled && "opacity-40 pointer-events-none",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 w-full mb-1">
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md border text-text-secondary transition-colors",
                selected
                  ? "border-accent/40 bg-accent/15 text-accent"
                  : "border-border-subtle bg-surface-sunken"
              )}
            >
              {icon}
            </span>
          )}
          <span className="font-semibold text-sm text-text-primary truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {badge && <span>{badge}</span>}
          <div
            className={cn(
              "flex size-4 items-center justify-center rounded-xs border transition-colors",
              selected
                ? "border-accent bg-accent text-bg-base"
                : "border-border-strong bg-surface-sunken opacity-0 group-hover:opacity-60"
            )}
          >
            {selected && <Check size={11} className="stroke-[3]" />}
          </div>
        </div>
      </div>
      {description && (
        <p className="text-xs text-text-muted leading-relaxed m-0 mt-0.5 line-clamp-2">
          {description}
        </p>
      )}
      {children && <div className="mt-2 w-full">{children}</div>}
    </button>
  );
}
