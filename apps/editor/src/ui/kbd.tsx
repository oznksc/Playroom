import * as React from "react";
import { cn } from "./cn";

export type KbdProps = React.HTMLAttributes<HTMLElement>;

/** Compact keyboard shortcut badge for editor actions. */
export function Kbd({ className, children, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-border-default bg-surface-sunken px-1 font-mono text-[10px] font-medium leading-none text-text-secondary",
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
