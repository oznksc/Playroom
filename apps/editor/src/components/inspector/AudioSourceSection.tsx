import type { AudioSourceComponent, GameKitAsset } from "@gamekit/schema";
import { Volume2 } from "lucide-react";
import { NumberField, AccordionSection, Select, CheckboxField } from "@/ui";
import { findComponent } from "../../lib/components.js";
import type { OnChange } from "./types.js";

type Props = {
  audioSource: AudioSourceComponent | undefined;
  assets: GameKitAsset[];
  onChange: OnChange;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

export function AudioSourceSection({ audioSource, assets, onChange, open, onToggle, onRemove }: Props) {
  return (
    <AccordionSection
      icon={<Volume2 size={12} />}
      label="Audio Source"
      open={open}
      onToggle={onToggle}
      removable={!!audioSource}
      onRemove={onRemove}
      accent="gold"
    >
      {audioSource ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Asset</span>
            <Select
              value={audioSource.assetId}
              onChange={(e) => onChange((d) => { findComponent<AudioSourceComponent>(d, "AudioSource")!.assetId = e.target.value; })}
            >
              <option value="">— Select —</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.id}</option>
              ))}
            </Select>
          </label>
          <NumberField
            label="Volume"
            value={audioSource.volume}
            onChange={(v) => onChange((d) => { findComponent<AudioSourceComponent>(d, "AudioSource")!.volume = v; })}
          />
          <CheckboxField
            label="Loop"
            checked={audioSource.loop}
            onChange={(checked) => onChange((d) => { findComponent<AudioSourceComponent>(d, "AudioSource")!.loop = checked; })}
          />
          <CheckboxField
            label="Play on start"
            checked={audioSource.playOnStart}
            onChange={(checked) => onChange((d) => { findComponent<AudioSourceComponent>(d, "AudioSource")!.playOnStart = checked; })}
          />
        </>
      ) : (
        <p className="text-center text-[10px] text-text-muted">No audio source</p>
      )}
    </AccordionSection>
  );
}
