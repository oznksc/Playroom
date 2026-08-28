import * as React from "react";
import { cn } from "./cn.js";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  mono?: boolean;
  inputSize?: "xs" | "sm" | "md" | "lg";
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, mono, inputSize = "md", type = "text", ...props }, ref) => {
    const sizeClasses = {
      xs: "h-6 px-2 text-2xs rounded-sm",
      sm: "h-7 px-2.5 text-xs rounded-md",
      md: "h-8 px-2.5 text-sm rounded-md",
      lg: "h-9 px-3 text-base rounded-lg",
    }[inputSize];

    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex w-full border border-border-default bg-surface-sunken tracking-[-0.01em] text-text-primary outline-none",
          "transition-[border-color,box-shadow,background] duration-150",
          "placeholder:text-text-muted/60",
          "hover:border-border-strong hover:bg-black/35",
          "focus:border-accent/50 focus:bg-black/40 focus:shadow-[0_0_0_2px_rgba(0,240,255,0.15)]",
          "disabled:cursor-not-allowed disabled:opacity-40",
          sizeClasses,
          mono && "font-mono tabular-nums text-xs tracking-normal",
          type === "number" &&
            "font-mono tabular-nums text-xs tracking-normal [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
