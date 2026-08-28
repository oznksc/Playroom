import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "./cn.js";
import { IconButton } from "./icon-button.js";

export const Accordion = AccordionPrimitive.Root;

export const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn(
      "overflow-hidden rounded-md border border-border-subtle bg-white/[0.03] data-[state=open]:border-border-default data-[state=open]:bg-white/[0.045]",
      className
    )}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

export const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> & {
    icon?: React.ReactNode;
  }
>(({ className, children, icon, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between gap-2 px-2.5 py-2 text-left text-sm font-medium tracking-[-0.01em] text-text-primary outline-none transition-all duration-150 hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-accent/30 [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      <span className="flex items-center gap-1.5 min-w-0">
        {icon && <span className="shrink-0 text-text-muted [&_svg]:size-3">{icon}</span>}
        <span className="truncate">{children}</span>
      </span>
      <ChevronDown
        size={12}
        className="shrink-0 text-text-muted transition-transform duration-200"
      />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

export const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      "overflow-hidden text-sm border-t border-border-subtle p-2 transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
      className
    )}
    {...props}
  >
    {children}
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export type AccordionSectionProps = {
  icon?: React.ReactNode;
  label: string;
  open: boolean;
  onToggle: () => void;
  removable?: boolean;
  onRemove?: () => void;
  children?: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  staticHeader?: boolean;
};

export function AccordionSection({
  icon,
  label,
  open,
  onToggle,
  removable,
  onRemove,
  children,
  className,
  actions,
  staticHeader = false,
}: AccordionSectionProps) {
  return (
    <div
      className={cn(
        "mb-1.5 overflow-hidden rounded-md border border-border-subtle bg-white/[0.03]",
        open && "bg-white/[0.045] border-border-default",
        className
      )}
    >
      <div className="flex h-9 items-center gap-0.5 px-1">
        <button
          type="button"
          onClick={staticHeader ? undefined : onToggle}
          disabled={staticHeader}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 rounded-sm px-1.5 py-1 text-left text-sm font-medium tracking-[-0.01em] text-text-primary",
            !staticHeader && "hover:bg-white/[0.06]",
            staticHeader && "cursor-default disabled:opacity-100"
          )}
        >
          {!staticHeader &&
            (open ? (
              <ChevronDown size={12} className="shrink-0 text-text-muted" />
            ) : (
              <ChevronRight size={12} className="shrink-0 text-text-muted" />
            ))}
          {icon && <span className="shrink-0 text-text-muted [&_svg]:size-3">{icon}</span>}
          <span className="truncate">{label}</span>
        </button>
        <span className="flex shrink-0 items-center gap-0.5 pr-0.5">
          {actions}
          {removable && onRemove && (
            <IconButton
              size="xs"
              variant="danger"
              title={`Remove ${label}`}
              aria-label={`Remove ${label}`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <span className="text-2xs leading-none">−</span>
            </IconButton>
          )}
        </span>
      </div>
      {open && (
        <div className="flex flex-col gap-1.5 border-t border-border-subtle p-2">{children}</div>
      )}
    </div>
  );
}
