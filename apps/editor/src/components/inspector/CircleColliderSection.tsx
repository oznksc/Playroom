import type { CircleColliderComponent } from "@gamekit/schema";
import { Circle } from "lucide-react";
import { NumberField, AccordionSection } from "@/ui";
import { findComponent } from "../../lib/components.js";
import type { OnChange } from "./types.js";

type Props = {
  circleCollider: CircleColliderComponent | undefined;
  onChange: OnChange;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

export function CircleColliderSection({ circleCollider, onChange, open, onToggle, onRemove }: Props) {
  return (
    <AccordionSection
      icon={<Circle size={12} />}
      label="Circle Collider 2D"
      open={open}
      onToggle={onToggle}
      removable={!!circleCollider}
      onRemove={onRemove}
      accent="green"
    >
      {circleCollider ? (
        <>
          <div className="grid grid-cols-1 gap-1.5">
            <NumberField
              label="Radius"
              value={circleCollider.radius}
              onChange={(value) => onChange((draft) => {
                findComponent<CircleColliderComponent>(draft, "CircleCollider")!.radius = value;
              })}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField
              label="Offset X"
              value={circleCollider.offset.x}
              onChange={(value) => onChange((draft) => {
                findComponent<CircleColliderComponent>(draft, "CircleCollider")!.offset.x = value;
              })}
            />
            <NumberField
              label="Offset Y"
              value={circleCollider.offset.y}
              onChange={(value) => onChange((draft) => {
                findComponent<CircleColliderComponent>(draft, "CircleCollider")!.offset.y = value;
              })}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField
              label="Layer"
              value={circleCollider.layer ?? 1}
              onChange={(value) => onChange((draft) => {
                findComponent<CircleColliderComponent>(draft, "CircleCollider")!.layer = value;
              })}
            />
            <NumberField
              label="Mask"
              value={circleCollider.mask ?? 1}
              onChange={(value) => onChange((draft) => {
                findComponent<CircleColliderComponent>(draft, "CircleCollider")!.mask = value;
              })}
            />
          </div>
          <div className="flex items-center gap-2 py-0.5 text-[11px] text-text-secondary">
            <input
              id="circle-collider-static-check"
              type="checkbox" className="size-3.5 accent-accent"
              checked={circleCollider.isStatic}
              onChange={(event) => onChange((draft) => {
                findComponent<CircleColliderComponent>(draft, "CircleCollider")!.isStatic = event.target.checked;
              })}
            />
            <label htmlFor="circle-collider-static-check">Is Static (Rigid obstacle)</label>
          </div>
          <div className="flex items-center gap-2 py-0.5 text-[11px] text-text-secondary">
            <input
              id="circle-collider-trigger-check"
              type="checkbox" className="size-3.5 accent-accent"
              checked={circleCollider.isTrigger}
              onChange={(event) => onChange((draft) => {
                findComponent<CircleColliderComponent>(draft, "CircleCollider")!.isTrigger = event.target.checked;
              })}
            />
            <label htmlFor="circle-collider-trigger-check">Is Trigger (Overlap only)</label>
          </div>
        </>
      ) : (
        <p className="text-center text-[10px] text-text-muted">No Circle Collider attached</p>
      )}
    </AccordionSection>
  );
}
