import logoUrl from "../../../../logo.png";
import { StatusDot, cn } from "@/ui";

type BrandCornerProps = {
  isDirty?: boolean;
  className?: string;
};

/** Logo only — all actions live in the bottom tab bar. */
export function BrandCorner({ isDirty, className }: BrandCornerProps) {
  return (
    <div className={cn("brand-corner", className)} title="Playroom">
      <div className="brand-corner-logo">
        <img src={logoUrl} alt="Playroom" />
        {isDirty && (
          <StatusDot status="dirty" className="brand-corner-dirty" title="Unsaved changes" />
        )}
      </div>
    </div>
  );
}
