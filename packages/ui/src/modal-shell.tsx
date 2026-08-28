import * as React from "react";
import { X } from "lucide-react";
import { cn } from "./cn.js";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog.js";
import { IconButton } from "./icon-button.js";

export type ModalShellProps = React.ComponentPropsWithoutRef<typeof DialogContent> & {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  headerEnd?: React.ReactNode;
  footer?: React.ReactNode;
  bodyClassName?: string;
  footerClassName?: string;
  onClose?: () => void;
};

/** Standard modal anatomy: labelled header, scrollable body, and sticky footer. */
export function ModalShell({
  title,
  description,
  icon,
  headerEnd,
  footer,
  bodyClassName,
  footerClassName,
  onClose,
  className,
  children,
  ...props
}: ModalShellProps) {
  return (
    <DialogContent
      showClose={false}
      className={cn("flex max-h-[min(720px,calc(100vh-32px))] flex-col overflow-hidden", className)}
      {...props}
    >
      <DialogHeader className="shrink-0 px-4 py-3 pr-12">
        {icon && (
          <span className="flex size-7 items-center justify-center rounded-md bg-accent-muted text-signal-select">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <DialogTitle className="type-title">{title}</DialogTitle>
          {description && (
            <DialogDescription className="mt-0.5 type-micro">{description}</DialogDescription>
          )}
        </div>
        {headerEnd && <div className="ml-auto flex shrink-0 items-center">{headerEnd}</div>}
      </DialogHeader>
      {onClose && (
        <IconButton
          aria-label="Close"
          title="Close"
          size="sm"
          className="absolute right-2.5 top-3"
          onClick={onClose}
        >
          <X size={14} />
        </IconButton>
      )}
      <div className={cn("min-h-0 flex-1 overflow-y-auto px-4 py-3.5", bodyClassName)}>
        {children}
      </div>
      {footer && (
        <footer
          className={cn(
            "flex shrink-0 items-center justify-end gap-2 border-t border-border-subtle px-4 py-3",
            footerClassName
          )}
        >
          {footer}
        </footer>
      )}
    </DialogContent>
  );
}
