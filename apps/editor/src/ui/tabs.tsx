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
        "flex shrink-0 items-stretch gap-0 border-b border-border-default bg-bg-base",
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
        "relative h-8 px-3 text-2xs font-semibold uppercase tracking-[0.1em] text-text-muted transition-colors",
        "hover:text-text-secondary",
        active && "text-accent",
        active &&
          "after:absolute after:inset-x-2 after:top-0 after:h-0.5 after:rounded-b after:bg-accent after:content-['']",
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
