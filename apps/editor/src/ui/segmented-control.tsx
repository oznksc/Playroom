import * as React from "react";
import { cn } from "./cn";

export type SegmentedControlOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode | number | string;
  tooltip?: string;
  disabled?: boolean;
};

export type SegmentedControlProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly SegmentedControlOption<T>[];
  ariaLabel?: string;
  size?: "xs" | "sm" | "md";
  variant?: "default" | "subtle" | "pills";
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
};

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  ariaLabel = "Segmented choices",
  size = "sm",
  variant = "default",
  fullWidth = false,
  className,
  disabled = false,
}: SegmentedControlProps<T>) {
  const containerSizeStyles = {
    xs: "h-6 rounded-[8px] p-0.5 gap-0.5",
    sm: "h-7 rounded-[9px] p-0.5 gap-0.5",
    md: "h-8.5 rounded-[11px] p-0.5 gap-1",
  }[size];

  const itemSizeStyles = {
    xs: "h-5 rounded-[5px] px-1.5 text-[9px] gap-1",
    sm: "h-6 rounded-[6px] px-2 text-[10px] gap-1.5",
    md: "h-7 rounded-[8px] px-3 text-[11px] gap-2",
  }[size];

  const containerVariantStyles = {
    default: "border border-border-subtle bg-surface-sunken",
    subtle: "border border-white/[0.04] bg-white/[0.03]",
    pills: "rounded-full border border-border-subtle bg-surface-sunken",
  }[variant];

  const itemActiveStyles = {
    default: "bg-surface-overlay text-signal-select shadow-sm ring-1 ring-border-focus font-semibold",
    subtle: "bg-white/[0.1] text-accent shadow-sm font-semibold",
    pills: "rounded-full bg-accent !text-[#06090e] font-semibold shadow-sm",
  }[variant];

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center select-none",
        containerSizeStyles,
        containerVariantStyles,
        fullWidth && "w-full",
        disabled && "opacity-40 pointer-events-none",
        className
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            title={option.tooltip}
            aria-checked={selected}
            disabled={disabled || option.disabled}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "inline-flex items-center justify-center font-sans font-medium tracking-[-0.01em] transition-[background,color,box-shadow,transform] duration-150",
              "text-text-muted hover:bg-bg-hover hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
              itemSizeStyles,
              fullWidth && "flex-1",
              selected ? itemActiveStyles : undefined
            )}
          >
            {option.icon && (
              <span className="shrink-0 inline-flex items-center" aria-hidden>
                {option.icon}
              </span>
            )}
            <span className="truncate">{option.label}</span>
            {option.badge !== undefined && (
              <span
                className={cn(
                  "ml-0.5 rounded-full px-1.5 py-0 text-[8px] font-mono",
                  selected
                    ? variant === "pills"
                      ? "bg-black/20 text-black"
                      : "bg-accent/20 text-accent font-semibold"
                    : "bg-white/[0.08] text-text-muted"
                )}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
