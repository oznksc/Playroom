import type { GameKitScene, Orientation, ResponsiveConfig } from "@gamekit/schema";
import { Settings, Smartphone, Monitor, Shield, Palette, Gauge, ChevronDown, ChevronRight, Globe } from "lucide-react";
import { useState } from "react";

type SceneSettingsProps = {
  scene: GameKitScene;
  onChange: (mutator: (scene: GameKitScene) => void) => void;
};

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

function NumberField({ label, value, onChange }: NumberFieldProps) {
  return (
    <div className="inspector-num-field">
      <span className="field-badge">{label}</span>
      <input
        type="number"
        value={Math.round(value * 100) / 100}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

type SectionHeaderProps = {
  icon: React.ReactNode;
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  accentClass: string;
};

function SectionHeader({
  icon,
  label,
  isOpen,
  onToggle,
  accentClass
}: SectionHeaderProps) {
  return (
    <div className={`inspector-section-title-row ${accentClass}`}>
      <button type="button" className="accordion-toggle" onClick={onToggle}>
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {icon}
        <span className="section-label-text">{label}</span>
      </button>
    </div>
  );
}

export function SceneSettings({ scene, onChange }: SceneSettingsProps) {
  const responsive = scene.responsive;
  
  // Collapse state for the entire panel
  const [isMainCollapsed, setIsMainCollapsed] = useState(true);

  // Collapse state for individual sub-sections
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    Scene: false,
    Gravity: false,
    Responsive: true,
    SafeArea: true
  });

  function toggleCollapse(section: string) {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  return (
    <div className="scene-settings">
      {/* Title Header: Interactive Click toggle to collapse entire World Settings panel */}
      <div 
        className="scene-settings-header" 
        onClick={() => setIsMainCollapsed((p) => !p)}
        style={{ cursor: "pointer" }}
        title="Click to toggle World Settings panel collapse"
      >
        {isMainCollapsed ? (
          <ChevronRight size={12} className="header-arrow" />
        ) : (
          <ChevronDown size={12} className="header-arrow" />
        )}
        <Globe size={13} className="header-icon" />
        <span>World Settings</span>
      </div>

      {!isMainCollapsed && (
        <div className="scene-settings-scroll">
          {/* Core Scene Settings */}
          <div className="inspector-section-card">
            <SectionHeader
              icon={<Settings size={12} />}
              label="Viewport Properties"
              isOpen={!collapsed.Scene}
              onToggle={() => toggleCollapse("Scene")}
              accentClass="accent-sprite"
            />
            {!collapsed.Scene && (
              <div className="inspector-card-body">
                <div className="inspector-field-grid">
                  <div className="inspector-select-wrapper" style={{ marginBottom: 6 }}>
                    <label className="inspector-select-label">Scene Name</label>
                    <input
                      type="text"
                      className="scene-name-input-field"
                      value={scene.name}
                      onChange={(event) => onChange((draft) => {
                        draft.name = event.target.value;
                      })}
                    />
                  </div>
                  <div className="field-grid-row dual-fields">
                    <NumberField
                      label="Width"
                      value={scene.viewport.width}
                      onChange={(value) => onChange((draft) => {
                        draft.viewport.width = value;
                      })}
                    />
                    <NumberField
                      label="Height"
                      value={scene.viewport.height}
                      onChange={(value) => onChange((draft) => {
                        draft.viewport.height = value;
                      })}
                    />
                  </div>
                  
                  {/* Background color custom picker */}
                  <div className="scene-color-picker-row" style={{ marginTop: 6 }}>
                    <label className="inspector-select-label">Background</label>
                    <div className="color-row-wrapper">
                      <input
                        type="color"
                        className="color-box"
                        value={scene.viewport.background}
                        onChange={(event) => onChange((draft) => {
                          draft.viewport.background = event.target.value;
                        })}
                      />
                      <input
                        type="text"
                        className="color-hex-text"
                        value={scene.viewport.background}
                        onChange={(event) => onChange((draft) => {
                          draft.viewport.background = event.target.value;
                        })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Gravity Force Vectors */}
          <div className="inspector-section-card">
            <SectionHeader
              icon={<Gauge size={12} />}
              label="Environmental Gravity"
              isOpen={!collapsed.Gravity}
              onToggle={() => toggleCollapse("Gravity")}
              accentClass="accent-transform"
            />
            {!collapsed.Gravity && (
              <div className="inspector-card-body">
                <div className="inspector-field-grid">
                  <div className="field-grid-row dual-fields">
                    <NumberField
                      label="Force X"
                      value={scene.gravity.x}
                      onChange={(value) => onChange((draft) => {
                        draft.gravity.x = value;
                      })}
                    />
                    <NumberField
                      label="Force Y"
                      value={scene.gravity.y}
                      onChange={(value) => onChange((draft) => {
                        draft.gravity.y = value;
                      })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Responsive Adjustments */}
          <div className="inspector-section-card">
            <SectionHeader
              icon={<Monitor size={12} />}
              label="Responsive Layout"
              isOpen={!collapsed.Responsive}
              onToggle={() => toggleCollapse("Responsive")}
              accentClass="accent-camera"
            />
            {!collapsed.Responsive && (
              <div className="inspector-card-body">
                <div className="inspector-field-grid">
                  <div className="field-grid-row dual-fields" style={{ marginBottom: 6 }}>
                    <div className="inspector-select-wrapper">
                      <label className="inspector-select-label">Orientation</label>
                      <select
                        value={responsive.orientation}
                        onChange={(event) => onChange((draft) => {
                          const nextOrientation = event.target.value as Orientation;
                          draft.responsive.orientation = nextOrientation;
                          
                          // Auto synchronize viewport width/height dimensions
                          const w = draft.responsive.referenceWidth;
                          const h = draft.responsive.referenceHeight;
                          if (nextOrientation === "portrait") {
                            draft.viewport.width = Math.min(w, h);
                            draft.viewport.height = Math.max(w, h);
                          } else if (nextOrientation === "landscape") {
                            draft.viewport.width = Math.max(w, h);
                            draft.viewport.height = Math.min(w, h);
                          } else {
                            draft.viewport.width = w;
                            draft.viewport.height = h;
                          }
                        })}
                      >
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                    <div className="inspector-select-wrapper">
                      <label className="inspector-select-label">Scale Mode</label>
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
                    </div>
                  </div>

                  <div className="field-grid-row dual-fields">
                    <NumberField
                      label="Ref W"
                      value={responsive.referenceWidth}
                      onChange={(value) => onChange((draft) => {
                        draft.responsive.referenceWidth = value;
                        
                        // Auto synchronize viewport width/height dimensions
                        const orientation = draft.responsive.orientation;
                        const w = value;
                        const h = draft.responsive.referenceHeight;
                        if (orientation === "portrait") {
                          draft.viewport.width = Math.min(w, h);
                          draft.viewport.height = Math.max(w, h);
                        } else if (orientation === "landscape") {
                          draft.viewport.width = Math.max(w, h);
                          draft.viewport.height = Math.min(w, h);
                        } else {
                          draft.viewport.width = w;
                          draft.viewport.height = h;
                        }
                      })}
                    />
                    <NumberField
                      label="Ref H"
                      value={responsive.referenceHeight}
                      onChange={(value) => onChange((draft) => {
                        draft.responsive.referenceHeight = value;
                        
                        // Auto synchronize viewport width/height dimensions
                        const orientation = draft.responsive.orientation;
                        const w = draft.responsive.referenceWidth;
                        const h = value;
                        if (orientation === "portrait") {
                          draft.viewport.width = Math.min(w, h);
                          draft.viewport.height = Math.max(w, h);
                        } else if (orientation === "landscape") {
                          draft.viewport.width = Math.max(w, h);
                          draft.viewport.height = Math.min(w, h);
                        } else {
                          draft.viewport.width = w;
                          draft.viewport.height = h;
                        }
                      })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Safe Area Parameters */}
          <div className="inspector-section-card">
            <SectionHeader
              icon={<Shield size={12} />}
              label="Safe Area Colliders"
              isOpen={!collapsed.SafeArea}
              onToggle={() => toggleCollapse("SafeArea")}
              accentClass="accent-collider"
            />
            {!collapsed.SafeArea && (
              <div className="inspector-card-body">
                <div className="inspector-field-grid">
                  <div className="field-checkbox-row" style={{ marginBottom: 6 }}>
                    <input
                      id="safe-area-enabled-check"
                      type="checkbox"
                      checked={responsive.safeArea.enabled}
                      onChange={(event) => onChange((draft) => {
                        draft.responsive.safeArea.enabled = event.target.checked;
                      })}
                    />
                    <label htmlFor="safe-area-enabled-check">Enable safe area boundaries</label>
                  </div>

                  {responsive.safeArea.enabled && (
                    <div className="inspector-field-grid">
                      <div className="field-grid-row dual-fields">
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
                      <div className="field-grid-row dual-fields">
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}