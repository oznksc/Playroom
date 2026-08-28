import * as React from "react";
import { cn } from "./cn.js";

export type RangeProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  showValue?: boolean;
};

export const Range = React.forwardRef<HTMLInputElement, RangeProps>(
  (
    {
      className,
      value,
      onValueChange,
      min = 0,
      max = 100,
      step = 1,
      showValue = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

    return (
      <div
        className={cn(
          "flex w-full items-center gap-2 select-none",
          disabled && "opacity-40",
          className
        )}
      >
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onValueChange(Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, var(--color-accent) ${percentage}%, rgba(255, 255, 255, 0.12) ${percentage}%)`,
          }}
          className={cn(
            "h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none transition-[background,opacity] duration-150",
            "focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-base",
            "disabled:cursor-not-allowed",
            "[&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-100 active:[&::-webkit-slider-thumb]:scale-110",
            "[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md"
          )}
          {...props}
        />
        {showValue && (
          <span className="min-w-[28px] font-mono text-2xs tabular-nums text-text-muted text-right">
            {value}
          </span>
        )}
      </div>
    );
  }
);
Range.displayName = "Range";
