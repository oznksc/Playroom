import type { GameKitScene, Orientation, ResponsiveConfig } from "@gamekit/schema";
import { Settings, Monitor, Shield, Gauge, ChevronDown, ChevronRight, Globe } from "lucide-react";
import { useState } from "react";
import {
  NumberField,
  Select,
  AccordionSection,
  Input,
  ColorField,
  CheckboxField,
} from "@/ui";

type SceneSettingsProps = {
  scene: GameKitScene;
  onChange: (mutator: (scene: GameKitScene) => void) => void;
};

export function SceneSettings({ scene, onChange }: SceneSettingsProps) {
  const responsive = scene.responsive;
  const [isMainCollapsed, setIsMainCollapsed] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    Scene: false,
    Gravity: false,
    Responsive: true,
    SafeArea: true,
  });

  function toggleCollapse(section: string) {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  function syncViewportFromResponsive(
    draft: GameKitScene,
    orientation: Orientation,
    w: number,
    h: number
  ) {
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
  }

  return (
    <div className="flex shrink-0 flex-col bg-bg-surface">
      <button
        type="button"
        className="flex h-[34px] w-full cursor-pointer items-center gap-2 bg-bg-base/50 px-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-text-muted hover:bg-bg-hover"
        onClick={() => setIsMainCollapsed((p) => !p)}
        title="Toggle world settings"
      >
        <Globe size={13} className="text-accent" />
        <span className="flex-1">World Settings</span>
        {isMainCollapsed ? (
          <ChevronRight size={12} className="text-text-muted" />
        ) : (
          <ChevronDown size={12} className="text-text-muted" />
        )}
      </button>

      {!isMainCollapsed && (
        <div className="max-h-[280px] space-y-1.5 overflow-auto p-2">
          <AccordionSection
            icon={<Settings size={12} />}
            label="Viewport Properties"
            open={!collapsed.Scene}
            onToggle={() => toggleCollapse("Scene")}
            accent="cyan"
          >
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                Scene name
              </span>
              <Input
                value={scene.name}
                onChange={(event) =>
                  onChange((draft) => {
                    draft.name = event.target.value;
                  })
                }
              />
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <NumberField
                label="Width"
                value={scene.viewport.width}
                onChange={(value) =>
                  onChange((draft) => {
                    draft.viewport.width = value;
                  })
                }
              />
              <NumberField
                label="Height"
                value={scene.viewport.height}
                onChange={(value) =>
                  onChange((draft) => {
                    draft.viewport.height = value;
                  })
                }
              />
            </div>
            <ColorField
              label="BG"
              value={scene.viewport.background}
              onChange={(value) =>
                onChange((draft) => {
                  draft.viewport.background = value;
                })
              }
            />
          </AccordionSection>

          <AccordionSection
            icon={<Gauge size={12} />}
            label="Environmental Gravity"
            open={!collapsed.Gravity}
            onToggle={() => toggleCollapse("Gravity")}
            accent="purple"
          >
            <div className="grid grid-cols-2 gap-1.5">
              <NumberField
                label="Force X"
                value={scene.gravity.x}
                onChange={(value) =>
                  onChange((draft) => {
                    draft.gravity.x = value;
                  })
                }
              />
              <NumberField
                label="Force Y"
                value={scene.gravity.y}
                onChange={(value) =>
                  onChange((draft) => {
                    draft.gravity.y = value;
                  })
                }
              />
            </div>
          </AccordionSection>

          <AccordionSection
            icon={<Monitor size={12} />}
            label="Responsive Layout"
            open={!collapsed.Responsive}
            onToggle={() => toggleCollapse("Responsive")}
            accent="cyan"
          >
            <div className="grid grid-cols-2 gap-1.5">
              <label className="flex flex-col gap-1">
                <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                  Orientation
                </span>
                <Select
                  value={responsive.orientation}
                  onChange={(event) =>
                    onChange((draft) => {
                      const next = event.target.value as Orientation;
                      draft.responsive.orientation = next;
                      syncViewportFromResponsive(
                        draft,
                        next,
                        draft.responsive.referenceWidth,
                        draft.responsive.referenceHeight
                      );
                    })
                  }
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                  <option value="auto">Auto</option>
                </Select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                  Scale mode
                </span>
                <Select
                  value={responsive.mode}
                  onChange={(event) =>
                    onChange((draft) => {
                      draft.responsive.mode = event.target
                        .value as ResponsiveConfig["mode"];
                    })
                  }
                >
                  <option value="fixed">Fixed</option>
                  <option value="scale">Scale</option>
                  <option value="adaptive">Adaptive</option>
                </Select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <NumberField
                label="Ref W"
                value={responsive.referenceWidth}
                onChange={(value) =>
                  onChange((draft) => {
                    draft.responsive.referenceWidth = value;
                    syncViewportFromResponsive(
                      draft,
                      draft.responsive.orientation,
                      value,
                      draft.responsive.referenceHeight
                    );
                  })
                }
              />
              <NumberField
                label="Ref H"
                value={responsive.referenceHeight}
                onChange={(value) =>
                  onChange((draft) => {
                    draft.responsive.referenceHeight = value;
                    syncViewportFromResponsive(
                      draft,
                      draft.responsive.orientation,
                      draft.responsive.referenceWidth,
                      value
                    );
                  })
                }
              />
            </div>
          </AccordionSection>

          <AccordionSection
            icon={<Shield size={12} />}
            label="Safe Area Colliders"
            open={!collapsed.SafeArea}
            onToggle={() => toggleCollapse("SafeArea")}
            accent="green"
          >
            <CheckboxField
              label="Enable safe area boundaries"
              checked={responsive.safeArea.enabled}
              onChange={(checked) =>
                onChange((draft) => {
                  draft.responsive.safeArea.enabled = checked;
                })
              }
            />
            {responsive.safeArea.enabled && (
              <div className="grid grid-cols-2 gap-1.5">
                <NumberField
                  label="Top"
                  value={responsive.safeArea.padding.top}
                  onChange={(value) =>
                    onChange((draft) => {
                      draft.responsive.safeArea.padding.top = value;
                    })
                  }
                />
                <NumberField
                  label="Bottom"
                  value={responsive.safeArea.padding.bottom}
                  onChange={(value) =>
                    onChange((draft) => {
                      draft.responsive.safeArea.padding.bottom = value;
                    })
                  }
                />
                <NumberField
                  label="Left"
                  value={responsive.safeArea.padding.left}
                  onChange={(value) =>
                    onChange((draft) => {
                      draft.responsive.safeArea.padding.left = value;
                    })
                  }
                />
                <NumberField
                  label="Right"
                  value={responsive.safeArea.padding.right}
                  onChange={(value) =>
                    onChange((draft) => {
                      draft.responsive.safeArea.padding.right = value;
                    })
                  }
                />
              </div>
            )}
          </AccordionSection>
        </div>
      )}
    </div>
  );
}
