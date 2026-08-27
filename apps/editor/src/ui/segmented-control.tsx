import * as React from "react";
import { cn } from "./cn";

export type SegmentedControlOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  disabled?: boolean;
};

export type SegmentedControlProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly SegmentedControlOption<T>[];
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
};

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  ariaLabel,
  className,
  disabled = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-7 items-center rounded-[9px] border border-border-subtle bg-surface-sunken p-0.5",
        disabled && "opacity-40",
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
            aria-checked={selected}
            disabled={disabled || option.disabled}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "h-6 rounded-[6px] px-2 font-sans text-[10px] font-medium tracking-[-0.01em] transition-[background,color,box-shadow,transform] duration-150",
              "text-text-muted hover:bg-bg-hover hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus active:scale-[0.97] disabled:pointer-events-none",
              selected && "bg-surface-overlay text-signal-select shadow-sm ring-1 ring-border-focus"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
