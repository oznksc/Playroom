import * as React from "react";
import { cn } from "./cn";

export type FieldProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
  /** full width single control */
  layout?: "row" | "stack" | "inline";
};

/** Inspector badge + control row (brief: field badge pattern) */
export function Field({ label, children, className, layout = "row" }: FieldProps) {
  return (
    <div
      className={cn(
        layout === "stack" && "flex flex-col gap-1",
        layout === "row" && "flex items-center gap-1.5 min-w-0",
        layout === "inline" && "inline-flex items-center gap-1.5",
        className
      )}
    >
      <span className="shrink-0 min-w-[18px] rounded-sm bg-bg-hover px-1 py-0.5 text-center text-2xs font-semibold uppercase tracking-[0.08em] text-text-muted select-none">
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
          "flex h-[22px] w-full rounded-md border border-border-default bg-bg-base px-1.5 font-mono text-sm tabular-nums tracking-normal text-text-primary outline-none",
          "hover:border-border-strong focus:border-accent focus:shadow-[0_0_0_2px_var(--accent-muted)]",
          "disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
        "flex cursor-pointer select-none items-center gap-2 text-sm tracking-[-0.01em] text-text-secondary",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <input
        type="checkbox"
        disabled={disabled}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3.5 accent-accent cursor-pointer"
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
          className="size-[22px] shrink-0 cursor-pointer rounded border border-border-default bg-transparent p-0 disabled:opacity-50"
        />
        <input
          type="text"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-[22px] min-w-0 flex-1 rounded-md border border-border-default bg-bg-base px-1.5 font-mono text-sm tabular-nums tracking-normal text-text-primary outline-none hover:border-border-strong focus:border-accent focus:shadow-[0_0_0_2px_var(--accent-muted)] disabled:opacity-50"
        />
      </div>
    </Field>
  );
}
