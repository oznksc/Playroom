import * as React from "react";
import { cn } from "./cn";

export type SwitchProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  variant?: "accent" | "success";
  label?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  id?: string;
  name?: string;
  "aria-label"?: string;
  title?: string;
};

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked: controlledChecked,
      defaultChecked = false,
      onCheckedChange,
      disabled = false,
      size = "sm",
      variant = "accent",
      label,
      description,
      className,
      id,
      name,
      "aria-label": ariaLabel,
      title,
    },
    ref
  ) => {
    const isControlled = controlledChecked !== undefined;
    const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked);
    const checked = isControlled ? controlledChecked : uncontrolledChecked;

    const handleToggle = () => {
      if (disabled) return;
      const next = !checked;
      if (!isControlled) {
        setUncontrolledChecked(next);
      }
      onCheckedChange?.(next);
    };

    const trackSize = {
      sm: "h-5 w-9 p-0.5",
      md: "h-6 w-11 p-0.5",
    }[size];

    const thumbSize = {
      sm: "size-4",
      md: "size-5",
    }[size];

    const thumbTranslate = {
      sm: checked ? "translate-x-4" : "translate-x-0",
      md: checked ? "translate-x-5" : "translate-x-0",
    }[size];

    const activeColor = {
      accent: "bg-accent shadow-[0_0_8px_rgba(0,240,255,0.35)]",
      success: "bg-accent-green shadow-[0_0_8px_rgba(16,185,129,0.35)]",
    }[variant];

    const switchElement = (
      <button
        ref={ref}
        id={id}
        name={name}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || (typeof label === "string" ? label : undefined)}
        title={title}
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          "relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-base",
          "disabled:cursor-not-allowed disabled:opacity-40",
          trackSize,
          checked ? activeColor : "bg-white/[0.12] hover:bg-white/[0.18]"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out",
            thumbSize,
            thumbTranslate
          )}
        />
      </button>
    );

    if (!label && !description) {
      return switchElement;
    }

    return (
      <label
        htmlFor={id}
        className={cn(
          "inline-flex items-center gap-2.5 cursor-pointer select-none",
          disabled && "cursor-not-allowed opacity-40",
          className
        )}
      >
        {switchElement}
        <div className="flex flex-col">
          {label && <span className="text-xs font-medium text-text-primary leading-tight">{label}</span>}
          {description && <span className="text-[10px] text-text-muted leading-tight mt-0.5">{description}</span>}
        </div>
      </label>
    );
  }
);
Switch.displayName = "Switch";
