import * as React from "react";
import { cn } from "./cn";

export function Panel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex h-full min-w-0 flex-col overflow-hidden bg-transparent",
        className
      )}
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
        "flex h-10 shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] px-2.5",
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
        "m-0 flex items-center gap-1.5 text-[12px] font-semibold tracking-[-0.015em] text-[rgba(245,245,247,0.92)]",
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function PanelBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
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
        "mb-1.5 mt-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold tracking-[-0.01em] text-[rgba(235,235,245,0.45)] select-none first:mt-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
