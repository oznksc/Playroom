import * as React from "react";
import { cn } from "./cn";

export type FieldProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
  /** full width single control */
  layout?: "row" | "stack" | "inline";
};

/** Inspector badge + control row — glass chip label */
export function Field({ label, children, className, layout = "row" }: FieldProps) {
  return (
    <div
      className={cn(
        layout === "stack" && "flex flex-col gap-1",
        layout === "row" && "flex min-w-0 items-center gap-1.5",
        layout === "inline" && "inline-flex items-center gap-1.5",
        className
      )}
    >
      <span className="min-w-[20px] shrink-0 select-none rounded-[8px] bg-white/[0.06] px-1.5 py-0.5 text-center text-[10px] font-semibold tracking-[-0.01em] text-[rgba(235,235,245,0.5)]">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
  disabled?: boolean;
};

export function NumberField({
  label,
  value,
  onChange,
  step,
  min,
  max,
  className,
  disabled,
}: NumberFieldProps) {
  return (
    <Field label={label} className={className}>
      <input
        type="number"
        disabled={disabled}
        step={step}
        min={min}
        max={max}
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "flex h-7 w-full rounded-[10px] border border-white/[0.08] bg-black/30 px-1.5 font-mono text-[11px] tabular-nums tracking-normal text-[rgba(245,245,247,0.92)] outline-none",
          "transition-[border-color,background] duration-150",
          "hover:border-white/[0.12] focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(0,240,255,0.12)]",
          "disabled:opacity-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        )}
      />
    </Field>
  );
}

export type CheckboxFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
};

export function CheckboxField({
  label,
  checked,
  onChange,
  className,
  disabled,
}: CheckboxFieldProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 text-[12px] tracking-[-0.01em] text-[rgba(235,235,245,0.7)]",
        disabled && "cursor-not-allowed opacity-40",
        className
      )}
    >
      <input
        type="checkbox"
        disabled={disabled}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3.5 cursor-pointer accent-accent"
      />
      <span>{label}</span>
    </label>
  );
}

export type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
};

export function ColorField({
  label,
  value,
  onChange,
  className,
  disabled,
}: ColorFieldProps) {
  const hex = value?.startsWith("#") ? value : "#ffffff";
  return (
    <Field label={label} className={className}>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          disabled={disabled}
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className="size-7 shrink-0 cursor-pointer rounded-[8px] border border-white/[0.08] bg-transparent p-0.5 disabled:opacity-40"
        />
        <input
          type="text"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 min-w-0 flex-1 rounded-[10px] border border-white/[0.08] bg-black/30 px-1.5 font-mono text-[11px] tabular-nums tracking-normal text-[rgba(245,245,247,0.92)] outline-none hover:border-white/[0.12] focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(0,240,255,0.12)] disabled:opacity-40"
        />
      </div>
    </Field>
  );
}
