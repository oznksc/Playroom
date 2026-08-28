import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "./cn";

const iconButtonVariants = cva(
  [
    "inline-flex items-center justify-center shrink-0 border select-none",
    "transition-[color,background,border-color,transform,box-shadow,opacity] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-base",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:scale-[0.96]",
  ].join(" "),
  {
    variants: {
      variant: {
        ghost:
          "bg-transparent text-[rgba(235,235,245,0.65)] border-transparent hover:text-[rgba(245,245,247,0.95)] hover:bg-white/[0.08]",
        secondary:
          "bg-white/[0.06] text-[rgba(245,245,247,0.9)] border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.12]",
        solid:
          "bg-accent/15 text-accent border-accent/25 hover:bg-accent/22 hover:border-accent/40",
        accent:
          "bg-accent/15 text-accent border-accent/25 hover:bg-accent/22 hover:border-accent/40",
        primary:
          "btn-cyan-primary bg-accent !text-[#06090e] border-accent hover:bg-accent-hover shadow-[0_0_0_0.5px_rgba(0,240,255,0.25),0_0_12px_rgba(0,240,255,0.18)]",
        outline:
          "bg-transparent text-[rgba(245,245,247,0.9)] border-border-default hover:bg-white/[0.06] hover:border-border-strong",
        danger:
          "bg-transparent text-error border-transparent hover:bg-error/12 hover:border-error/25 active:bg-error/20",
        play:
          "bg-accent-green/15 text-accent-green border-accent-green/25 hover:bg-accent-green/22",
        stop:
          "bg-accent-red/15 text-accent-red border-accent-red/25 hover:bg-accent-red/22",
        active:
          "bg-accent/15 text-accent border-accent/35 shadow-[0_0_10px_rgba(0,240,255,0.15)]",
      },
      size: {
        xs: "size-5 rounded-[6px] text-[10px]",
        sm: "size-6 rounded-[8px] text-[11px]",
        md: "size-7 rounded-[9px] text-[12px]",
        lg: "size-8 rounded-[10px] text-[14px]",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  }
);

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof iconButtonVariants> & {
    asChild?: boolean;
    loading?: boolean;
    active?: boolean;
  };

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant,
      size,
      active = false,
      loading = false,
      asChild = false,
      type = "button",
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const iconSize = size === "xs" ? 11 : size === "lg" ? 16 : size === "sm" ? 12 : 14;
    const computedVariant = active ? "active" : variant ?? "ghost";

    if (asChild) {
      return (
        <Slot
          ref={ref}
          data-variant={computedVariant}
          data-active={active ? "true" : undefined}
          className={cn(iconButtonVariants({ variant: computedVariant, size }), className)}
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
        data-variant={computedVariant}
        data-active={active ? "true" : undefined}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(iconButtonVariants({ variant: computedVariant, size }), className)}
        {...props}
      >
        {loading ? <Loader2 size={iconSize} className="animate-spin shrink-0" aria-hidden /> : children}
      </button>
    );
  }
);
IconButton.displayName = "IconButton";

export { iconButtonVariants };
