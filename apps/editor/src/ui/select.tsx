import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "./cn";

export const SelectRoot = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    size?: "xs" | "sm" | "md";
  }
>(({ className, size = "sm", children, ...props }, ref) => {
  const sizeClasses = {
    xs: "h-6 px-2 text-[10px] rounded-[8px]",
    sm: "h-7 px-2.5 text-[11px] rounded-[9px]",
    md: "h-8 px-3 text-[12px] rounded-[10px]",
  }[size];

  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex w-full items-center justify-between gap-2 border border-white/[0.08] bg-black/30 font-medium tracking-[-0.01em] text-[rgba(245,245,247,0.92)] outline-none select-none",
        "transition-[border-color,box-shadow,background] duration-150",
        "hover:border-white/[0.12] hover:bg-black/35",
        "focus:border-accent/50 focus:bg-black/40 focus:shadow-[0_0_0_3px_rgba(0,240,255,0.12)]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "[&>span]:line-clamp-1",
        sizeClasses,
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown size={12} className="shrink-0 text-[rgba(235,235,245,0.45)]" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

export const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1 text-[rgba(235,235,245,0.5)]", className)}
    {...props}
  >
    <ChevronUp size={12} />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

export const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1 text-[rgba(235,235,245,0.5)]", className)}
    {...props}
  >
    <ChevronDown size={12} />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", sideOffset = 4, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      sideOffset={sideOffset}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-[12px] border border-white/[0.08] bg-[rgba(18,20,24,0.95)] p-1 text-[rgba(245,245,247,0.92)] shadow-[0_12px_36px_rgba(0,0,0,0.55),0_0_0_0.5px_rgba(255,255,255,0.06),inset_0_0.5px_0_rgba(255,255,255,0.08)] backdrop-blur-[20px] backdrop-saturate-150",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-0.5",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

export const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1 text-[10px] font-semibold tracking-[-0.01em] text-[rgba(235,235,245,0.4)]", className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-[8px] py-1.5 pl-2 pr-7 text-[12px] tracking-[-0.01em] text-[rgba(245,245,247,0.9)] outline-none",
      "transition-colors duration-100",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      "data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-white",
      "data-[state=checked]:font-semibold data-[state=checked]:text-accent",
      className
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <span className="absolute right-2 flex size-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check size={13} className="text-accent" />
      </SelectPrimitive.ItemIndicator>
    </span>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

export const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-white/[0.08]", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

// ==========================================
// Native & Convenience Wrappers
// ==========================================

export type NativeSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

/** Native select — glass chip style matching Apple dock language. */
export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-8 w-full appearance-none rounded-[10px] border border-white/[0.08] bg-black/30 bg-[length:12px] bg-[right_8px_center] bg-no-repeat px-2.5 pr-7 text-[12px] tracking-[-0.01em] text-[rgba(245,245,247,0.9)] outline-none",
        "transition-[border-color,box-shadow,background] duration-150",
        "bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23ebebf599%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E')]",
        "hover:border-white/[0.12] hover:bg-black/35",
        "focus:border-accent/50 focus:shadow-[0_0_0_3px_rgba(0,240,255,0.12)]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
NativeSelect.displayName = "NativeSelect";

export type SimpleSelectOption = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

export type SimpleSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SimpleSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  size?: "xs" | "sm" | "md";
  className?: string;
};

/** High-level Radix Select helper component */
export function SimpleSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  disabled,
  size = "sm",
  className,
}: SimpleSelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger size={size} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectPrimitive.Root>
  );
}

export type SelectProps =
  | ({
      children?: React.ReactNode;
      value?: string;
      defaultValue?: string;
      onValueChange?: (value: string) => void;
      open?: boolean;
      defaultOpen?: boolean;
      onOpenChange?: (open: boolean) => void;
      dir?: "ltr" | "rtl";
      name?: string;
      autoComplete?: string;
      disabled?: boolean;
      required?: boolean;
      onChange?: never;
      className?: never;
    })
  | (React.SelectHTMLAttributes<HTMLSelectElement> & {
      onValueChange?: never;
    });

type SelectComponent = React.ForwardRefExoticComponent<SelectProps & React.RefAttributes<any>> & {
  Root: typeof SelectPrimitive.Root;
  Group: typeof SelectPrimitive.Group;
  Value: typeof SelectPrimitive.Value;
  Trigger: typeof SelectTrigger;
  Content: typeof SelectContent;
  Label: typeof SelectLabel;
  Item: typeof SelectItem;
  Separator: typeof SelectSeparator;
  ScrollUpButton: typeof SelectScrollUpButton;
  ScrollDownButton: typeof SelectScrollDownButton;
};

/**
 * Universal Select component.
 * Supports both Radix Select composition and standard styled native <select> options.
 */
export const Select = React.forwardRef<any, SelectProps>((props, ref) => {
  if ("onValueChange" in props || ("value" in props && !("onChange" in props) && !("className" in props))) {
    return <SelectPrimitive.Root {...(props as any)} />;
  }
  return <NativeSelect ref={ref} {...(props as any)} />;
}) as unknown as SelectComponent;

Select.displayName = "Select";
Select.Root = SelectPrimitive.Root;
Select.Group = SelectPrimitive.Group;
Select.Value = SelectPrimitive.Value;
Select.Trigger = SelectTrigger;
Select.Content = SelectContent;
Select.Label = SelectLabel;
Select.Item = SelectItem;
Select.Separator = SelectSeparator;
Select.ScrollUpButton = SelectScrollUpButton;
Select.ScrollDownButton = SelectScrollDownButton;
