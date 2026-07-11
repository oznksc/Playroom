import * as React from "react";
import { cn } from "./cn";

export type TabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
};

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <div className={cn("flex flex-col", className)} data-tabs-value={value}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
          __tabsValue: value,
          __onTabsChange: onValueChange,
        });
      })}
    </div>
  );
}

export type TabsListProps = React.HTMLAttributes<HTMLDivElement> & {
  __tabsValue?: string;
  __onTabsChange?: (v: string) => void;
};

/** Segmented glass control — Apple tab strip */
export function TabsList({
  className,
  children,
  __tabsValue,
  __onTabsChange,
  ...props
}: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-[12px] border border-white/[0.06] bg-white/[0.04] p-0.5",
        className
      )}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
          __tabsValue,
          __onTabsChange,
        });
      })}
    </div>
  );
}

export type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
  __tabsValue?: string;
  __onTabsChange?: (v: string) => void;
};

export function TabsTrigger({
  value,
  className,
  children,
  __tabsValue,
  __onTabsChange,
  ...props
}: TabsTriggerProps) {
  const active = __tabsValue === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => __onTabsChange?.(value)}
      className={cn(
        "relative h-7 flex-1 rounded-[10px] px-3 text-[11px] font-semibold tracking-[-0.01em] transition-[color,background] duration-150",
        "text-[rgba(235,235,245,0.5)] hover:text-[rgba(245,245,247,0.85)]",
        active &&
          "bg-white/[0.1] text-accent shadow-[inset_0_0_0_0.5px_rgba(0,240,255,0.25)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string;
  __tabsValue?: string;
  __onTabsChange?: (v: string) => void;
};

export function TabsContent({
  value,
  className,
  children,
  __tabsValue,
  __onTabsChange: _,
  ...props
}: TabsContentProps) {
  if (__tabsValue !== value) return null;
  return (
    <div role="tabpanel" className={cn("min-h-0 flex-1", className)} {...props}>
      {children}
    </div>
  );
}
