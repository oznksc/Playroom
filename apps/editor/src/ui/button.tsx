import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        ghost:
          "bg-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary border border-transparent",
        secondary:
          "bg-bg-elevated text-text-primary border border-border-default hover:bg-bg-hover hover:border-border-strong",
        solid:
          "bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 hover:border-accent/50",
        primary:
          "bg-accent text-bg-base border border-accent hover:bg-accent-hover font-semibold",
        danger:
          "bg-transparent text-error border border-transparent hover:bg-error/10 hover:border-error/40",
        play:
          "bg-accent-green/15 text-accent-green border border-accent-green/30 hover:bg-accent-green/25",
        stop:
          "bg-accent-red/15 text-accent-red border border-accent-red/30 hover:bg-accent-red/25",
      },
      size: {
        sm: "h-[22px] px-2 text-xs",
        md: "h-[26px] px-2.5 text-sm",
        lg: "h-[30px] px-3 text-base",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "sm",
    },
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
