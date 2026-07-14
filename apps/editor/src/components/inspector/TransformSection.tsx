import type { TransformComponent } from "@gamekit/schema";
import { Circle } from "lucide-react";
import { NumberField, AccordionSection } from "@/ui";
import { findComponent } from "../../lib/components.js";
import type { OnChange } from "./types.js";

type Props = {
  transform: TransformComponent;
  onChange: OnChange;
  open: boolean;
  onToggle: () => void;
};

export function TransformSection({ transform, onChange, open, onToggle }: Props) {
  return (
    <AccordionSection
      icon={<Circle size={12} />}
      label="Transform"
      open={open}
      onToggle={onToggle}
      accent="purple"
    >
      <div className="grid grid-cols-2 gap-1.5">
        <NumberField
          label="X"
          value={transform.position.x}
          onChange={(value) => onChange((draft) => {
            findComponent<TransformComponent>(draft, "Transform")!.position.x = value;
          })}
        />
        <NumberField
          label="Y"
          value={transform.position.y}
          onChange={(value) => onChange((draft) => {
            findComponent<TransformComponent>(draft, "Transform")!.position.y = value;
          })}
        />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <NumberField
          label="Scale X"
          value={transform.scale.x}
          onChange={(value) => onChange((draft) => {
            findComponent<TransformComponent>(draft, "Transform")!.scale.x = value;
          })}
        />
        <NumberField
          label="Scale Y"
          value={transform.scale.y}
          onChange={(value) => onChange((draft) => {
            findComponent<TransformComponent>(draft, "Transform")!.scale.y = value;
          })}
        />
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        <NumberField
          label="Rotation"
          value={transform.rotation}
          onChange={(value) => onChange((draft) => {
            findComponent<TransformComponent>(draft, "Transform")!.rotation = value;
          })}
        />
      </div>
    </AccordionSection>
  );
}
