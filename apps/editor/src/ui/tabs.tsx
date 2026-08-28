import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "./cn";

export type TabVariant = "segmented" | "underline" | "cards";
export type TabSize = "xs" | "sm" | "md";

type TabsContextValue = {
  value?: string;
  onValueChange?: (value: string) => void;
  variant: TabVariant;
  size: TabSize;
};

const TabsStyleContext = React.createContext<TabsContextValue>({
  variant: "segmented",
  size: "sm",
});

export type TabsProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & {
  variant?: TabVariant;
  size?: TabSize;
};

export const Tabs = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  TabsProps
>(({ className, value, onValueChange, variant = "segmented", size = "sm", ...props }, ref) => (
  <TabsStyleContext.Provider value={{ value, onValueChange, variant, size }}>
    <TabsPrimitive.Root
      ref={ref}
      value={value}
      onValueChange={onValueChange}
      className={cn("flex flex-col", className)}
      data-variant={variant}
      data-size={size}
      {...props}
    />
  </TabsStyleContext.Provider>
));
Tabs.displayName = TabsPrimitive.Root.displayName;

export type TabsListProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
  variant?: TabVariant;
  size?: TabSize;
};

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, variant: variantProp, size: sizeProp, ...props }, ref) => {
  const ctx = React.useContext(TabsStyleContext);
  const variant = variantProp ?? ctx.variant;
  const size = sizeProp ?? ctx.size;

  const listVariantStyles = {
    segmented:
      "flex shrink-0 items-center gap-0.5 rounded-[12px] border border-white/[0.06] bg-white/[0.04] p-0.5",
    underline: "flex shrink-0 items-center gap-1 border-b border-border-default px-1",
    cards: "flex shrink-0 items-center gap-1 border-b border-border-default px-2",
  }[variant];

  return (
    <TabsPrimitive.List
      ref={ref}
      data-variant={variant}
      data-size={size}
      className={cn(listVariantStyles, className)}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

export type TabsTriggerProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
  icon?: React.ReactNode;
  badge?: React.ReactNode | number | string;
};

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, icon, badge, children, onClick, ...props }, ref) => {
  const ctx = React.useContext(TabsStyleContext);
  const variant = ctx.variant;
  const size = ctx.size;

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
      "data-[state=active]:bg-white/[0.1] data-[state=active]:text-accent data-[state=active]:shadow-[inset_0_0_0_0.5px_rgba(0,240,255,0.25),0_0_12px_rgba(0,240,255,0.12)]"
    ),
    underline: cn(
      "relative inline-flex items-center justify-center font-medium select-none border-b-2 transition-[color,border-color] duration-150",
      "border-transparent text-text-muted hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
      "data-[state=active]:border-accent data-[state=active]:text-accent data-[state=active]:font-semibold"
    ),
    cards: cn(
      "relative inline-flex items-center justify-center font-medium select-none border transition-[color,background,border-color] duration-150",
      "border-transparent text-text-muted hover:text-text-secondary hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
      "data-[state=active]:bg-surface-raised data-[state=active]:border-border-default data-[state=active]:border-b-transparent data-[state=active]:text-accent data-[state=active]:font-semibold"
    ),
  }[variant];

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(sizeStyles, variantStyles, className)}
      onClick={(e) => {
        onClick?.(e);
        if (props.value && ctx.onValueChange && ctx.value !== props.value) {
          ctx.onValueChange(props.value);
        }
      }}
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
          className="ml-0.5 rounded-full px-1.5 py-0 text-[8px] font-mono bg-white/[0.08] text-text-muted group-data-[state=active]:bg-accent/20 group-data-[state=active]:text-accent group-data-[state=active]:font-semibold"
        >
          {badge}
        </span>
      )}
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export type TabsContentProps = React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  TabsContentProps
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "min-h-0 flex-1 outline-none animate-[drawer-tab-in_220ms_cubic-bezier(0.16,1,0.3,1)_forwards]",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;
