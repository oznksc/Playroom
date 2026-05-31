import type { GameKitScene, Orientation, ResponsiveConfig } from "@gamekit/schema";
import { Settings, Smartphone, Monitor, Shield, Palette, Gauge } from "lucide-react";

type SceneSettingsProps = {
  scene: GameKitScene;
  onChange: (mutator: (scene: GameKitScene) => void) => void;
};

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      {label}
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function SceneSettings({ scene, onChange }: SceneSettingsProps) {
  const responsive = scene.responsive;

  return (
    <div className="scene-settings">

      <div className="inspector-section">
        <div className="inspector-section-title">
          <Settings size={12} />
          Scene
        </div>
        <label>
          Name
          <input
            type="text"
            value={scene.name}
            onChange={(event) => onChange((draft) => {
              draft.name = event.target.value;
            })}
          />
        </label>
        <div className="fieldRow">
          <NumberField
            label="Viewport W"
            value={scene.viewport.width}
            onChange={(value) => onChange((draft) => {
              draft.viewport.width = value;
            })}
          />
          <NumberField
            label="Viewport H"
            value={scene.viewport.height}
            onChange={(value) => onChange((draft) => {
              draft.viewport.height = value;
            })}
          />
        </div>
      </div>

      <div className="inspector-section">
        <div className="inspector-section-title">
          <Palette size={12} />
          Background
        </div>
        <label>
          Color
          <div className="color-row">
            <input
              type="color"
              value={scene.viewport.background}
              onChange={(event) => onChange((draft) => {
                draft.viewport.background = event.target.value;
              })}
            />
            <input
              type="text"
              value={scene.viewport.background}
              onChange={(event) => onChange((draft) => {
                draft.viewport.background = event.target.value;
              })}
            />
          </div>
        </label>
      </div>

      <div className="inspector-section">
        <div className="inspector-section-title">
          <Gauge size={12} />
          Gravity
        </div>
        <div className="fieldRow">
          <NumberField
            label="X"
            value={scene.gravity.x}
            onChange={(value) => onChange((draft) => {
              draft.gravity.x = value;
            })}
          />
          <NumberField
            label="Y"
            value={scene.gravity.y}
            onChange={(value) => onChange((draft) => {
              draft.gravity.y = value;
            })}
          />
        </div>
      </div>

      <div className="inspector-section">
        <div className="inspector-section-title">
          <Smartphone size={12} />
          Orientation
        </div>
        <label>
          Mode
          <select
            value={responsive.orientation}
            onChange={(event) => onChange((draft) => {
              draft.responsive.orientation = event.target.value as Orientation;
            })}
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
            <option value="auto">Auto</option>
          </select>
        </label>
      </div>

      <div className="inspector-section">
        <div className="inspector-section-title">
          <Monitor size={12} />
          Responsive
        </div>
        <label>
          Mode
          <select
            value={responsive.mode}
            onChange={(event) => onChange((draft) => {
              draft.responsive.mode = event.target.value as ResponsiveConfig["mode"];
            })}
          >
            <option value="fixed">Fixed</option>
            <option value="scale">Scale</option>
            <option value="adaptive">Adaptive</option>
          </select>
        </label>
        <div className="fieldRow">
          <NumberField
            label="Ref W"
            value={responsive.referenceWidth}
            onChange={(value) => onChange((draft) => {
              draft.responsive.referenceWidth = value;
            })}
          />
          <NumberField
            label="Ref H"
            value={responsive.referenceHeight}
            onChange={(value) => onChange((draft) => {
              draft.responsive.referenceHeight = value;
            })}
          />
        </div>
      </div>

      <div className="inspector-section">
        <div className="inspector-section-title">
          <Shield size={12} />
          Safe Area
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={responsive.safeArea.enabled}
            onChange={(event) => onChange((draft) => {
              draft.responsive.safeArea.enabled = event.target.checked;
            })}
          />
          Enable safe area
        </label>
        {responsive.safeArea.enabled && (
          <div className="safe-area-fields">
            <div className="fieldRow">
              <NumberField
                label="Top"
                value={responsive.safeArea.padding.top}
                onChange={(value) => onChange((draft) => {
                  draft.responsive.safeArea.padding.top = value;
                })}
              />
              <NumberField
                label="Bottom"
                value={responsive.safeArea.padding.bottom}
                onChange={(value) => onChange((draft) => {
                  draft.responsive.safeArea.padding.bottom = value;
                })}
              />
            </div>
            <div className="fieldRow">
              <NumberField
                label="Left"
                value={responsive.safeArea.padding.left}
                onChange={(value) => onChange((draft) => {
                  draft.responsive.safeArea.padding.left = value;
                })}
              />
              <NumberField
                label="Right"
                value={responsive.safeArea.padding.right}
                onChange={(value) => onChange((draft) => {
                  draft.responsive.safeArea.padding.right = value;
                })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}