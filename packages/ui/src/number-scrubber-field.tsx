import * as React from "react";
import { cn } from "./cn.js";

const clamp = (value: number, min?: number, max?: number) =>
  Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min ?? Number.NEGATIVE_INFINITY, value));

export type NumberScrubberFieldProps = {
  value: number;
  onValueChange: (value: number) => void;
  label: string;
  unit?: string;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
};

/** Numeric input whose label can be dragged horizontally for fine adjustments. */
export function NumberScrubberField({
  value,
  onValueChange,
  label,
  unit,
  step = 1,
  min,
  max,
  disabled = false,
  className,
}: NumberScrubberFieldProps) {
  const origin = React.useRef<{ x: number; value: number } | null>(null);
  const [draft, setDraft] = React.useState(String(value));

  React.useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const next = Number(draft);
    if (Number.isFinite(next)) onValueChange(clamp(next, min, max));
    else setDraft(String(value));
  };

  return (
    <div
      className={cn(
        "flex h-7 min-w-0 items-stretch overflow-hidden rounded-md border border-border-default bg-surface-sunken transition-colors hover:border-border-focus focus-within:border-border-active focus-within:ring-2 focus-within:ring-border-focus",
        disabled && "opacity-40",
        className
      )}
    >
      <button
        type="button"
        disabled={disabled}
        aria-label={`Drag to adjust ${label}`}
        className="cursor-ew-resize select-none border-r border-border-subtle bg-bg-surface px-2 font-sans text-2xs font-semibold uppercase tracking-[0.06em] text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary disabled:cursor-not-allowed"
        onPointerDown={(event) => {
          origin.current = { x: event.clientX, value };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!origin.current) return;
          const delta = Math.round((event.clientX - origin.current.x) / 4) * step;
          onValueChange(clamp(origin.current.value + delta, min, max));
        }}
        onPointerUp={() => {
          origin.current = null;
        }}
        onPointerCancel={() => {
          origin.current = null;
        }}
      >
        {label}
      </button>
      <input
        aria-label={label}
        disabled={disabled}
        inputMode="decimal"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setDraft(String(value));
            event.currentTarget.blur();
          }
        }}
        className="min-w-0 flex-1 bg-transparent px-2 font-mono text-xs tabular-nums text-text-primary outline-none"
      />
      {unit && (
        <span className="flex items-center border-l border-border-subtle px-1.5 font-mono text-2xs text-text-muted">
          {unit}
        </span>
      )}
    </div>
  );
}
