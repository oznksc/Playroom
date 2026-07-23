import type { FollowPathComponent } from "@gamekit/schema";
import { Route } from "lucide-react";
import { NumberField, AccordionSection, CheckboxField, Button, Textarea } from "@/ui";
import { findComponent } from "../../lib/components.js";
import type { OnChange } from "./types.js";

type Props = {
  followPath: FollowPathComponent | undefined;
  onChange: OnChange;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

export function FollowPathSection({ followPath, onChange, open, onToggle, onRemove }: Props) {
  return (
    <AccordionSection
      icon={<Route size={12} />}
      label="Path Follower"
      open={open}
      onToggle={onToggle}
      removable={!!followPath}
      onRemove={onRemove}
    >
      {followPath ? (
        <>
          <NumberField
            label="Speed"
            value={followPath.speed}
            onChange={(v) => onChange((d) => { findComponent<FollowPathComponent>(d, "FollowPath")!.speed = v; })}
          />
          <CheckboxField
            label="Loop"
            checked={followPath.loop}
            onChange={(checked) => onChange((d) => { findComponent<FollowPathComponent>(d, "FollowPath")!.loop = checked; })}
          />
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Points JSON</span>
            <Textarea
              className="min-h-[64px] font-mono text-[10px]"
              value={JSON.stringify(followPath.points)}
              onChange={(e) => {
                try {
                  const points = JSON.parse(e.target.value) as { x: number; y: number }[];
                  if (!Array.isArray(points)) return;
                  onChange((d) => { findComponent<FollowPathComponent>(d, "FollowPath")!.points = points; });
                } catch { /* ignore partial JSON */ }
              }}
            />
          </label>
          <Button size="sm" variant="secondary"
            onClick={() => onChange((d) => { findComponent<FollowPathComponent>(d, "FollowPath")!.points.push({ x: 0, y: 0 }); })}
          >
            Add point
          </Button>
        </>
      ) : (
        <p className="text-center text-[10px] text-text-muted">No path follower</p>
      )}
    </AccordionSection>
  );
}
