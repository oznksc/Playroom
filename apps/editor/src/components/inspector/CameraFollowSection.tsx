import type { CameraFollowComponent } from "@gamekit/schema";
import { Video } from "lucide-react";
import { NumberField, AccordionSection, Select } from "@/ui";
import { findComponent } from "../../lib/components.js";
import type { OnChange } from "./types.js";

type Props = {
  camera: CameraFollowComponent | undefined;
  entityIds: string[];
  currentEntityId: string | undefined;
  onChange: OnChange;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

export function CameraFollowSection({ camera, entityIds, currentEntityId, onChange, open, onToggle, onRemove }: Props) {
  return (
    <AccordionSection
      icon={<Video size={12} />}
      label="Camera Follow"
      open={open}
      onToggle={onToggle}
      removable={!!camera}
      onRemove={onRemove}
      accent="cyan"
    >
      {camera ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
              Follow target
            </span>
            <Select
              value={camera.targetId}
              onChange={(event) =>
                onChange((draft) => {
                  findComponent<CameraFollowComponent>(draft, "CameraFollow")!.targetId = event.target.value;
                })
              }
            >
              <option value="">— Viewport center —</option>
              {entityIds
                .filter((id) => id !== currentEntityId)
                .map((id) => (
                  <option key={id} value={id}>{id}</option>
                ))}
            </Select>
          </label>
          <NumberField
            label="Smoothing"
            value={camera.smoothing}
            onChange={(value) =>
              onChange((draft) => {
                findComponent<CameraFollowComponent>(draft, "CameraFollow")!.smoothing = value;
              })
            }
          />
        </>
      ) : (
        <p className="text-center text-[10px] text-text-muted">Camera targeting missing</p>
      )}
    </AccordionSection>
  );
}
