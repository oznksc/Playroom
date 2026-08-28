import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "./cn";

/**
 * Apple-glass buttons — soft radius, translucent chips, hairline borders.
 * Unified design token language across the editor.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center whitespace-nowrap select-none",
    "font-medium tracking-[-0.01em]",
    "transition-[color,background,border-color,transform,box-shadow,opacity] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-base",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        ghost:
          "bg-transparent text-[rgba(235,235,245,0.65)] border border-transparent hover:bg-white/[0.06] hover:text-[rgba(245,245,247,0.95)]",
        secondary:
          "bg-white/[0.06] text-[rgba(245,245,247,0.9)] border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.12]",
        solid:
          "bg-accent/15 text-accent border border-accent/25 hover:bg-accent/22 hover:border-accent/40",
        accent:
          "bg-accent/15 text-accent border border-accent/25 hover:bg-accent/22 hover:border-accent/40",
        primary:
          "btn-cyan-primary bg-accent !text-[#06090e] border border-accent hover:bg-accent-hover font-semibold shadow-[0_0_0_0.5px_rgba(0,240,255,0.25),0_0_12px_rgba(0,240,255,0.18)]",
        outline:
          "bg-transparent text-[rgba(245,245,247,0.9)] border border-border-default hover:bg-white/[0.06] hover:border-border-strong",
        danger:
          "bg-transparent text-error border border-transparent hover:bg-error/12 hover:border-error/25 active:bg-error/20",
        play:
          "bg-accent-green/15 text-accent-green border border-accent-green/25 hover:bg-accent-green/22",
        stop:
          "bg-accent-red/15 text-accent-red border border-accent-red/25 hover:bg-accent-red/22",
        active:
          "bg-accent/15 text-accent border border-accent/35 shadow-[0_0_10px_rgba(0,240,255,0.15)]",
      },
      size: {
        xs: "h-6 px-2 text-[10px] gap-1 rounded-[8px]",
        sm: "h-7 px-2.5 text-[11px] gap-1.5 rounded-[9px]",
        md: "h-8 px-3 text-[12px] gap-1.5 rounded-[10px]",
        lg: "h-9 px-3.5 text-[13px] gap-2 rounded-[12px]",
      },
      fullWidth: {
        true: "w-full",
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
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    loading?: boolean;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      asChild = false,
      type = "button",
      leftIcon,
      rightIcon,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const iconSize = size === "xs" ? 11 : size === "lg" ? 15 : size === "md" ? 13 : 12;

    if (asChild) {
      return (
        <Slot
          ref={ref}
          data-variant={variant ?? "ghost"}
          className={cn(buttonVariants({ variant, size, fullWidth }), className)}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        data-variant={variant ?? "ghost"}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        {...props}
      >
        {loading ? (
          <Loader2 size={iconSize} className="animate-spin shrink-0" aria-hidden />
        ) : (
          leftIcon && <span className="shrink-0 inline-flex items-center" aria-hidden>{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && (
          <span className="shrink-0 inline-flex items-center" aria-hidden>{rightIcon}</span>
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
