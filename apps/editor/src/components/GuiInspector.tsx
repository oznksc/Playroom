import type {
  GuiNode,
  GuiText,
  GuiButton,
  GuiImage,
  GuiPanel,
  GuiProgressBar,
  GuiJoystick,
  GameKitAsset,
} from "@gamekit/schema";
import { Type, Square, Image, Trash2, Layout, Activity, Gamepad2 } from "lucide-react";
import { useState } from "react";
import {
  NumberField,
  IconButton,
  EmptyState,
  AccordionSection,
  Select,
  Input,
  CheckboxField,
  ColorField,
} from "@/ui";

type GuiInspectorProps = {
  node?: GuiNode;
  assets: GameKitAsset[];
  onChange: (mutator: (node: GuiNode) => void) => void;
  onDelete: () => void;
};

export function GuiInspector({ node, assets, onChange, onDelete }: GuiInspectorProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    transform: false,
    content: false,
  });

  function toggleCollapse(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (!node) {
    return (
      <aside className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
        <EmptyState
          icon={<Type size={16} />}
          title="No GUI node selected"
          description="Select a GUI node from the GUIs panel to edit its properties."
        />
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      <div className="flex h-[42px] shrink-0 items-center justify-between gap-2 px-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[12px] font-bold text-text-primary">{node.type}</span>
          <span className="font-mono text-[9px] tracking-wide text-text-muted">
            {node.id.slice(0, 8)}
          </span>
        </div>
        <IconButton size="sm" variant="danger" onClick={onDelete} title="Delete GUI node">
          <Trash2 size={13} />
        </IconButton>
      </div>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-auto p-2">
        <AccordionSection
          label="Position & Size"
          open={!collapsed.transform}
          onToggle={() => toggleCollapse("transform")}
        >
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField
              label="X"
              value={node.x}
              onChange={(v) =>
                onChange((d) => {
                  d.x = v;
                })
              }
            />
            <NumberField
              label="Y"
              value={node.y}
              onChange={(v) =>
                onChange((d) => {
                  d.y = v;
                })
              }
            />
            <NumberField
              label="Width"
              value={node.width}
              onChange={(v) =>
                onChange((d) => {
                  d.width = v;
                })
              }
            />
            <NumberField
              label="Height"
              value={node.height}
              onChange={(v) =>
                onChange((d) => {
                  d.height = v;
                })
              }
            />
            <NumberField
              label="Anchor X"
              value={node.anchorX ?? 0}
              onChange={(v) =>
                onChange((d) => {
                  d.anchorX = v;
                })
              }
            />
            <NumberField
              label="Anchor Y"
              value={node.anchorY ?? 0}
              onChange={(v) =>
                onChange((d) => {
                  d.anchorY = v;
                })
              }
            />
          </div>
          <CheckboxField
            label="Visible"
            checked={node.visible !== false}
            onChange={(checked) =>
              onChange((d) => {
                d.visible = checked;
              })
            }
          />
          <CheckboxField
            label="Interactive"
            checked={node.interactive === true}
            onChange={(checked) =>
              onChange((d) => {
                d.interactive = checked;
              })
            }
          />
        </AccordionSection>

        {node.type === "Text" && (
          <AccordionSection
            icon={<Type size={12} />}
            label="Text Content"
            open={!collapsed.content}
            onToggle={() => toggleCollapse("content")}
          >
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                Text
              </span>
              <Input
                type="text"
                value={(node as GuiText).text}
                onChange={(e) =>
                  onChange((d) => {
                    (d as GuiText).text = e.target.value;
                  })
                }
              />
            </label>
            <NumberField
              label="Font Size"
              value={(node as GuiText).fontSize ?? 16}
              onChange={(v) =>
                onChange((d) => {
                  (d as GuiText).fontSize = v;
                })
              }
            />
            <ColorField
              label="Color"
              value={(node as GuiText).color ?? "#ffffff"}
              onChange={(value) =>
                onChange((d) => {
                  (d as GuiText).color = value;
                })
              }
            />
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                Align
              </span>
              <Select
                value={(node as GuiText).align ?? "left"}
                onChange={(e) =>
                  onChange((d) => {
                    (d as GuiText).align = e.target.value as "left" | "center" | "right";
                  })
                }
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </Select>
            </label>
          </AccordionSection>
        )}

        {node.type === "Button" && (
          <AccordionSection
            icon={<Square size={12} />}
            label="Button Content"
            open={!collapsed.content}
            onToggle={() => toggleCollapse("content")}
          >
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                Text
              </span>
              <Input
                type="text"
                value={(node as GuiButton).text}
                onChange={(e) =>
                  onChange((d) => {
                    (d as GuiButton).text = e.target.value;
                  })
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                Action
              </span>
              <Input
                type="text"
                value={(node as GuiButton).action ?? ""}
                onChange={(e) =>
                  onChange((d) => {
                    (d as GuiButton).action = e.target.value;
                  })
                }
                placeholder="e.g. startGame"
              />
            </label>
            <NumberField
              label="Font Size"
              value={(node as GuiButton).fontSize ?? 16}
              onChange={(v) =>
                onChange((d) => {
                  (d as GuiButton).fontSize = v;
                })
              }
            />
            <ColorField
              label="Text Color"
              value={(node as GuiButton).color ?? "#ffffff"}
              onChange={(value) =>
                onChange((d) => {
                  (d as GuiButton).color = value;
                })
              }
            />
            <ColorField
              label="BG Color"
              value={(node as GuiButton).backgroundColor ?? "#333333"}
              onChange={(value) =>
                onChange((d) => {
                  (d as GuiButton).backgroundColor = value;
                })
              }
            />
          </AccordionSection>
        )}

        {node.type === "Image" && (
          <AccordionSection
            icon={<Image size={12} />}
            label="Image Content"
            open={!collapsed.content}
            onToggle={() => toggleCollapse("content")}
          >
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                Asset
              </span>
              <Select
                value={(node as GuiImage).assetId}
                onChange={(e) =>
                  onChange((d) => {
                    (d as GuiImage).assetId = e.target.value;
                  })
                }
              >
                <option value="">— Select Asset —</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.id}
                  </option>
                ))}
              </Select>
            </label>
          </AccordionSection>
        )}

        {node.type === "Panel" && (
          <AccordionSection
            icon={<Layout size={12} />}
            label="Panel Style"
            open={!collapsed.content}
            onToggle={() => toggleCollapse("content")}
          >
            <ColorField
              label="Background Color"
              value={(node as GuiPanel).backgroundColor ?? "#161b22"}
              onChange={(value) =>
                onChange((d) => {
                  (d as GuiPanel).backgroundColor = value;
                })
              }
            />
            <ColorField
              label="Border Color"
              value={(node as GuiPanel).borderColor ?? "#30363d"}
              onChange={(value) =>
                onChange((d) => {
                  (d as GuiPanel).borderColor = value;
                })
              }
            />
            <div className="grid grid-cols-2 gap-1.5">
              <NumberField
                label="Border Width"
                value={(node as GuiPanel).borderWidth ?? 1}
                onChange={(v) =>
                  onChange((d) => {
                    (d as GuiPanel).borderWidth = v;
                  })
                }
              />
              <NumberField
                label="Border Radius"
                value={(node as GuiPanel).borderRadius ?? 4}
                onChange={(v) =>
                  onChange((d) => {
                    (d as GuiPanel).borderRadius = v;
                  })
                }
              />
            </div>
          </AccordionSection>
        )}

        {node.type === "ProgressBar" && (
          <AccordionSection
            icon={<Activity size={12} />}
            label="Progress Bar Properties"
            open={!collapsed.content}
            onToggle={() => toggleCollapse("content")}
          >
            <div className="grid grid-cols-2 gap-1.5">
              <NumberField
                label="Value"
                value={(node as GuiProgressBar).value ?? 100}
                onChange={(v) =>
                  onChange((d) => {
                    (d as GuiProgressBar).value = v;
                  })
                }
              />
              <NumberField
                label="Max Value"
                value={(node as GuiProgressBar).maxValue ?? 100}
                onChange={(v) =>
                  onChange((d) => {
                    (d as GuiProgressBar).maxValue = v;
                  })
                }
              />
            </div>
            <ColorField
              label="Fill Color"
              value={(node as GuiProgressBar).fillColor ?? "#00f0ff"}
              onChange={(value) =>
                onChange((d) => {
                  (d as GuiProgressBar).fillColor = value;
                })
              }
            />
            <ColorField
              label="Background Color"
              value={(node as GuiProgressBar).backgroundColor ?? "#1a1f2c"}
              onChange={(value) =>
                onChange((d) => {
                  (d as GuiProgressBar).backgroundColor = value;
                })
              }
            />
            <CheckboxField
              label="Show Text Label"
              checked={(node as GuiProgressBar).showLabel !== false}
              onChange={(checked) =>
                onChange((d) => {
                  (d as GuiProgressBar).showLabel = checked;
                })
              }
            />
          </AccordionSection>
        )}

        {node.type === "Joystick" && (
          <AccordionSection
            icon={<Gamepad2 size={12} />}
            label="Virtual Joystick Properties"
            open={!collapsed.content}
            onToggle={() => toggleCollapse("content")}
          >
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                Action
              </span>
              <Input
                type="text"
                value={(node as GuiJoystick).action ?? "player.move"}
                onChange={(e) =>
                  onChange((d) => {
                    (d as GuiJoystick).action = e.target.value;
                  })
                }
                placeholder="e.g. player.move"
              />
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <NumberField
                label="Radius"
                value={(node as GuiJoystick).radius ?? 40}
                onChange={(v) =>
                  onChange((d) => {
                    (d as GuiJoystick).radius = v;
                  })
                }
              />
              <NumberField
                label="Deadzone"
                value={(node as GuiJoystick).deadzone ?? 5}
                onChange={(v) =>
                  onChange((d) => {
                    (d as GuiJoystick).deadzone = v;
                  })
                }
              />
            </div>
            <ColorField
              label="Base Color"
              value={(node as GuiJoystick).baseColor ?? "rgba(255,255,255,0.2)"}
              onChange={(value) =>
                onChange((d) => {
                  (d as GuiJoystick).baseColor = value;
                })
              }
            />
            <ColorField
              label="Knob Color"
              value={(node as GuiJoystick).knobColor ?? "#00f0ff"}
              onChange={(value) =>
                onChange((d) => {
                  (d as GuiJoystick).knobColor = value;
                })
              }
            />
          </AccordionSection>
        )}
      </div>
    </aside>
  );
}
