import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const statusDotVariants = cva("inline-block size-1.5 shrink-0 rounded-full", {
  variants: {
    status: {
      idle: "bg-text-muted",
      loading: "bg-accent animate-pulse",
      success: "bg-success shadow-glow-green",
      error: "bg-error shadow-glow-red",
      playing: "bg-accent-green shadow-glow-green",
      dirty: "bg-selection",
      accent: "bg-accent shadow-glow-cyan",
    },
  },
  defaultVariants: {
    status: "idle",
  },
});

export type StatusDotProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof statusDotVariants>;

export function StatusDot({ className, status, ...props }: StatusDotProps) {
  return (
    <span
      className={cn(statusDotVariants({ status }), className)}
      aria-hidden
      {...props}
    />
  );
}
