import type { RigidBodyComponent } from "@gamekit/schema";
import { Box } from "lucide-react";
import { NumberField, AccordionSection } from "@/ui";
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
            <NumberField label="Vel X" value={rigidBody.velocity.x}
              onChange={(value) => onChange((draft) => { findComponent<RigidBodyComponent>(draft, "RigidBody")!.velocity.x = value; })}
            />
            <NumberField label="Vel Y" value={rigidBody.velocity.y}
              onChange={(value) => onChange((draft) => { findComponent<RigidBodyComponent>(draft, "RigidBody")!.velocity.y = value; })}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField label="Mass" value={rigidBody.mass}
              onChange={(value) => onChange((draft) => { findComponent<RigidBodyComponent>(draft, "RigidBody")!.mass = value; })}
            />
            <NumberField label="Ang Vel" value={rigidBody.angularVelocity}
              onChange={(value) => onChange((draft) => { findComponent<RigidBodyComponent>(draft, "RigidBody")!.angularVelocity = value; })}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField label="Drag" value={rigidBody.drag}
              onChange={(value) => onChange((draft) => { findComponent<RigidBodyComponent>(draft, "RigidBody")!.drag = value; })}
            />
            <NumberField label="Gravity Scale" value={rigidBody.gravityScale}
              onChange={(value) => onChange((draft) => { findComponent<RigidBodyComponent>(draft, "RigidBody")!.gravityScale = value; })}
            />
          </div>
          <div className="flex items-center gap-2 py-0.5 text-[11px] text-text-secondary">
            <input id="rigid-body-kinematic-check" type="checkbox" className="size-3.5 accent-accent"
              checked={rigidBody.isKinematic}
              onChange={(event) => onChange((draft) => { findComponent<RigidBodyComponent>(draft, "RigidBody")!.isKinematic = event.target.checked; })}
            />
            <label htmlFor="rigid-body-kinematic-check">Is Kinematic</label>
          </div>
          <div className="flex items-center gap-2 py-0.5 text-[11px] text-text-secondary">
            <input id="rigid-body-gravity-check" type="checkbox" className="size-3.5 accent-accent"
              checked={rigidBody.useGravity}
              onChange={(event) => onChange((draft) => { findComponent<RigidBodyComponent>(draft, "RigidBody")!.useGravity = event.target.checked; })}
            />
            <label htmlFor="rigid-body-gravity-check">Use Gravity</label>
          </div>
        </>
      ) : (
        <p className="text-center text-[10px] text-text-muted">No RigidBody attached</p>
      )}
    </AccordionSection>
  );
}
