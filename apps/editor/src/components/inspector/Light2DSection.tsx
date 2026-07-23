import type { Light2DComponent } from "@gamekit/schema";
import { Sun } from "lucide-react";
import { NumberField, AccordionSection, Select, ColorField } from "@/ui";
import { findComponent } from "../../lib/components.js";
import type { OnChange } from "./types.js";

type Props = {
  light2D: Light2DComponent | undefined;
  onChange: OnChange;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

export function Light2DSection({ light2D, onChange, open, onToggle, onRemove }: Props) {
  return (
    <AccordionSection
      icon={<Sun size={12} />}
      label="Light 2D"
      open={open}
      onToggle={onToggle}
      removable={!!light2D}
      onRemove={onRemove}
    >
      {light2D ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Kind</span>
            <Select
              value={light2D.kind}
              onChange={(e) => onChange((d) => {
                findComponent<Light2DComponent>(d, "Light2D")!.kind = e.target.value as Light2DComponent["kind"];
              })}
            >
              <option value="point">Point</option>
              <option value="spot">Spot</option>
            </Select>
          </label>
          <NumberField label="Range" value={light2D.range}
            onChange={(v) => onChange((d) => { findComponent<Light2DComponent>(d, "Light2D")!.range = v; })}
          />
          <NumberField label="Intensity" value={light2D.intensity}
            onChange={(v) => onChange((d) => { findComponent<Light2DComponent>(d, "Light2D")!.intensity = v; })}
          />
          <ColorField label="Color" value={light2D.color}
            onChange={(v) => onChange((d) => { findComponent<Light2DComponent>(d, "Light2D")!.color = v; })}
          />
        </>
      ) : (
        <p className="text-center text-[10px] text-text-muted">No light component</p>
      )}
    </AccordionSection>
  );
}
