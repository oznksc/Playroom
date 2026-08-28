import { cn } from "./cn.js";
import { Input } from "./input.js";

export type ColorControlProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  showHexInput?: boolean;
};

export function ColorControl({
  value,
  onChange,
  disabled = false,
  className,
  showHexInput = true,
}: ColorControlProps) {
  const hex = value?.startsWith("#") ? value : "#ffffff";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <label className="relative size-7 shrink-0 cursor-pointer overflow-hidden rounded-md border border-border-default bg-surface-sunken p-0.5 transition-colors hover:border-border-strong focus-within:ring-2 focus-within:ring-accent/40">
        <input
          type="color"
          value={hex}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
        <div
          className="size-full rounded-xs border border-white/10"
          style={{ backgroundColor: hex }}
        />
      </label>
      {showHexInput && (
        <Input
          mono
          inputSize="sm"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#ffffff"
          className="h-7 min-w-[70px] flex-1 text-xs"
        />
      )}
    </div>
  );
}
