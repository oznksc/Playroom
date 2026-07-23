import type {
  FallDeathAction,
  GameKitScene,
  GameRuleObjective,
  GameRulesConfig,
  Orientation,
  ResponsiveConfig,
  ScriptAction,
} from "@gamekit/schema";
import { createId, resolveGameRules } from "@gamekit/schema";
import { Settings, Monitor, Shield, Gauge, Globe, Skull, Plus, Trash2, Flag, Trophy } from "lucide-react";
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
  IconButton,
  Button,
} from "@/ui";
import { InputMapEditor } from "./InputMapEditor.js";

type SceneSettingsProps = {
  scene: GameKitScene;
  onChange: (mutator: (scene: GameKitScene) => void) => void;
};

function ensureGameRules(draft: GameKitScene): GameRulesConfig {
  if (!draft.gameRules) {
    draft.gameRules = resolveGameRules();
  }
  const gr = draft.gameRules;
  if (!gr.objectives) gr.objectives = [];
  if (!gr.hazards) gr.hazards = [];
  if (!gr.onWin) gr.onWin = [];
  if (!gr.onLose) gr.onLose = [];
  if (!gr.onStart) gr.onStart = [];
  if (!gr.objectiveMode) gr.objectiveMode = "all";
  return gr;
}

const OUTCOME_ACTION_TYPES = [
  "completeLevel",
  "nextScene",
  "nextLevel",
  "win",
  "lose",
  "respawn",
  "setVariable",
  "incrementVariable",
] as const;

/**
 * World / scene settings panel — viewport, gravity, game rules, responsive, safe area.
 * Lives as its own left-sheet workspace (not inside the entity inspector).
 */
