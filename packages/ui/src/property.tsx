import * as React from "react";
import { Info } from "lucide-react";
import { cn } from "./cn.js";
import { SimpleTooltip } from "./tooltip.js";

export type PropertyGroupProps = React.HTMLAttributes<HTMLDivElement> & { title: string };

export function PropertyGroup({ title, className, children, ...props }: PropertyGroupProps) {
  return (
    <section className={cn("border-b border-border-subtle py-2.5", className)} {...props}>
      <h3 className="mb-2 px-0.5 font-sans text-2xs font-semibold uppercase tracking-[0.08em] text-text-muted">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

export type PropertyRowProps = React.HTMLAttributes<HTMLDivElement> & {
  label: string;
  hint?: string;
};

export function PropertyRow({ label, hint, className, children, ...props }: PropertyRowProps) {
  return (
    <div
      className={cn(
        "grid min-h-7 grid-cols-[minmax(64px,0.75fr)_minmax(0,1.25fr)] items-center gap-2",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-1">
        <span className="truncate font-sans text-xs text-text-secondary">{label}</span>
        {hint && (
          <SimpleTooltip content={hint}>
            <Info aria-label={`${label} help`} size={11} className="shrink-0 text-text-muted" />
          </SimpleTooltip>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
