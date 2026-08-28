import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const labelVariants = cva(
  "text-[12px] font-medium leading-none tracking-[-0.01em] text-[rgba(245,245,247,0.92)] select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-40",
  {
    variants: {
      variant: {
        default: "text-[rgba(245,245,247,0.92)]",
        muted: "text-[rgba(235,235,245,0.55)] text-[11px]",
        badge: "min-w-[20px] rounded-[8px] bg-white/[0.06] px-1.5 py-0.5 text-center text-[10px] font-semibold text-[rgba(235,235,245,0.5)]",
        mono: "font-mono text-[10px] uppercase tracking-wider text-[rgba(235,235,245,0.45)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export type LabelProps = React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
  VariantProps<typeof labelVariants>;

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, variant, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants({ variant }), className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { labelVariants };
