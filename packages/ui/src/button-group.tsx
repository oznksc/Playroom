import * as React from "react";
import { cn } from "./cn.js";

export type ButtonGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
  attached?: boolean;
  spacing?: "none" | "xs" | "sm" | "md";
};

export function ButtonGroup({
  className,
  orientation = "horizontal",
  attached = true,
  spacing = "none",
  children,
  ...props
}: ButtonGroupProps) {
  const isVertical = orientation === "vertical";

  const spacingClasses = {
    none: "",
    xs: isVertical ? "gap-1" : "gap-1",
    sm: isVertical ? "gap-1.5" : "gap-1.5",
    md: isVertical ? "gap-2" : "gap-2",
  }[spacing];

  const attachedClasses = attached
    ? isVertical
      ? "flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none [&>*:not(:first-child)]:-mt-px"
      : "flex-row [&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none [&>*:not(:first-child)]:-ml-px"
    : isVertical
      ? "flex-col"
      : "flex-row";

  return (
    <div
      role="group"
      className={cn(
        "inline-flex items-center",
        attachedClasses,
        spacingClasses,
        attached &&
          "[&>*]:relative [&>*:hover]:z-10 [&>*:focus-visible]:z-20 [&>*[data-active='true']]:z-10",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
