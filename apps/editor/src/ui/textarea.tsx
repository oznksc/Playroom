import * as React from "react";
import { cn } from "./cn";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[72px] w-full resize-y rounded-md border border-border-default bg-bg-base px-2 py-1.5 text-base text-text-primary outline-none transition-[border-color,box-shadow] duration-[120ms]",
        "placeholder:text-text-muted",
        "hover:border-border-strong",
        "focus:border-accent focus:shadow-[0_0_0_2px_var(--accent-muted)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
