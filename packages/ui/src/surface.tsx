import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn.js";
import styles from "./surface.module.css";

type SurfaceElement = "aside" | "div" | "section";

export interface GlassSurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: SurfaceElement;
  children?: ReactNode;
  tone?: "regular" | "deep";
}

export function GlassSurface({
  as: Component = "div",
  children,
  className,
  tone = "regular",
  ...props
}: GlassSurfaceProps) {
  return (
    <Component
      className={cn(styles.glassSurface, styles[tone], className)}
      data-surface="glass"
      {...props}
    >
      {children}
    </Component>
  );
}

export interface FloatingSheetProps extends Omit<GlassSurfaceProps, "as"> {
  side: "left" | "right";
  open: boolean;
  expanded?: boolean;
}

export function FloatingSheet({
  children,
  className,
  expanded = false,
  open,
  side,
  ...props
}: FloatingSheetProps) {
  return (
    <GlassSurface
      as="aside"
      tone="deep"
      className={cn(
        styles.floatingSheet,
        styles[side],
        open && styles.open,
        expanded && styles.expanded,
        className
      )}
      data-state={open ? "open" : "closed"}
      aria-hidden={!open}
      {...props}
    >
      {children}
    </GlassSurface>
  );
}

export interface BottomDrawerProps extends Omit<GlassSurfaceProps, "as"> {
  open: boolean;
  size?: "default" | "studio";
}

export function BottomDrawer({
  children,
  className,
  open,
  size = "default",
  ...props
}: BottomDrawerProps) {
  return (
    <GlassSurface
      as="section"
      tone="deep"
      className={cn(
        styles.bottomDrawer,
        open && styles.open,
        size === "studio" && styles.studio,
        className
      )}
      data-state={open ? "open" : "closed"}
      aria-hidden={!open}
      {...props}
    >
      {children}
    </GlassSurface>
  );
}
