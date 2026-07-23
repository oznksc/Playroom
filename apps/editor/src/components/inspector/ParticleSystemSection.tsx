import type { ParticleSystemComponent } from "@gamekit/schema";
import { Sparkles } from "lucide-react";
import { NumberField, AccordionSection, Select, CheckboxField, ColorField } from "@/ui";
import { findComponent } from "../../lib/components.js";
import type { OnChange } from "./types.js";

type Props = {
  particleSystem: ParticleSystemComponent | undefined;
  onChange: OnChange;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

export function ParticleSystemSection({ particleSystem, onChange, open, onToggle, onRemove }: Props) {
  return (
    <AccordionSection
      icon={<Sparkles size={12} />}
      label="Particle System"
      open={open}
      onToggle={onToggle}
      removable={!!particleSystem}
      onRemove={onRemove}
    >
      {particleSystem ? (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField label="Max" value={particleSystem.maxParticles}
              onChange={(v) => onChange((d) => { findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.maxParticles = v; })}
            />
            <NumberField label="Rate" value={particleSystem.emissionRate}
              onChange={(v) => onChange((d) => { findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.emissionRate = v; })}
            />
            <NumberField label="Life" value={particleSystem.lifetime}
              onChange={(v) => onChange((d) => { findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.lifetime = v; })}
            />
            <NumberField label="Speed" value={particleSystem.speed}
              onChange={(v) => onChange((d) => { findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.speed = v; })}
            />
            <NumberField label="Gravity" value={particleSystem.gravityScale}
              onChange={(v) => onChange((d) => { findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.gravityScale = v; })}
            />
            <NumberField label="Size 0" value={particleSystem.sizeStart}
              onChange={(v) => onChange((d) => { findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.sizeStart = v; })}
            />
            <NumberField label="Size 1" value={particleSystem.sizeEnd}
              onChange={(v) => onChange((d) => { findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.sizeEnd = v; })}
            />
            <NumberField label="Box W" value={particleSystem.width}
              onChange={(v) => onChange((d) => { findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.width = v; })}
            />
            <NumberField label="Box H" value={particleSystem.height}
              onChange={(v) => onChange((d) => { findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.height = v; })}
            />
          </div>
          <ColorField label="Start" value={particleSystem.colorStart}
            onChange={(v) => onChange((d) => { findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.colorStart = v; })}
          />
          <ColorField label="End" value={particleSystem.colorEnd}
            onChange={(v) => onChange((d) => { findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.colorEnd = v; })}
          />
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Shape</span>
            <Select
              value={particleSystem.shape}
              onChange={(e) => onChange((d) => {
                findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.shape = e.target.value as ParticleSystemComponent["shape"];
              })}
            >
              <option value="point">Point</option>
              <option value="box">Box</option>
            </Select>
          </label>
          <CheckboxField label="Active" checked={particleSystem.active}
            onChange={(checked) => onChange((d) => { findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.active = checked; })}
          />
        </>
      ) : (
        <p className="text-center text-[10px] text-text-muted">No particle system</p>
      )}
    </AccordionSection>
  );
}
