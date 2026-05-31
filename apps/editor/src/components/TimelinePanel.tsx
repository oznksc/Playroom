import type { GameKitScene, TimelineTrack, Keyframe } from "@gamekit/schema";
import { Play, Square, Plus, Trash2 } from "lucide-react";

type TimelinePanelProps = {
  scene: GameKitScene;
  onChange: (mutator: (scene: GameKitScene) => void) => void;
};

const PROPERTY_LABELS: Record<TimelineTrack["property"], string> = {
  "position.x": "Pos X",
  "position.y": "Pos Y",
  "rotation": "Rot",
  "scale.x": "Scale X",
  "scale.y": "Scale Y",
  "alpha": "Alpha",
};

export function TimelinePanel({ scene, onChange }: TimelinePanelProps) {
  const timeline = scene.timeline;

  return (
    <div className="timeline-panel">
      <div className="timeline-header">
        <h3>Timeline</h3>
        <div className="timeline-controls">
          <button
            type="button"
            className="icon-button"
            onClick={() => onChange((d) => { d.timeline.playing = !d.timeline.playing; })}
            title={timeline.playing ? "Stop" : "Play"}
          >
            {timeline.playing ? <Square size={14} /> : <Play size={14} />}
          </button>
          <label>
            Duration
            <input
              type="number"
              value={timeline.duration}
              onChange={(e) => onChange((d) => { d.timeline.duration = Math.max(0, Number(e.target.value)); })}
              style={{ width: 70 }}
              step={0.1}
              min={0}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={timeline.loop}
              onChange={(e) => onChange((d) => { d.timeline.loop = e.target.checked; })}
            />
            Loop
          </label>
        </div>
      </div>

      <div className="timeline-tracks">
        {timeline.tracks.length === 0 && (
          <div className="empty-state" style={{ padding: 12 }}>
            <p>No animation tracks</p>
          </div>
        )}
        {timeline.tracks.map((track, ti) => (
          <div key={ti} className="timeline-track">
            <div className="track-header">
              <div className="track-info">
                <select
                  value={track.entityId}
                  onChange={(e) => onChange((d) => {
                    d.timeline.tracks[ti].entityId = e.target.value;
                  })}
                >
                  <option value="">— Select Entity —</option>
                  {scene.entities.map((e) => (
                    <option key={e.id} value={e.id}>{e.name || e.id}</option>
                  ))}
                </select>
                <select
                  value={track.property}
                  onChange={(e) => onChange((d) => {
                    d.timeline.tracks[ti].property = e.target.value as TimelineTrack["property"];
                  })}
                >
                  {Object.entries(PROPERTY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="icon-button danger"
                onClick={() => onChange((d) => { d.timeline.tracks.splice(ti, 1); })}
              >
                <Trash2 size={12} />
              </button>
            </div>
            <div className="keyframe-list">
              {track.keyframes.map((kf, ki) => (
                <div key={ki} className="keyframe-row">
                  <input
                    type="number"
                    value={kf.time}
                    onChange={(e) => onChange((d) => {
                      d.timeline.tracks[ti].keyframes[ki].time = Math.max(0, Number(e.target.value));
                    })}
                    placeholder="Time"
                    step={0.1}
                    min={0}
                  />
                  <input
                    type="number"
                    value={typeof kf.value === "number" ? kf.value : kf.value[0] ?? 0}
                    onChange={(e) => onChange((d) => {
                      const val = Number(e.target.value);
                      d.timeline.tracks[ti].keyframes[ki].value = Array.isArray(d.timeline.tracks[ti].keyframes[ki].value)
                        ? [val]
                        : val;
                    })}
                    placeholder="Value"
                  />
                  <select
                    value={kf.easing ?? "linear"}
                    onChange={(e) => onChange((d) => {
                      d.timeline.tracks[ti].keyframes[ki].easing = e.target.value as Keyframe["easing"];
                    })}
                  >
                    <option value="linear">Linear</option>
                    <option value="easeIn">Ease In</option>
                    <option value="easeOut">Ease Out</option>
                    <option value="easeInOut">Ease In Out</option>
                  </select>
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => onChange((d) => {
                      d.timeline.tracks[ti].keyframes.splice(ki, 1);
                    })}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="icon-button"
                onClick={() => onChange((d) => {
                  d.timeline.tracks[ti].keyframes.push({ time: 0, value: 0 });
                })}
              >
                <Plus size={10} /> Add keyframe
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="button"
          onClick={() => onChange((d) => {
            d.timeline.tracks.push({
              entityId: scene.entities[0]?.id ?? "",
              property: "position.x",
              keyframes: [],
            });
          })}
          style={{ marginTop: 8, width: "100%" }}
        >
          <Plus size={12} /> Add track
        </button>
      </div>
    </div>
  );
}
