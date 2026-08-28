import { Loader2 } from "lucide-react";
import { cn } from "./cn.js";

export type LoadingStateProps = {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function LoadingState({ message = "Loading…", size = "md", className }: LoadingStateProps) {
  const iconSize = size === "sm" ? 14 : size === "lg" ? 24 : 18;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-2 p-6 text-center select-none",
        className
      )}
    >
      <Loader2 size={iconSize} className="animate-spin text-accent" aria-hidden="true" />
      {message && <span className="text-xs font-medium text-text-muted">{message}</span>}
    </div>
  );
}
