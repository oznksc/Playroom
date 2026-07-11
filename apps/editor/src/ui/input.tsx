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
        "flex h-8 w-full rounded-[10px] border border-white/[0.08] bg-black/30 px-2.5 text-[12px] tracking-[-0.01em] text-[rgba(245,245,247,0.92)] outline-none",
        "transition-[border-color,box-shadow,background] duration-150",
        "placeholder:text-[rgba(235,235,245,0.35)]",
        "hover:border-white/[0.12] hover:bg-black/35",
        "focus:border-accent/50 focus:bg-black/40 focus:shadow-[0_0_0_3px_rgba(0,240,255,0.12)]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        mono && "font-mono tabular-nums text-[11px] tracking-normal",
        type === "number" &&
          "font-mono tabular-nums text-[11px] tracking-normal [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
