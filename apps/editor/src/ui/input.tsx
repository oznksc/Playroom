import * as React from "react";
import { cn } from "./cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  mono?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, mono, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-[26px] w-full rounded-md border border-border-default bg-bg-base px-2 text-base text-text-primary outline-none transition-[border-color,box-shadow] duration-[120ms]",
        "placeholder:text-text-muted",
        "hover:border-border-strong",
        "focus:border-accent focus:shadow-[0_0_0_2px_var(--accent-muted)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        mono && "font-mono tabular-nums text-sm tracking-normal",
        type === "number" && "font-mono tabular-nums text-sm tracking-normal [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
