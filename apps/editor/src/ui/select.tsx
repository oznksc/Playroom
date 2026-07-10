import * as React from "react";
import { cn } from "./cn";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

/** Native select styled for density (Radix Select available for richer menus). */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-[26px] w-full appearance-none rounded-md border border-border-default bg-bg-base bg-[length:12px] bg-[right_6px_center] bg-no-repeat px-2 pr-6 text-base tracking-[-0.01em] text-text-primary outline-none transition-[border-color,box-shadow] duration-[120ms]",
        "bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%2364748b%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E')]",
        "hover:border-border-strong focus:border-accent focus:shadow-[0_0_0_2px_var(--accent-muted)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
