import type { PolygonColliderComponent } from "@gamekit/schema";
import { Route } from "lucide-react";
import { NumberField, AccordionSection } from "@/ui";
import { findComponent } from "../../lib/components.js";
import type { OnChange } from "./types.js";

type Props = {
  polygonCollider: PolygonColliderComponent | undefined;
  onChange: OnChange;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

export function PolygonColliderSection({ polygonCollider, onChange, open, onToggle, onRemove }: Props) {
  return (
    <AccordionSection
      icon={<Route size={12} />}
      label="Polygon Collider 2D"
      open={open}
      onToggle={onToggle}
      removable={!!polygonCollider}
      onRemove={onRemove}
    >
      {polygonCollider ? (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField
              label="Offset X"
              value={polygonCollider.offset.x}
              onChange={(value) => onChange((draft) => {
                findComponent<PolygonColliderComponent>(draft, "PolygonCollider")!.offset.x = value;
              })}
            />
            <NumberField
              label="Offset Y"
              value={polygonCollider.offset.y}
              onChange={(value) => onChange((draft) => {
                findComponent<PolygonColliderComponent>(draft, "PolygonCollider")!.offset.y = value;
              })}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField
              label="Layer"
              value={polygonCollider.layer ?? 1}
              onChange={(value) => onChange((draft) => {
                findComponent<PolygonColliderComponent>(draft, "PolygonCollider")!.layer = value;
              })}
            />
            <NumberField
              label="Mask"
              value={polygonCollider.mask ?? 1}
              onChange={(value) => onChange((draft) => {
                findComponent<PolygonColliderComponent>(draft, "PolygonCollider")!.mask = value;
              })}
            />
          </div>
          <div className="flex items-center gap-2 py-0.5 text-[11px] text-text-secondary">
            <input
              id="polygon-collider-static-check"
              type="checkbox" className="size-3.5 accent-accent"
              checked={polygonCollider.isStatic}
              onChange={(event) => onChange((draft) => {
                findComponent<PolygonColliderComponent>(draft, "PolygonCollider")!.isStatic = event.target.checked;
              })}
            />
            <label htmlFor="polygon-collider-static-check">Is Static (Rigid obstacle)</label>
          </div>
          <div className="flex items-center gap-2 py-0.5 text-[11px] text-text-secondary">
            <input
              id="polygon-collider-trigger-check"
              type="checkbox" className="size-3.5 accent-accent"
              checked={polygonCollider.isTrigger ?? false}
              onChange={(event) => onChange((draft) => {
                findComponent<PolygonColliderComponent>(draft, "PolygonCollider")!.isTrigger = event.target.checked;
              })}
            />
            <label htmlFor="polygon-collider-trigger-check">Is Trigger (Overlap only)</label>
          </div>
          <div className="text-[10px] text-text-muted">
            {polygonCollider.points.length} point{polygonCollider.points.length !== 1 ? "s" : ""} — draw on canvas to edit
          </div>
        </>
      ) : (
        <p className="text-center text-[10px] text-text-muted">No Polygon Collider attached</p>
      )}
    </AccordionSection>
  );
}
