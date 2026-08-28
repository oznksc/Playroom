import type { RigidBodyComponent } from "@gamekit/schema";
import { Box } from "lucide-react";
import { NumberField, AccordionSection, CheckboxField } from "@/ui";
import { findComponent } from "../../lib/components.js";
import type { OnChange } from "./types.js";

type Props = {
  rigidBody: RigidBodyComponent | undefined;
  onChange: OnChange;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

export function RigidBodySection({ rigidBody, onChange, open, onToggle, onRemove }: Props) {
  return (
    <AccordionSection
      icon={<Box size={12} />}
      label="RigidBody 2D"
      open={open}
      onToggle={onToggle}
      removable={!!rigidBody}
      onRemove={onRemove}
    >
      {rigidBody ? (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField
              label="Vel X"
              value={rigidBody.velocity.x}
              onChange={(value) =>
                onChange((draft) => {
                  findComponent<RigidBodyComponent>(draft, "RigidBody")!.velocity.x = value;
                })
              }
            />
            <NumberField
              label="Vel Y"
              value={rigidBody.velocity.y}
              onChange={(value) =>
                onChange((draft) => {
                  findComponent<RigidBodyComponent>(draft, "RigidBody")!.velocity.y = value;
                })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField
              label="Mass"
              value={rigidBody.mass}
              onChange={(value) =>
                onChange((draft) => {
                  findComponent<RigidBodyComponent>(draft, "RigidBody")!.mass = value;
                })
              }
            />
            <NumberField
              label="Ang Vel"
              value={rigidBody.angularVelocity}
              onChange={(value) =>
                onChange((draft) => {
                  findComponent<RigidBodyComponent>(draft, "RigidBody")!.angularVelocity = value;
                })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField
              label="Drag"
              value={rigidBody.drag}
              onChange={(value) =>
                onChange((draft) => {
                  findComponent<RigidBodyComponent>(draft, "RigidBody")!.drag = value;
                })
              }
            />
            <NumberField
              label="Gravity Scale"
              value={rigidBody.gravityScale}
              onChange={(value) =>
                onChange((draft) => {
                  findComponent<RigidBodyComponent>(draft, "RigidBody")!.gravityScale = value;
                })
              }
            />
          </div>
          <CheckboxField
            id="rigid-body-kinematic-check"
            label="Is Kinematic"
            checked={rigidBody.isKinematic}
            onChange={(checked) => {
              onChange((draft) => {
                findComponent<RigidBodyComponent>(draft, "RigidBody")!.isKinematic = checked;
              });
            }}
          />
          <CheckboxField
            id="rigid-body-gravity-check"
            label="Use Gravity"
            checked={rigidBody.useGravity}
            onChange={(checked) => {
              onChange((draft) => {
                findComponent<RigidBodyComponent>(draft, "RigidBody")!.useGravity = checked;
              });
            }}
          />
        </>
      ) : (
        <p className="text-center text-[10px] text-text-muted">No RigidBody attached</p>
      )}
    </AccordionSection>
  );
}
