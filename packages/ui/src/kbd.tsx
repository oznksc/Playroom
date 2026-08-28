import * as React from "react";
import { cn } from "./cn.js";

export type KbdProps = React.HTMLAttributes<HTMLElement>;

/** Compact keyboard shortcut badge for editor actions. */
export function Kbd({ className, children, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-border-default bg-surface-sunken px-1 font-mono text-2xs font-medium leading-none text-text-secondary select-none",
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
