import * as React from "react";
import { cn } from "./cn.js";
import { IconButton, type IconButtonProps } from "./icon-button.js";
import { SimpleTooltip } from "./tooltip.js";

export type ToolbarProps = React.HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
};

export function Toolbar({
  className,
  orientation = "horizontal",
  children,
  ...props
}: ToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-orientation={orientation}
      className={cn(
        "flex items-center gap-1 p-1 rounded-md border border-border-default bg-surface-sunken/80 backdrop-blur-md",
        orientation === "vertical" ? "flex-col" : "flex-row",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type ToolbarButtonProps = IconButtonProps & {
  tooltip?: string;
  label?: string;
};

export const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ tooltip, label, "aria-label": ariaLabel, ...props }, ref) => {
    const accessibleName = ariaLabel || label || tooltip || "Toolbar action";
    const button = (
      <IconButton
        ref={ref}
        size="sm"
        aria-label={accessibleName}
        title={tooltip || label}
        {...props}
      />
    );

    if (tooltip) {
      return <SimpleTooltip content={tooltip}>{button}</SimpleTooltip>;
    }
    return button;
  }
);
ToolbarButton.displayName = "ToolbarButton";
