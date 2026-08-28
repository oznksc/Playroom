import type { ReactNode } from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "@gamekit/ui";
import styles from "../AppTabBar.module.css";

export type GroupId = "project" | "tools" | "view" | "create" | "more";

/** A collapsible group button with a flyout panel above the tab bar. */
export function TabGroup({
  id,
  label,
  icon,
  open,
  active,
  onToggle,
  layout,
  align = "center",
  children,
}: {
  id: GroupId;
  label: string;
  icon: ReactNode;
  open: boolean;
  active: boolean;
  onToggle: () => void;
  layout: "row" | "column";
  align?: "center" | "end";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        styles["app-tabbar-group"],
        open && styles.open,
        active && styles["has-active"]
      )}
      data-group={id}
    >
      <button
        type="button"
        className={cn(
          styles["app-tabbar-item"],
          styles["app-tabbar-group-trigger"],
          open && styles.active
        )}
        onClick={onToggle}
        title={label}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className={styles["app-tabbar-icon"]}>{icon}</span>
        <span className={styles["app-tabbar-label"]}>
          {label}
          <ChevronUp
            size={8}
            strokeWidth={2.5}
            className={cn(styles["app-tabbar-chevron"], open && styles.open)}
            aria-hidden
          />
        </span>
      </button>
      {open && (
        <div
          className={cn(
            styles["app-tabbar-flyout"],
            layout === "column" && styles.column,
            align === "end" && styles["align-end"]
          )}
          role="menu"
          aria-label={label}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** A single clickable tab item used both at the top level and inside flyouts. */
export function TabItem({
  label,
  icon,
  active,
  onClick,
  tone,
  compact,
  row,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
  tone?: "success" | "error";
  compact?: boolean;
  /** Horizontal row layout for list-style flyouts */
  row?: boolean;
}) {
  return (
    <button
      type="button"
      role={compact ? "menuitem" : undefined}
      className={cn(
        styles["app-tabbar-item"],
        compact && styles.compact,
        row && styles.row,
        active && styles.active,
        tone === "success" && styles["tone-success"],
        tone === "error" && styles["tone-error"]
      )}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-current={active ? "true" : undefined}
    >
      <span className={styles["app-tabbar-icon"]}>{icon}</span>
      <span className={styles["app-tabbar-label"]}>{label}</span>
    </button>
  );
}
