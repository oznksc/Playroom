import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "./cn.js";

export type CheckboxProps = React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>;

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "group peer size-4 shrink-0 rounded-sm border border-border-strong bg-surface-sunken transition-[background,border-color,box-shadow] duration-150 outline-none select-none flex items-center justify-center",
      "hover:border-white/[0.25] hover:bg-white/[0.04]",
      "data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-bg-base data-[state=checked]:shadow-[0_0_8px_rgba(0,240,255,0.35)]",
      "data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent data-[state=indeterminate]:text-bg-base data-[state=indeterminate]:shadow-[0_0_8px_rgba(0,240,255,0.35)]",
      "focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-base",
      "disabled:cursor-not-allowed disabled:opacity-40",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current pointer-events-none">
      <Check className="size-3 stroke-[3.5] text-bg-base group-data-[state=indeterminate]:hidden" />
      <Minus className="size-3 stroke-[3.5] text-bg-base group-data-[state=checked]:hidden" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
