import type { AudioListenerComponent } from "@gamekit/schema";
import { Headphones } from "lucide-react";
import { AccordionSection, CheckboxField } from "@/ui";
import { findComponent } from "../../lib/components.js";
import type { OnChange } from "./types.js";

type Props = {
  audioListener: AudioListenerComponent | undefined;
  onChange: OnChange;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

export function AudioListenerSection({ audioListener, onChange, open, onToggle, onRemove }: Props) {
  return (
    <AccordionSection
      icon={<Headphones size={12} />}
      label="Audio Listener"
      open={open}
      onToggle={onToggle}
      removable={!!audioListener}
      onRemove={onRemove}
      accent="muted"
    >
      {audioListener ? (
        <CheckboxField
          label="Enabled"
          checked={audioListener.enabled}
          onChange={(checked) =>
            onChange((d) => {
              findComponent<AudioListenerComponent>(d, "AudioListener")!.enabled = checked;
            })
          }
        />
      ) : (
        <p className="text-center text-[10px] text-text-muted">No audio listener</p>
      )}
    </AccordionSection>
  );
}
