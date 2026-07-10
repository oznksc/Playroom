import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center shrink-0 rounded-md transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:pointer-events-none disabled:opacity-50 text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-transparent",
  {
    variants: {
      variant: {
        ghost: "",
        solid: "bg-bg-elevated border-border-default hover:border-border-strong",
        accent: "text-accent hover:bg-accent-muted hover:text-accent-hover",
        danger: "hover:text-error hover:bg-error/10 hover:border-error/30",
        active: "bg-accent-muted text-accent border-accent/30",
      },
      size: {
        sm: "size-5",
        md: "size-6",
        lg: "size-7",
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
