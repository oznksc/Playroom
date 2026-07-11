import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

/**
 * Apple-glass buttons — soft radius, translucent chips, hairline borders.
 * Matches tab bar / play pill language.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap select-none",
    "rounded-[10px] font-medium tracking-[-0.01em]",
    "transition-[color,background,border-color,transform,box-shadow] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        ghost:
          "bg-transparent text-[rgba(235,235,245,0.55)] border border-transparent hover:bg-white/[0.06] hover:text-[rgba(245,245,247,0.92)]",
        secondary:
          "bg-white/[0.06] text-[rgba(245,245,247,0.9)] border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.12]",
        solid:
          "bg-accent/15 text-accent border border-accent/25 hover:bg-accent/22 hover:border-accent/40",
        primary:
          "bg-accent text-[#041016] border border-accent hover:bg-accent-hover font-semibold shadow-[0_0_0_0.5px_rgba(0,240,255,0.25)]",
        danger:
          "bg-transparent text-error border border-transparent hover:bg-error/12 hover:border-error/25",
        play:
          "bg-accent-green/15 text-accent-green border border-accent-green/25 hover:bg-accent-green/22",
        stop:
          "bg-accent-red/15 text-accent-red border border-accent-red/25 hover:bg-accent-red/22",
      },
      size: {
        sm: "h-7 px-2.5 text-[11px]",
        md: "h-8 px-3 text-[12px]",
        lg: "h-9 px-3.5 text-[13px]",
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
