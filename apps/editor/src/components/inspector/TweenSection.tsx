import type { TweenComponent } from "@gamekit/schema";
import { Move } from "lucide-react";
import { NumberField, AccordionSection, Select, CheckboxField } from "@/ui";
import { findComponent } from "../../lib/components.js";
import type { OnChange } from "./types.js";

type Props = {
  tween: TweenComponent | undefined;
  onChange: OnChange;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

export function TweenSection({ tween, onChange, open, onToggle, onRemove }: Props) {
  return (
    <AccordionSection
      icon={<Move size={12} />}
      label="Tween Animation"
      open={open}
      onToggle={onToggle}
      removable={!!tween}
      onRemove={onRemove}
      accent="cyan"
    >
      {tween ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Property</span>
            <Select
              value={tween.property}
              onChange={(e) => onChange((d) => {
                findComponent<TweenComponent>(d, "Tween")!.property = e.target.value as TweenComponent["property"];
              })}
            >
              <option value="position.x">position.x</option>
              <option value="position.y">position.y</option>
              <option value="rotation">rotation</option>
              <option value="scale.x">scale.x</option>
              <option value="scale.y">scale.y</option>
            </Select>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField label="Start" value={tween.startValue}
              onChange={(v) => onChange((d) => { findComponent<TweenComponent>(d, "Tween")!.startValue = v; })}
            />
            <NumberField label="End" value={tween.endValue}
              onChange={(v) => onChange((d) => { findComponent<TweenComponent>(d, "Tween")!.endValue = v; })}
            />
            <NumberField label="Duration" value={tween.duration}
              onChange={(v) => onChange((d) => { findComponent<TweenComponent>(d, "Tween")!.duration = v; })}
            />
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Easing</span>
            <Select
              value={tween.easing}
              onChange={(e) => onChange((d) => {
                findComponent<TweenComponent>(d, "Tween")!.easing = e.target.value as TweenComponent["easing"];
              })}
            >
              <option value="linear">Linear</option>
              <option value="easeIn">Ease In</option>
              <option value="easeOut">Ease Out</option>
              <option value="easeInOut">Ease In Out</option>
            </Select>
          </label>
          <CheckboxField label="Loop" checked={tween.loop}
            onChange={(checked) => onChange((d) => { findComponent<TweenComponent>(d, "Tween")!.loop = checked; })}
          />
          <CheckboxField label="Ping pong" checked={tween.pingPong}
            onChange={(checked) => onChange((d) => { findComponent<TweenComponent>(d, "Tween")!.pingPong = checked; })}
          />
        </>
      ) : (
        <p className="text-center text-[10px] text-text-muted">No tween</p>
      )}
    </AccordionSection>
  );
}
