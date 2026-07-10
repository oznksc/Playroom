import * as React from "react";
import { cn } from "./cn";

export type EmptyStateProps = {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-4 py-8 text-center",
        className
      )}
    >
      {icon && (
        <div className="flex size-9 items-center justify-center rounded-md border border-border-default bg-bg-elevated text-text-muted [&_svg]:size-4">
          {icon}
        </div>
      )}
      {title && (
        <p className="m-0 text-sm font-medium tracking-[-0.01em] text-text-secondary">{title}</p>
      )}
      {description && (
        <p className="m-0 max-w-[220px] text-xs leading-relaxed text-text-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
