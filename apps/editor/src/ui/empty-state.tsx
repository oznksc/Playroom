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
        "flex flex-col items-center justify-center gap-2.5 px-4 py-10 text-center",
        className
      )}
    >
      {icon && (
        <div className="flex size-10 items-center justify-center rounded-[12px] border border-white/[0.08] bg-white/[0.05] text-[rgba(235,235,245,0.45)] [&_svg]:size-4">
          {icon}
        </div>
      )}
      {title && (
        <p className="m-0 text-[13px] font-semibold tracking-[-0.015em] text-[rgba(245,245,247,0.85)]">
          {title}
        </p>
      )}
      {description && (
        <p className="m-0 max-w-[240px] text-[12px] leading-relaxed tracking-[-0.01em] text-[rgba(235,235,245,0.4)]">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
