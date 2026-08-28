import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import { cn } from "./cn.js";

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
export const ContextMenuPortal = ContextMenuPrimitive.Portal;
export const ContextMenuGroup = ContextMenuPrimitive.Group;
export const ContextMenuSub = ContextMenuPrimitive.Sub;
export const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

const glassMenu =
  "z-50 min-w-[168px] overflow-hidden rounded-md border border-border-default bg-[rgba(22,22,24,0.94)] p-1.5 text-xs text-text-primary shadow-glass backdrop-blur-[20px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95";

export const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <ContextMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2.5 py-1.5 text-xs tracking-[-0.01em] outline-none",
      "data-[highlighted]:bg-white/[0.08] data-[state=open]:bg-white/[0.08]",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight size={12} className="ml-auto text-text-muted" />
  </ContextMenuPrimitive.SubTrigger>
));
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName;

export const ContextMenuSubContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.SubContent ref={ref} className={cn(glassMenu, className)} {...props} />
));
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName;

export const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content ref={ref} className={cn(glassMenu, className)} {...props} />
  </ContextMenuPrimitive.Portal>
));
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;

export const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
    danger?: boolean;
    inset?: boolean;
  }
>(({ className, danger, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2.5 py-1.5 outline-none tracking-[-0.01em] text-xs",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      "data-[highlighted]:bg-white/[0.08]",
      danger
        ? "text-error data-[highlighted]:bg-error/12 data-[highlighted]:text-error"
        : "text-text-primary",
      inset && "pl-8",
      className
    )}
    {...props}
  />
));
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;

export const ContextMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <ContextMenuPrimitive.CheckboxItem
    ref={ref}
    checked={checked}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2.5 text-xs tracking-[-0.01em] text-text-primary outline-none",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      "data-[highlighted]:bg-white/[0.08]",
      className
    )}
    {...props}
  >
    <span className="absolute left-2.5 flex size-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <Check size={13} className="text-accent" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.CheckboxItem>
));
ContextMenuCheckboxItem.displayName = ContextMenuPrimitive.CheckboxItem.displayName;

export const ContextMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <ContextMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2.5 text-xs tracking-[-0.01em] text-text-primary outline-none",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      "data-[highlighted]:bg-white/[0.08]",
      className
    )}
    {...props}
  >
    <span className="absolute left-2.5 flex size-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <Circle className="size-2 fill-accent text-accent" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.RadioItem>
));
ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName;

export const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-0.5 my-1 h-px bg-border-default", className)}
    {...props}
  />
));
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;

export const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2.5 py-1 text-2xs font-semibold tracking-[-0.01em] text-text-muted uppercase",
      inset && "pl-8",
      className
    )}
    {...props}
  />
));
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName;

export function ContextMenuShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("ml-auto pl-4 font-mono text-2xs tracking-normal text-text-muted", className)}
      {...props}
    />
  );
}

export type LegacyContextMenuItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  onClick?: () => void;
};

export function LegacyContextMenu({
  items,
  children,
  fill = false,
}: {
  items: LegacyContextMenuItem[];
  children: React.ReactNode;
  fill?: boolean;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={fill ? "h-full w-full min-h-0 min-w-0" : "block w-full min-w-0"}
          {...(fill ? { "data-canvas-shell": true } : {})}
        >
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {items.map((item) =>
          item.separator ? (
            <ContextMenuSeparator key={item.id} />
          ) : (
            <ContextMenuItem
              key={item.id}
              disabled={item.disabled}
              danger={item.danger}
              onSelect={() => item.onClick?.()}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.shortcut && <ContextMenuShortcut>{item.shortcut}</ContextMenuShortcut>}
            </ContextMenuItem>
          )
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
