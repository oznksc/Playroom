import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "./cn";

export type SwitchProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "md";
  variant?: "accent" | "success";
  label?: React.ReactNode;
  description?: React.ReactNode;
};

export const SwitchRoot = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & {
    size?: "sm" | "md";
    variant?: "accent" | "success";
  }
>(({ className, size = "sm", variant = "accent", ...props }, ref) => {
  const trackSize = {
    sm: "h-5 w-9 p-0.5",
    md: "h-6 w-11 p-0.5",
  }[size];

  const thumbSize = {
    sm: "size-4",
    md: "size-5",
  }[size];

  const thumbTranslate = {
    sm: "data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
    md: "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
  }[size];

  const activeColor = {
    accent: "data-[state=checked]:bg-accent data-[state=checked]:shadow-[0_0_8px_rgba(0,240,255,0.35)]",
    success: "data-[state=checked]:bg-accent-green data-[state=checked]:shadow-[0_0_8px_rgba(16,185,129,0.35)]",
  }[variant];

  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        "peer relative inline-flex shrink-0 cursor-pointer rounded-full bg-white/[0.12] transition-colors duration-200 ease-in-out select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-base",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "hover:bg-white/[0.18]",
        trackSize,
        activeColor,
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out",
          thumbSize,
          thumbTranslate
        )}
      />
    </SwitchPrimitive.Root>
  );
});
SwitchRoot.displayName = SwitchPrimitive.Root.displayName;

export const SwitchThumb = SwitchPrimitive.Thumb;

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, label, description, id: idProp, size = "sm", variant = "accent", disabled, ...props }, ref) => {
  const generatedId = React.useId();
  const id = idProp || (label ? generatedId : undefined);

  const switchElement = (
    <SwitchRoot
      ref={ref}
      id={id}
      size={size}
      variant={variant}
      disabled={disabled}
      className={!label && !description ? className : undefined}
      {...props}
    />
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
        {label && <span className="text-[12px] font-medium text-[rgba(245,245,247,0.92)] leading-tight">{label}</span>}
        {description && <span className="text-[10px] text-[rgba(235,235,245,0.45)] leading-tight mt-0.5">{description}</span>}
      </div>
    </label>
  );
});
Switch.displayName = "Switch";
