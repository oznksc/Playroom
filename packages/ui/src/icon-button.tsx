import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "./cn.js";

const iconButtonVariants = cva(
  [
    "inline-flex items-center justify-center shrink-0 border select-none relative",
    "transition-[color,background,border-color,transform,box-shadow,opacity] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-base",
    "disabled:pointer-events-none disabled:opacity-40",
    "active:scale-[0.96]",
    "before:absolute before:-inset-1 before:content-[''] before:pointer-events-auto",
  ].join(" "),
  {
    variants: {
      variant: {
        ghost:
          "bg-transparent text-text-secondary border-transparent hover:text-text-primary hover:bg-white/[0.08]",
        secondary:
          "bg-white/[0.06] text-text-primary border-white/[0.08] hover:bg-white/[0.10] hover:border-white/[0.12]",
        solid:
          "bg-accent/15 text-accent border-accent/25 hover:bg-accent/22 hover:border-accent/40",
        accent:
          "bg-accent/15 text-accent border-accent/25 hover:bg-accent/22 hover:border-accent/40",
        primary: "bg-accent !text-bg-base border-accent hover:bg-accent-hover shadow-glow-cyan",
        outline:
          "bg-transparent text-text-primary border-border-default hover:bg-white/[0.06] hover:border-border-strong",
        danger:
          "bg-transparent text-error border-transparent hover:bg-error/12 hover:border-error/25 active:bg-error/20",
        play: "bg-accent-green/15 text-accent-green border-accent-green/25 hover:bg-accent-green/22",
        stop: "bg-accent-red/15 text-accent-red border-accent-red/25 hover:bg-accent-red/22",
        active: "bg-accent/15 text-accent border-accent/35 shadow-[0_0_10px_rgba(0,240,255,0.15)]",
      },
      size: {
        xs: "size-5 rounded-xs text-2xs",
        sm: "size-6 rounded-sm text-xs",
        md: "size-7 rounded-md text-sm",
        lg: "size-8 rounded-md text-base",
        xl: "size-9 rounded-lg text-lg",
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
    const iconSize =
      size === "xs" ? 11 : size === "xl" ? 18 : size === "lg" ? 16 : size === "sm" ? 12 : 14;
    const computedVariant = active ? "active" : (variant ?? "ghost");

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

    const accessibleLabel =
      props["aria-label"] ?? (typeof props.title === "string" ? props.title : undefined);

    return (
      <button
        ref={ref}
        type={type}
        data-variant={computedVariant}
        data-active={active ? "true" : undefined}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-label={accessibleLabel}
        className={cn(iconButtonVariants({ variant: computedVariant, size }), className)}
        {...props}
      >
        {loading ? (
          <Loader2 size={iconSize} className="animate-spin shrink-0" aria-hidden />
        ) : (
          children
        )}
      </button>
    );
  }
);
IconButton.displayName = "IconButton";

export { iconButtonVariants };
