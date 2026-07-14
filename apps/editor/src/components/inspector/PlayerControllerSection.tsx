import type { PlayerControllerComponent } from "@gamekit/schema";
import { Gamepad2 } from "lucide-react";
import { NumberField, AccordionSection } from "@/ui";
import { findComponent } from "../../lib/components.js";
import type { OnChange } from "./types.js";

type Props = {
  player: PlayerControllerComponent | undefined;
  onChange: OnChange;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

export function PlayerControllerSection({ player, onChange, open, onToggle, onRemove }: Props) {
  return (
    <AccordionSection
      icon={<Gamepad2 size={12} />}
      label="Player Controller"
      open={open}
      onToggle={onToggle}
      removable={!!player}
      onRemove={onRemove}
      accent="gold"
    >
      {player ? (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField
              label="Speed"
              value={player.speed}
              onChange={(value) => onChange((draft) => {
                findComponent<PlayerControllerComponent>(draft, "PlayerController")!.speed = value;
              })}
            />
            <NumberField
              label="Jump Vel"
              value={player.jumpVelocity}
              onChange={(value) => onChange((draft) => {
                findComponent<PlayerControllerComponent>(draft, "PlayerController")!.jumpVelocity = value;
              })}
            />
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            <NumberField
              label="Gravity"
              value={player.gravity}
              onChange={(value) => onChange((draft) => {
                findComponent<PlayerControllerComponent>(draft, "PlayerController")!.gravity = value;
              })}
            />
          </div>
        </>
      ) : (
        <p className="text-center text-[10px] text-text-muted">Standard physics controller unassigned</p>
      )}
    </AccordionSection>
  );
}
