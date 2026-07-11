import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const iconButtonVariants = cva(
  [
    "inline-flex items-center justify-center shrink-0 rounded-[10px]",
    "transition-[color,background,border-color,transform] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
    "disabled:pointer-events-none disabled:opacity-40",
    "text-[rgba(235,235,245,0.55)] border border-transparent",
    "hover:text-[rgba(245,245,247,0.92)] hover:bg-white/[0.08]",
    "active:scale-[0.96]",
  ].join(" "),
  {
    variants: {
      variant: {
        ghost: "",
        solid:
          "bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.12]",
        accent: "text-accent hover:bg-accent/15 hover:text-accent-hover",
        danger: "hover:text-error hover:bg-error/12 hover:border-error/25",
        active: "bg-accent/15 text-accent border-accent/25 hover:bg-accent/20",
      },
      size: {
        sm: "size-6",
        md: "size-7",
        lg: "size-8",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  }
);

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof iconButtonVariants>;

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
IconButton.displayName = "IconButton";

export { iconButtonVariants };
