import * as React from "react";
import { cn } from "./cn.js";

export type EmptyStateProps = {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2.5 px-4 py-10 text-center",
        className
      )}
    >
      {icon && (
        <div className="flex size-10 items-center justify-center rounded-lg border border-border-default bg-white/[0.05] text-text-muted [&_svg]:size-4">
          {icon}
        </div>
      )}
      {title && (
        <p className="m-0 text-sm font-semibold tracking-[-0.015em] text-text-primary">{title}</p>
      )}
      {description && (
        <p className="m-0 max-w-[240px] text-xs leading-relaxed tracking-[-0.01em] text-text-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
