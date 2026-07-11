import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { cn } from "./cn";

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
export const ContextMenuPortal = ContextMenuPrimitive.Portal;
export const ContextMenuGroup = ContextMenuPrimitive.Group;
export const ContextMenuSub = ContextMenuPrimitive.Sub;
export const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

const glassMenu =
  "z-50 min-w-[168px] overflow-hidden rounded-[14px] border border-white/[0.08] bg-[rgba(22,22,24,0.92)] p-1.5 text-[12px] text-[rgba(245,245,247,0.92)] shadow-[0_10px_40px_rgba(0,0,0,0.5),0_0_0_0.5px_rgba(255,255,255,0.06),inset_0_0.5px_0_rgba(255,255,255,0.08)] backdrop-blur-[20px] backdrop-saturate-150";

export const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content
      ref={ref}
      className={cn(glassMenu, className)}
      {...props}
    />
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
      "relative flex cursor-default select-none items-center gap-2 rounded-[10px] px-2.5 py-1.5 outline-none tracking-[-0.01em]",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      "data-[highlighted]:bg-white/[0.08]",
      danger
        ? "text-error data-[highlighted]:bg-error/12"
        : "text-[rgba(245,245,247,0.9)]",
      inset && "pl-8",
      className
    )}
    {...props}
  />
));
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;

export const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-0.5 my-1 h-px bg-white/[0.08]", className)}
    {...props}
  />
));
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;

export const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2.5 py-1 text-[10px] font-semibold tracking-[-0.01em] text-[rgba(235,235,245,0.4)]",
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
      className={cn(
        "ml-auto pl-4 font-mono text-[10px] tracking-normal text-[rgba(235,235,245,0.4)]",
        className
      )}
      {...props}
    />
  );
}

/** Compatibility wrapper matching the old ContextMenu API used by panels */
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
  /** Fill parent (canvas viewport). Default is content-sized so list rows stay dense. */
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
          className={
            fill
              ? "h-full w-full min-h-0 min-w-0"
              : "block w-full min-w-0"
          }
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
