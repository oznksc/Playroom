import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.08em] select-none",
  {
    variants: {
      variant: {
        default: "bg-bg-hover text-text-secondary",
        accent: "bg-accent-muted text-accent",
        purple: "bg-[rgba(139,92,246,0.12)] text-accent-purple",
        green: "bg-[rgba(16,185,129,0.12)] text-accent-green",
        red: "bg-[rgba(239,68,68,0.12)] text-error",
        gold: "bg-selection-muted text-selection",
        muted: "bg-transparent text-text-muted border border-border-default",
        mono: "bg-bg-base text-text-muted font-mono normal-case tracking-normal font-normal text-xs tabular-nums",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
