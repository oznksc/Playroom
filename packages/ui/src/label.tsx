import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn.js";

const labelVariants = cva(
  "text-base font-medium leading-none tracking-[-0.01em] text-text-primary select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-40",
  {
    variants: {
      variant: {
        default: "text-text-primary",
        muted: "text-text-muted text-xs",
        badge:
          "min-w-[20px] rounded-md bg-white/[0.06] px-1.5 py-0.5 text-center text-2xs font-semibold text-text-muted",
        mono: "font-mono text-2xs uppercase tracking-wider text-text-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export type LabelProps = React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
  VariantProps<typeof labelVariants>;

export const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, LabelProps>(
  ({ className, variant, ...props }, ref) => (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(labelVariants({ variant }), className)}
      {...props}
    />
  )
);
Label.displayName = LabelPrimitive.Root.displayName;

export { labelVariants };
