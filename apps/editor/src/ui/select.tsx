import * as React from "react";
import { cn } from "./cn";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

/** Native select — glass chip style matching Apple dock language. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-8 w-full appearance-none rounded-[10px] border border-white/[0.08] bg-black/30 bg-[length:12px] bg-[right_8px_center] bg-no-repeat px-2.5 pr-7 text-[12px] tracking-[-0.01em] text-[rgba(245,245,247,0.9)] outline-none",
        "transition-[border-color,box-shadow,background] duration-150",
        "bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23ebebf599%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E')]",
        "hover:border-white/[0.12] hover:bg-black/35",
        "focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(0,240,255,0.12)]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
