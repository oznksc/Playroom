import logoUrl from "../../../../logo.png";
import { StatusDot, cn } from "@/ui";

type BrandCornerProps = {
  isDirty?: boolean;
  className?: string;
  onClick?: () => void;
};

/** Logo at bottom-left, tab-bar level. All actions live in the tab bar. */
export function BrandCorner({ isDirty, className, onClick }: BrandCornerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("brand-corner cursor-pointer hover:opacity-90 transition-opacity", className)}
      title="Playroom Studio — Open Project Hub"
    >
      <div className="brand-corner-logo">
        <img src={logoUrl} alt="Playroom" />
        {isDirty && (
          <StatusDot status="dirty" className="brand-corner-dirty" title="Unsaved changes" />
        )}
      </div>
    </button>
  );
}
