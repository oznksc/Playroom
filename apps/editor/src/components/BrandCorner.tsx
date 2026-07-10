import { Settings } from "lucide-react";
import logoUrl from "../../../../logo.png";
import { IconButton, StatusDot, cn } from "@/ui";

type BrandCornerProps = {
  isDirty?: boolean;
  onSettings: () => void;
  className?: string;
};

/** Minimal top-left brand: logo + settings only. */
export function BrandCorner({ isDirty, onSettings, className }: BrandCornerProps) {
  return (
    <div className={cn("brand-corner", className)}>
      <div className="brand-corner-logo" title="Playroom">
        <img src={logoUrl} alt="Playroom" />
        {isDirty && <StatusDot status="dirty" className="brand-corner-dirty" title="Unsaved changes" />}
      </div>
      <IconButton
        size="md"
        variant="ghost"
        className="brand-corner-settings"
        title="Settings"
        aria-label="Settings"
        onClick={onSettings}
      >
        <Settings size={16} strokeWidth={1.75} />
      </IconButton>
    </div>
  );
}
