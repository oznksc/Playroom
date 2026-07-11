import type { GameKitScene, Orientation, ResponsiveConfig } from "@gamekit/schema";
import { Settings, Monitor, Shield, Gauge, Globe } from "lucide-react";
import { useState } from "react";
import {
  NumberField,
  Select,
  AccordionSection,
  Input,
  ColorField,
  CheckboxField,
  Panel,
  PanelHeader,
  PanelTitle,
  PanelBody,
} from "@/ui";

type SceneSettingsProps = {
  scene: GameKitScene;
  onChange: (mutator: (scene: GameKitScene) => void) => void;
};

/**
 * World / scene settings panel — viewport, gravity, responsive, safe area.
 * Lives as its own left-sheet workspace (not inside the entity inspector).
 */
export function SceneSettings({ scene, onChange }: SceneSettingsProps) {
  const responsive = scene.responsive;
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
    <Panel>
      <PanelHeader className="h-9">
        <PanelTitle accent="cyan">
          <Globe size={13} className="text-accent" />
          World
        </PanelTitle>
        <span className="truncate font-mono text-[10px] text-text-muted">
          {scene.name || scene.id}
        </span>
      </PanelHeader>

      <PanelBody className="space-y-1.5 p-2">
        <AccordionSection
          icon={<Settings size={12} />}
          label="Viewport"
          open={!collapsed.Scene}
          onToggle={() => toggleCollapse("Scene")}
          accent="cyan"
        >
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold tracking-[-0.01em] text-text-muted">
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
              label="W"
              value={scene.viewport.width}
              onChange={(value) =>
                onChange((draft) => {
                  draft.viewport.width = value;
                })
              }
            />
            <NumberField
              label="H"
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
          label="Gravity"
          open={!collapsed.Gravity}
          onToggle={() => toggleCollapse("Gravity")}
          accent="purple"
        >
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField
              label="X"
              value={scene.gravity.x}
              onChange={(value) =>
                onChange((draft) => {
                  draft.gravity.x = value;
                })
              }
            />
            <NumberField
              label="Y"
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
          label="Responsive"
          open={!collapsed.Responsive}
          onToggle={() => toggleCollapse("Responsive")}
          accent="cyan"
        >
          <div className="grid grid-cols-2 gap-1.5">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold tracking-[-0.01em] text-text-muted">
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
              <span className="text-[10px] font-semibold tracking-[-0.01em] text-text-muted">
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
          label="Safe area"
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
      </PanelBody>
    </Panel>
  );
}
