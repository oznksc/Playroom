import * as React from "react";
import { cn } from "./cn.js";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[72px] w-full resize-y rounded-md border border-border-default bg-surface-sunken px-2.5 py-2 text-sm tracking-[-0.01em] text-text-primary outline-none",
        "transition-[border-color,box-shadow,background] duration-150",
        "placeholder:text-text-muted/60",
        "hover:border-border-strong hover:bg-black/35",
        "focus:border-accent/50 focus:bg-black/40 focus:shadow-[0_0_0_2px_rgba(0,240,255,0.15)]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
