/**
 * Compatibility shim — prefer importing from `@/ui` for new code.
 * Keeps existing panel imports working.
 */
export {
  LegacyContextMenu as ContextMenu,
  type LegacyContextMenuItem as ContextMenuItem,
} from "@/ui";
