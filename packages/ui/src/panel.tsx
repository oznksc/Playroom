import * as React from "react";
import { cn } from "./cn.js";

export function Panel({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex h-full min-w-0 flex-col overflow-hidden bg-transparent", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border-subtle px-2.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type PanelTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

export function PanelTitle({ className, children, ...props }: PanelTitleProps) {
  return (
    <h3
      className={cn(
        "m-0 flex items-center gap-1.5 text-title font-semibold tracking-[-0.015em] text-text-primary",
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function PanelBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-auto p-2", className)} {...props}>
      {children}
    </div>
  );
}

export function PanelSectionTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mb-1.5 mt-2 flex items-center gap-1.5 px-1 text-ui font-semibold tracking-[-0.01em] text-text-muted select-none first:mt-0 uppercase",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
