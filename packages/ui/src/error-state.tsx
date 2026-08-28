import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "./cn.js";
import { Button } from "./button.js";

export type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  compact?: boolean;
  className?: string;
};

export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel = "Retry",
  compact = false,
  className,
}: ErrorStateProps) {
  if (compact) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className={cn(
          "flex items-center justify-between gap-2 rounded-md border border-error/30 bg-error/10 px-3 py-2 text-xs text-error",
          className
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <AlertCircle size={13} className="shrink-0 text-error" aria-hidden="true" />
          <span className="truncate">{message}</span>
        </div>
        {onRetry && (
          <Button
            size="xs"
            variant="danger"
            onClick={onRetry}
            leftIcon={<RefreshCw size={10} />}
            className="shrink-0"
          >
            {retryLabel}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex flex-col items-center justify-center gap-2.5 p-6 text-center select-none rounded-lg border border-error/25 bg-error/5",
        className
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-lg border border-error/30 bg-error/15 text-error">
        <AlertCircle size={20} aria-hidden="true" />
      </div>
      {title && <h4 className="m-0 text-sm font-semibold text-text-primary">{title}</h4>}
      <p className="m-0 max-w-sm text-xs leading-relaxed text-text-secondary">{message}</p>
      {onRetry && (
        <Button
          size="sm"
          variant="secondary"
          onClick={onRetry}
          leftIcon={<RefreshCw size={12} />}
          className="mt-2 border-error/30 hover:border-error/50 hover:bg-error/15 text-error"
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
