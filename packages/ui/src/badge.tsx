import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn.js";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-2xs font-semibold tracking-[-0.01em] select-none",
  {
    variants: {
      variant: {
        default: "bg-white/[0.08] text-text-primary",
        accent: "bg-accent/15 text-accent",
        purple: "bg-[rgba(139,92,246,0.15)] text-accent-purple",
        green: "bg-[rgba(16,185,129,0.15)] text-accent-green",
        success: "bg-[rgba(16,185,129,0.15)] text-accent-green",
        red: "bg-[rgba(239,68,68,0.15)] text-error",
        danger: "bg-[rgba(239,68,68,0.15)] text-error",
        gold: "bg-selection-muted text-selection",
        muted: "bg-transparent text-text-muted border border-border-default",
        mono: "bg-surface-sunken text-text-secondary font-mono normal-case tracking-normal font-normal text-2xs tabular-nums border border-border-subtle",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
