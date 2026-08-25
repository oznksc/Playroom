import * as React from "react";
import { cn } from "./cn";

type TabsContextValue = {
  value: string;
  onValueChange?: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  return React.useContext(TabsContext);
}

export type TabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
};

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  const contextValue = React.useMemo(() => ({ value, onValueChange }), [value, onValueChange]);
  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn("flex flex-col", className)} data-tabs-value={value}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export type TabsListProps = React.HTMLAttributes<HTMLDivElement>;

/** Segmented glass control — Apple tab strip */
export function TabsList({ className, children, ...props }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-[12px] border border-white/[0.06] bg-white/[0.04] p-0.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

export function TabsTrigger({
  value,
  className,
  children,
  onClick,
  ...props
}: TabsTriggerProps) {
  const ctx = useTabsContext();
  const active = ctx?.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-state={active ? "active" : "inactive"}
      onClick={(e) => {
        onClick?.(e);
        ctx?.onValueChange?.(value);
      }}
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
};

export function TabsContent({
  value,
  className,
  children,
  ...props
}: TabsContentProps) {
  const ctx = useTabsContext();
  if (ctx?.value !== value) return null;

  return (
    <div role="tabpanel" className={cn("min-h-0 flex-1", className)} {...props}>
      {children}
    </div>
  );
}