export function SceneSettings({ scene, onChange }: SceneSettingsProps) {
  const responsive = scene.responsive;
  const rules = resolveGameRules(scene.gameRules);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    Scene: false,
    Gravity: false,
    GameRules: false,
    Input: false,
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
        <PanelTitle>
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
          icon={<Skull size={12} />}
          label="Game rules"
          open={!collapsed.GameRules}
          onToggle={() => toggleCollapse("GameRules")}
        >
          <p className="text-[10px] leading-snug text-text-muted">
            Session, hazards, objectives, and outcome actions. Tag entities (
            <span className="font-mono">coin</span>, <span className="font-mono">goal</span>) for collect/reach.
          </p>

          <div className="border-t border-border-default pt-2 mt-1 space-y-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Session</span>
            <CheckboxField
              label="Fall death (void)"
              checked={rules.fallDeathEnabled !== false}
              onChange={(checked) =>
                onChange((draft) => {
                  ensureGameRules(draft).fallDeathEnabled = checked;
                })
              }
            />
            <div className="grid grid-cols-2 gap-1.5">
              <NumberField
                label="Fall Y"
                value={typeof rules.fallY === "number" ? rules.fallY : 0}
                onChange={(value) =>
                  onChange((draft) => {
                    const gr = ensureGameRules(draft);
                    if (!value) {
                      delete gr.fallY;
                    } else {
                      gr.fallY = value;
                    }
                  })
                }
              />
              <NumberField
                label="Margin"
                value={rules.fallMargin}
                onChange={(value) =>
                  onChange((draft) => {
                    ensureGameRules(draft).fallMargin = value;
                  })
                }
              />
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold tracking-[-0.01em] text-text-muted">
                On fall
              </span>
              <Select
                value={rules.onFall}
                onChange={(event) =>
                  onChange((draft) => {
                    ensureGameRules(draft).onFall = event.target.value as FallDeathAction;
                  })
                }
              >
                <option value="gameOver">Game over</option>
                <option value="respawn">Respawn</option>
              </Select>
            </label>
            <NumberField
              label="Lives (0 = unlimited)"
              value={rules.lives}
              onChange={(value) =>
                onChange((draft) => {
                  ensureGameRules(draft).lives = Math.max(0, Math.floor(value));
                })
              }
            />
            <div className="grid grid-cols-2 gap-1.5">
              <NumberField
                label="Spawn X"
                value={rules.spawnPoint?.x ?? 0}
                onChange={(value) =>
                  onChange((draft) => {
                    const gr = ensureGameRules(draft);
                    gr.spawnPoint = {
                      x: value,
                      y: gr.spawnPoint?.y ?? 0,
                    };
                  })
                }
              />
              <NumberField
                label="Spawn Y"
                value={rules.spawnPoint?.y ?? 0}
                onChange={(value) =>
                  onChange((draft) => {
                    const gr = ensureGameRules(draft);
                    gr.spawnPoint = {
                      x: gr.spawnPoint?.x ?? 0,
                      y: value,
                    };
                  })
                }
              />
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold tracking-[-0.01em] text-text-muted">
                Game over message
              </span>
              <Input
                value={rules.gameOverMessage}
                onChange={(event) =>
                  onChange((draft) => {
                    ensureGameRules(draft).gameOverMessage = event.target.value;
                  })
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold tracking-[-0.01em] text-text-muted">
                Win message
              </span>
              <Input
                value={rules.winMessage}
                onChange={(event) =>
                  onChange((draft) => {
                    ensureGameRules(draft).winMessage = event.target.value;
                  })
                }
              />
            </label>
          </div>

          <div className="border-t border-border-default pt-2 mt-2 space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                <Flag size={10} /> Objectives
              </span>
              <IconButton
                size="sm"
                title="Add objective"
                onClick={() =>
                  onChange((draft) => {
                    const gr = ensureGameRules(draft);
                    gr.objectives.push({
                      id: createId("obj"),
                      type: "collect",
                      tag: "coin",
                      count: 0,
                    } as GameRuleObjective);
                  })
                }
              >
                <Plus size={11} />
              </IconButton>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold tracking-[-0.01em] text-text-muted">
                Mode
              </span>
              <Select
                value={rules.objectiveMode ?? "all"}
                onChange={(event) =>
                  onChange((draft) => {
                    ensureGameRules(draft).objectiveMode = event.target.value as "all" | "any";
                  })
                }
              >
                <option value="all">All required</option>
                <option value="any">Any one</option>
              </Select>
            </label>
            {(rules.objectives ?? []).length === 0 && (
              <p className="text-[10px] text-text-muted">
                No objectives — win only via script action <span className="font-mono">win</span>.
              </p>
            )}
            {(rules.objectives ?? []).map((obj, index) => (
              <div
                key={obj.id || index}
                className="space-y-1 rounded-md border border-border-default bg-bg-base p-1.5"
              >
                <div className="flex items-center gap-1">
                  <Select
                    value={typeof obj.type === "string" ? obj.type : "collect"}
                    className="h-7 flex-1 text-[10px]"
                    onChange={(event) =>
                      onChange((draft) => {
                        const o = ensureGameRules(draft).objectives[index];
                        o.type = event.target.value;
                        if (event.target.value === "collect" && o.tag == null) o.tag = "coin";
                        if (event.target.value === "reach" && o.tag == null) o.tag = "goal";
                        if (event.target.value === "survive" && o.seconds == null) o.seconds = 30;
                        if (event.target.value === "variable") {
                          if (o.key == null) o.key = "score";
                          if (o.op == null) o.op = "gte";
                          if (o.value == null) o.value = 10;
                        }
                      })
                    }
                  >
                    <option value="collect">Collect tag</option>
                    <option value="reach">Reach tag/entity</option>
                    <option value="survive">Survive (seconds)</option>
                    <option value="variable">Variable compare</option>
                    <option value="manual">Manual (script)</option>
                  </Select>
                  <IconButton
                    size="sm"
                    variant="danger"
                    title="Remove objective"
                    onClick={() =>
                      onChange((draft) => {
                        ensureGameRules(draft).objectives.splice(index, 1);
                      })
                    }
                  >
                    <Trash2 size={10} />
                  </IconButton>
                </div>
                {(obj.type === "collect" || obj.type === "reach") && (
                  <div className="grid grid-cols-2 gap-1">
                    <label className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-text-muted">Tag</span>
                      <Input
                        value={typeof obj.tag === "string" ? obj.tag : ""}
                        className="h-7 text-[10px]"
                        onChange={(event) =>
                          onChange((draft) => {
                            ensureGameRules(draft).objectives[index].tag = event.target.value;
                          })
                        }
                      />
                    </label>
                    {obj.type === "collect" ? (
                      <NumberField
                        label="Count (0=all)"
                        value={typeof obj.count === "number" ? obj.count : 0}
                        onChange={(value) =>
                          onChange((draft) => {
                            ensureGameRules(draft).objectives[index].count = Math.max(0, Math.floor(value));
                          })
                        }
                      />
                    ) : (
                      <label className="flex flex-col gap-0.5">
                        <span className="text-[9px] text-text-muted">Entity id</span>
                        <Input
                          value={typeof obj.entityId === "string" ? obj.entityId : ""}
                          className="h-7 text-[10px]"
                          placeholder="optional"
                          onChange={(event) =>
                            onChange((draft) => {
                              const o = ensureGameRules(draft).objectives[index];
                              if (event.target.value) o.entityId = event.target.value;
                              else delete o.entityId;
                            })
                          }
                        />
                      </label>
                    )}
                  </div>
                )}
                {obj.type === "survive" && (
                  <NumberField
                    label="Seconds"
                    value={typeof obj.seconds === "number" ? obj.seconds : 30}
                    onChange={(value) =>
                      onChange((draft) => {
                        ensureGameRules(draft).objectives[index].seconds = Math.max(0, value);
                      })
                    }
                  />
                )}
                {obj.type === "variable" && (
                  <div className="grid grid-cols-3 gap-1">
                    <label className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-text-muted">Key</span>
                      <Input
                        value={typeof obj.key === "string" ? obj.key : ""}
                        className="h-7 text-[10px]"
                        onChange={(event) =>
                          onChange((draft) => {
                            ensureGameRules(draft).objectives[index].key = event.target.value;
                          })
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-text-muted">Op</span>
                      <Select
                        value={typeof obj.op === "string" ? obj.op : "gte"}
                        className="h-7 text-[10px]"
                        onChange={(event) =>
                          onChange((draft) => {
                            ensureGameRules(draft).objectives[index].op = event.target.value;
                          })
                        }
                      >
                        <option value="eq">eq</option>
                        <option value="gte">gte</option>
                        <option value="lte">lte</option>
                        <option value="truthy">truthy</option>
                      </Select>
                    </label>
                    <NumberField
                      label="Value"
                      value={typeof obj.value === "number" ? obj.value : 0}
                      onChange={(value) =>
                        onChange((draft) => {
                          ensureGameRules(draft).objectives[index].value = value;
                        })
                      }
                    />
                  </div>
                )}
                <span className="type-mono text-[9px] text-text-muted">{obj.id}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-border-default pt-2 mt-2 space-y-1.5">
            <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-text-muted">
              <Trophy size={10} /> On win actions
            </span>
            <p className="text-[10px] text-text-muted">
              Empty = default <span className="font-mono">completeLevel</span> when a scene manager is present.
            </p>
            {(rules.onWin ?? []).map((action, index) => (
              <div key={index} className="flex items-center gap-1">
                <Select
                  value={action.type}
                  className="h-7 flex-1 text-[10px]"
                  onChange={(event) =>
                    onChange((draft) => {
                      ensureGameRules(draft).onWin[index] = { type: event.target.value } as ScriptAction;
                    })
                  }
                >
                  {OUTCOME_ACTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
                <IconButton
                  size="sm"
                  variant="danger"
                  title="Remove"
                  onClick={() =>
                    onChange((draft) => {
                      ensureGameRules(draft).onWin.splice(index, 1);
                    })
                  }
                >
                  <Trash2 size={10} />
                </IconButton>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full text-[10px]"
              onClick={() =>
                onChange((draft) => {
                  ensureGameRules(draft).onWin.push({ type: "completeLevel" });
                })
              }
            >
              <Plus size={11} /> Add onWin action
            </Button>
            <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
              On lose actions
            </span>
            {(rules.onLose ?? []).map((action, index) => (
              <div key={index} className="flex items-center gap-1">
                <Select
                  value={action.type}
                  className="h-7 flex-1 text-[10px]"
                  onChange={(event) =>
                    onChange((draft) => {
                      ensureGameRules(draft).onLose[index] = { type: event.target.value } as ScriptAction;
                    })
                  }
                >
                  {OUTCOME_ACTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
                <IconButton
                  size="sm"
                  variant="danger"
                  title="Remove"
                  onClick={() =>
                    onChange((draft) => {
                      ensureGameRules(draft).onLose.splice(index, 1);
                    })
                  }
                >
                  <Trash2 size={10} />
                </IconButton>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full text-[10px]"
              onClick={() =>
                onChange((draft) => {
                  ensureGameRules(draft).onLose.push({ type: "respawn" });
                })
              }
            >
              <Plus size={11} /> Add onLose action
            </Button>
          </div>
        </AccordionSection>

        <InputMapEditor
          inputMap={scene.inputMap}
          open={!collapsed.Input}
          onToggle={() => toggleCollapse("Input")}
          onChange={(next) =>
            onChange((draft) => {
              draft.inputMap = next;
            })
          }
        />

        <AccordionSection
          icon={<Monitor size={12} />}
          label="Responsive"
          open={!collapsed.Responsive}
          onToggle={() => toggleCollapse("Responsive")}
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
