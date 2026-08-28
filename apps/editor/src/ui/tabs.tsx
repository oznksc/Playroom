import * as React from "react";
import { cn } from "./cn";

export type TabVariant = "segmented" | "underline" | "cards";
export type TabSize = "xs" | "sm" | "md";

type TabsContextValue = {
  value: string;
  onValueChange?: (value: string) => void;
  variant: TabVariant;
  size: TabSize;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  return React.useContext(TabsContext);
}

export type TabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  variant?: TabVariant;
  size?: TabSize;
  children: React.ReactNode;
  className?: string;
};

export function Tabs({
  value,
  onValueChange,
  variant = "segmented",
  size = "sm",
  children,
  className,
}: TabsProps) {
  const contextValue = React.useMemo(
    () => ({ value, onValueChange, variant, size }),
    [value, onValueChange, variant, size]
  );
  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn("flex flex-col", className)} data-tabs-value={value} data-variant={variant}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export type TabsListProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: TabVariant;
  size?: TabSize;
};

/** Segmented glass control or underline tab strip */
export function TabsList({ className, variant: variantProp, size: sizeProp, children, ...props }: TabsListProps) {
  const ctx = useTabsContext();
  const variant = variantProp ?? ctx?.variant ?? "segmented";
  const size = sizeProp ?? ctx?.size ?? "sm";

  const listVariantStyles = {
    segmented: "flex shrink-0 items-center gap-0.5 rounded-[12px] border border-white/[0.06] bg-white/[0.04] p-0.5",
    underline: "flex shrink-0 items-center gap-1 border-b border-border-default px-1",
    cards: "flex shrink-0 items-center gap-1 border-b border-border-default px-2",
  }[variant];

  return (
    <div
      role="tablist"
      data-variant={variant}
      data-size={size}
      className={cn(listVariantStyles, className)}
      {...props}
    >
      {children}
    </div>
  );
}

export type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode | number | string;
};

export function TabsTrigger({
  value,
  icon,
  badge,
  className,
  children,
  onClick,
  ...props
}: TabsTriggerProps) {
  const ctx = useTabsContext();
  const active = ctx?.value === value;
  const variant = ctx?.variant ?? "segmented";
  const size = ctx?.size ?? "sm";

  const sizeStyles = {
    segmented: {
      xs: "h-6 rounded-[8px] px-2 text-[10px] gap-1",
      sm: "h-7 rounded-[10px] px-2.5 text-[11px] gap-1.5",
      md: "h-8.5 rounded-[11px] px-3.5 text-[12px] gap-2",
    }[size],
    underline: {
      xs: "h-6 text-[10px] px-2 gap-1 pb-1 pt-0.5",
      sm: "h-7 text-[11px] px-2.5 gap-1.5 pb-1.5 pt-1",
      md: "h-8.5 text-[12px] px-3.5 gap-2 pb-2 pt-1.5",
    }[size],
    cards: {
      xs: "h-6 text-[10px] px-2 gap-1 rounded-t-[6px]",
      sm: "h-7 text-[11px] px-2.5 gap-1.5 rounded-t-[8px]",
      md: "h-8.5 text-[12px] px-3.5 gap-2 rounded-t-[10px]",
    }[size],
  }[variant];

  const variantStyles = {
    segmented: cn(
      "relative flex-1 inline-flex items-center justify-center font-semibold tracking-[-0.01em] select-none transition-[color,background,box-shadow,transform] duration-150 active:scale-[0.97]",
      "text-[rgba(235,235,245,0.55)] hover:text-[rgba(245,245,247,0.9)] hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
      active &&
        "bg-white/[0.1] text-accent shadow-[inset_0_0_0_0.5px_rgba(0,240,255,0.25),0_0_12px_rgba(0,240,255,0.12)]"
    ),
    underline: cn(
      "relative inline-flex items-center justify-center font-medium select-none border-b-2 transition-[color,border-color] duration-150",
      "border-transparent text-text-muted hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
      active && "border-accent text-accent font-semibold"
    ),
    cards: cn(
      "relative inline-flex items-center justify-center font-medium select-none border transition-[color,background,border-color] duration-150",
      "border-transparent text-text-muted hover:text-text-secondary hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
      active && "bg-surface-raised border-border-default border-b-transparent text-accent font-semibold"
    ),
  }[variant];

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
      className={cn(sizeStyles, variantStyles, className)}
      {...props}
    >
      {icon && (
        <span className="shrink-0 inline-flex items-center" aria-hidden>
          {icon}
        </span>
      )}
      <span className="truncate">{children}</span>
      {badge !== undefined && (
        <span
          className={cn(
            "ml-0.5 rounded-full px-1.5 py-0 text-[8px] font-mono",
            active
              ? "bg-accent/20 text-accent font-semibold"
              : "bg-white/[0.08] text-text-muted"
          )}
        >
          {badge}
        </span>
      )}
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
    <div
      role="tabpanel"
      className={cn(
        "min-h-0 flex-1 animate-[drawer-tab-in_220ms_cubic-bezier(0.16,1,0.3,1)_forwards]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
