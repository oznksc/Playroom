import type { CircleColliderComponent } from "@gamekit/schema";
import { Circle } from "lucide-react";
import { NumberField, AccordionSection, CheckboxField } from "@/ui";
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
          <CheckboxField
            id="circle-collider-static-check"
            label="Is Static (Rigid obstacle)"
            checked={circleCollider.isStatic}
            onChange={(checked) => onChange((draft) => {
              findComponent<CircleColliderComponent>(draft, "CircleCollider")!.isStatic = checked;
            })}
          />
          <CheckboxField
            id="circle-collider-trigger-check"
            label="Is Trigger (Overlap only)"
            checked={circleCollider.isTrigger}
            onChange={(checked) => onChange((draft) => {
              findComponent<CircleColliderComponent>(draft, "CircleCollider")!.isTrigger = checked;
            })}
          />
        </>
      ) : (
        <p className="text-center text-[10px] text-text-muted">No Circle Collider attached</p>
      )}
    </AccordionSection>
  );
}
