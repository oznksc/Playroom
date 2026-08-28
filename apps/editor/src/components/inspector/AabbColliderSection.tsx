import type { AabbColliderComponent } from "@gamekit/schema";
import { Box } from "lucide-react";
import { NumberField, AccordionSection, CheckboxField } from "@/ui";
import { findComponent } from "../../lib/components.js";
import type { OnChange } from "./types.js";

const MVP_SHOW_ADVANCED_PHYSICS = true;

type Props = {
  collider: AabbColliderComponent | undefined;
  onChange: OnChange;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

export function AabbColliderSection({ collider, onChange, open, onToggle, onRemove }: Props) {
  return (
    <AccordionSection
      icon={<Box size={12} />}
      label="Box Collider 2D"
      open={open}
      onToggle={onToggle}
      removable={!!collider}
      onRemove={onRemove}
    >
      {collider ? (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField
              label="Width"
              value={collider.size.x}
              onChange={(value) => onChange((draft) => {
                findComponent<AabbColliderComponent>(draft, "AabbCollider")!.size.x = value;
              })}
            />
            <NumberField
              label="Height"
              value={collider.size.y}
              onChange={(value) => onChange((draft) => {
                findComponent<AabbColliderComponent>(draft, "AabbCollider")!.size.y = value;
              })}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField
              label="Offset X"
              value={collider.offset.x}
              onChange={(value) => onChange((draft) => {
                findComponent<AabbColliderComponent>(draft, "AabbCollider")!.offset.x = value;
              })}
            />
            <NumberField
              label="Offset Y"
              value={collider.offset.y}
              onChange={(value) => onChange((draft) => {
                findComponent<AabbColliderComponent>(draft, "AabbCollider")!.offset.y = value;
              })}
            />
          </div>
          {MVP_SHOW_ADVANCED_PHYSICS && (
            <div className="grid grid-cols-2 gap-1.5">
              <NumberField
                label="Layer"
                value={collider.layer ?? 1}
                onChange={(value) => onChange((draft) => {
                  findComponent<AabbColliderComponent>(draft, "AabbCollider")!.layer = value;
                })}
              />
              <NumberField
                label="Mask"
                value={collider.mask ?? 1}
                onChange={(value) => onChange((draft) => {
                  findComponent<AabbColliderComponent>(draft, "AabbCollider")!.mask = value;
                })}
              />
            </div>
          )}
          <CheckboxField
            id="collider-static-check"
            label="Static collider"
            checked={collider.isStatic}
            onChange={(checked) => onChange((draft) => {
              findComponent<AabbColliderComponent>(draft, "AabbCollider")!.isStatic = checked;
            })}
          />
          <CheckboxField
            id="collider-trigger-check"
            label="Is Trigger (Overlap only)"
            checked={collider.isTrigger ?? false}
            onChange={(checked) => onChange((draft) => {
              findComponent<AabbColliderComponent>(draft, "AabbCollider")!.isTrigger = checked;
            })}
          />
        </>
      ) : (
        <p className="text-center text-[10px] text-text-muted">No Box Collider attached</p>
      )}
    </AccordionSection>
  );
}
