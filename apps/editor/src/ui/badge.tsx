import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[8px] px-1.5 py-0.5 text-[10px] font-semibold tracking-[-0.01em] select-none",
  {
    variants: {
      variant: {
        default: "bg-white/[0.08] text-[rgba(235,235,245,0.7)]",
        accent: "bg-accent/15 text-accent",
        purple: "bg-[rgba(139,92,246,0.15)] text-accent-purple",
        green: "bg-[rgba(16,185,129,0.15)] text-accent-green",
        red: "bg-[rgba(239,68,68,0.15)] text-error",
        gold: "bg-selection-muted text-selection",
        muted:
          "bg-transparent text-[rgba(235,235,245,0.45)] border border-white/[0.08]",
        mono:
          "bg-black/25 text-[rgba(235,235,245,0.5)] font-mono normal-case tracking-normal font-normal text-[10px] tabular-nums border border-white/[0.06]",
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
