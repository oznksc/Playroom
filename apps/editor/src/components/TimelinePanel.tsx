import type { GameKitScene, TimelineTrack, Keyframe } from "@gamekit/schema";
import { Play, Square, Plus, Trash2 } from "lucide-react";
import { Button, IconButton, Input, Select, CheckboxField, EmptyState } from "@/ui";

type TimelinePanelProps = {
  scene: GameKitScene;
  onChange: (mutator: (scene: GameKitScene) => void) => void;
};

const PROPERTY_LABELS: Record<TimelineTrack["property"], string> = {
  "position.x": "Pos X",
  "position.y": "Pos Y",
  rotation: "Rot",
  "scale.x": "Scale X",
  "scale.y": "Scale Y",
  alpha: "Alpha",
};

export function TimelinePanel({ scene, onChange }: TimelinePanelProps) {
  const timeline = scene.timeline;

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg-surface">
      <div className="flex h-9 shrink-0 flex-wrap items-center gap-3 border-b border-border-default bg-bg-base px-2.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-muted">
          Timeline
        </span>
        <IconButton
          size="md"
          variant={timeline.playing ? "active" : "ghost"}
          onClick={() =>
            onChange((d) => {
              d.timeline.playing = !d.timeline.playing;
            })
          }
          title={timeline.playing ? "Stop" : "Play"}
        >
          {timeline.playing ? <Square size={12} /> : <Play size={12} />}
        </IconButton>
        <label className="flex items-center gap-1.5 text-[10px] text-text-muted">
          Duration
          <Input
            type="number"
            className="h-[24px] w-[70px]"
            value={timeline.duration}
            step={0.1}
            min={0}
            onChange={(e) =>
              onChange((d) => {
                d.timeline.duration = Math.max(0, Number(e.target.value));
              })
            }
          />
        </label>
        <CheckboxField
          label="Loop"
          checked={timeline.loop}
          onChange={(checked) =>
            onChange((d) => {
              d.timeline.loop = checked;
            })
          }
        />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-auto p-2">
        {timeline.tracks.length === 0 && (
          <EmptyState title="No animation tracks" description="Add a track to animate entity properties." />
        )}
        {timeline.tracks.map((track, ti) => (
          <div key={ti} className="rounded-md border border-border-default bg-bg-base p-2">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <Select
                className="h-[24px] min-w-[120px] flex-1"
                value={track.entityId}
                onChange={(e) =>
                  onChange((d) => {
                    d.timeline.tracks[ti].entityId = e.target.value;
                  })
                }
              >
                <option value="">— Select Entity —</option>
                {scene.entities.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name || e.id}
                  </option>
                ))}
              </Select>
              <Select
                className="h-[24px] w-[100px]"
                value={track.property}
                onChange={(e) =>
                  onChange((d) => {
                    d.timeline.tracks[ti].property = e.target.value as TimelineTrack["property"];
                  })
                }
              >
                {Object.entries(PROPERTY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
              <IconButton
                size="sm"
                variant="danger"
                onClick={() =>
                  onChange((d) => {
                    d.timeline.tracks.splice(ti, 1);
                  })
                }
              >
                <Trash2 size={12} />
              </IconButton>
            </div>
            <div className="space-y-1">
              {track.keyframes.map((kf, ki) => (
                <div key={ki} className="flex flex-wrap items-center gap-1">
                  <Input
                    type="number"
                    className="h-[24px] w-[70px]"
                    value={kf.time}
                    step={0.1}
                    min={0}
                    placeholder="Time"
                    onChange={(e) =>
                      onChange((d) => {
                        d.timeline.tracks[ti].keyframes[ki].time = Math.max(0, Number(e.target.value));
                      })
                    }
                  />
                  <Input
                    type="number"
                    className="h-[24px] w-[70px]"
                    value={typeof kf.value === "number" ? kf.value : kf.value[0] ?? 0}
                    placeholder="Value"
                    onChange={(e) =>
                      onChange((d) => {
                        const val = Number(e.target.value);
                        d.timeline.tracks[ti].keyframes[ki].value = Array.isArray(
                          d.timeline.tracks[ti].keyframes[ki].value
                        )
                          ? [val]
                          : val;
                      })
                    }
                  />
                  <Select
                    className="h-[24px] w-[100px]"
                    value={kf.easing ?? "linear"}
                    onChange={(e) =>
                      onChange((d) => {
                        d.timeline.tracks[ti].keyframes[ki].easing = e.target
                          .value as Keyframe["easing"];
                      })
                    }
                  >
                    <option value="linear">Linear</option>
                    <option value="easeIn">Ease In</option>
                    <option value="easeOut">Ease Out</option>
                    <option value="easeInOut">Ease In Out</option>
                  </Select>
                  <IconButton
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      onChange((d) => {
                        d.timeline.tracks[ti].keyframes.splice(ki, 1);
                      })
                    }
                  >
                    <Trash2 size={10} />
                  </IconButton>
                </div>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  onChange((d) => {
                    d.timeline.tracks[ti].keyframes.push({ time: 0, value: 0 });
                  })
                }
              >
                <Plus size={10} /> Add keyframe
              </Button>
            </div>
          </div>
        ))}
        <Button
          size="md"
          variant="secondary"
          className="w-full"
          onClick={() =>
            onChange((d) => {
              d.timeline.tracks.push({
                entityId: scene.entities[0]?.id ?? "",
                property: "position.x",
                keyframes: [],
              });
            })
          }
        >
          <Plus size={12} /> Add track
        </Button>
      </div>
    </div>
  );
}
