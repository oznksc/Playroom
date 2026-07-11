import * as React from "react";
import { cn } from "./cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[72px] w-full resize-y rounded-[12px] border border-white/[0.08] bg-black/30 px-2.5 py-2 text-[12px] tracking-[-0.01em] text-[rgba(245,245,247,0.92)] outline-none",
        "transition-[border-color,box-shadow,background] duration-150",
        "placeholder:text-[rgba(235,235,245,0.35)]",
        "hover:border-white/[0.12] hover:bg-black/35",
        "focus:border-accent/50 focus:bg-black/40 focus:shadow-[0_0_0_3px_rgba(0,240,255,0.12)]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
