import type { ScriptComponent } from "@gamekit/schema";
import { Code2, Plus, Trash2 } from "lucide-react";
import { AccordionSection, Input, Button, IconButton, Select, Textarea, NumberField } from "@/ui";
import { findComponent } from "../../lib/components.js";
import type { OnChange } from "./types.js";

type Props = {
  script: ScriptComponent | undefined;
  onChange: OnChange;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

export function ScriptSection({ script, onChange, open, onToggle, onRemove }: Props) {
  return (
    <AccordionSection
      icon={<Code2 size={12} />}
      label="Behavior Script"
      open={open}
      onToggle={onToggle}
      removable={!!script}
      onRemove={onRemove}
      accent="muted"
    >
      {script ? (
        <>
          <p className="m-0 text-[10px] text-text-muted">
            {script.handlers.length} handler(s). Events fire at runtime.
          </p>
          {script.handlers.map((h, i) => (
            <div key={i} className="rounded-md border border-border-default bg-bg-base p-2 space-y-1.5">
              <label className="flex flex-col gap-1">
                <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Event</span>
                <Input
                  value={h.event}
                  onChange={(e) => onChange((d) => {
                    findComponent<ScriptComponent>(d, "Script")!.handlers[i].event = e.target.value;
                  })}
                  placeholder="onStart | onUpdate | onCollision…"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Actions DSL</span>
                <div className="flex items-center gap-1">
                  <Select
                    value={h.actions[0]?.type ?? ""}
                    className="h-7 flex-1 text-[10px]"
                    onChange={(e) => onChange((d) => {
                      const handler = findComponent<ScriptComponent>(d, "Script")!.handlers[i];
                      if (!e.target.value) return;
                      handler.actions = [{ type: e.target.value }, ...handler.actions.slice(1)];
                    })}
                  >
                    <option value="">Add action type…</option>
                    <option value="playSound">playSound</option>
                    <option value="switchScene">switchScene</option>
                    <option value="destroyEntity">destroyEntity</option>
                    <option value="setVariable">setVariable</option>
                    <option value="applyImpulse">applyImpulse</option>
                    <option value="transitionState">transitionState</option>
                  </Select>
                  <IconButton size="sm" title="Add action" onClick={() => onChange((d) => {
                    findComponent<ScriptComponent>(d, "Script")!.handlers[i].actions.push({ type: "setVariable", key: "", value: true });
                  })}>
                    <Plus size={11} />
                  </IconButton>
                </div>
                {h.actions.map((action, actionIndex) => (
                  <div key={actionIndex} className="flex items-center gap-1 rounded border border-border-default bg-bg-surface px-1.5 py-1">
                    <span className="type-mono min-w-0 flex-1 truncate text-[10px] text-accent-cyan">{action.type}</span>
                    <IconButton size="sm" variant="danger" title="Remove action" onClick={() => onChange((d) => {
                      findComponent<ScriptComponent>(d, "Script")!.handlers[i].actions.splice(actionIndex, 1);
                    })}>
                      <Trash2 size={10} />
                    </IconButton>
                  </div>
                ))}
                {h.actions.map((action, actionIndex) => (
                  <ScriptActionFields
                    key={`${actionIndex}-${action.type}-fields`}
                    action={action}
                    onChange={(next) => onChange((d) => {
                      findComponent<ScriptComponent>(d, "Script")!.handlers[i].actions[actionIndex] = next;
                    })}
                  />
                ))}
                <Textarea
                  className="min-h-[56px] font-mono text-[10px]"
                  value={JSON.stringify(h.actions, null, 0)}
                  onChange={(e) => {
                    try {
                      const actions = JSON.parse(e.target.value);
                      if (!Array.isArray(actions)) return;
                      onChange((d) => {
                        findComponent<ScriptComponent>(d, "Script")!.handlers[i].actions = actions;
                      });
                    } catch { /* ignore */ }
                  }}
                />
              </label>
              <IconButton size="sm" variant="danger" title="Remove handler"
                onClick={() => onChange((d) => {
                  findComponent<ScriptComponent>(d, "Script")!.handlers.splice(i, 1);
                })}
              >
                <Trash2 size={11} />
              </IconButton>
            </div>
          ))}
          <Button size="sm" variant="secondary"
            onClick={() => onChange((d) => {
              findComponent<ScriptComponent>(d, "Script")!.handlers.push({ event: "onStart", actions: [] });
            })}
          >
            Add handler
          </Button>
        </>
      ) : (
        <p className="text-center text-[10px] text-text-muted">No script</p>
      )}
    </AccordionSection>
  );
}

function ScriptActionFields({ action, onChange }: { action: { type: string; [key: string]: unknown }; onChange: (action: { type: string; [key: string]: unknown }) => void }) {
  const textField = (key: string, label: string, placeholder: string) => (
    <Input
      value={typeof action[key] === "string" ? action[key] as string : ""}
      placeholder={placeholder}
      aria-label={label}
      onChange={(event) => onChange({ ...action, [key]: event.target.value })}
    />
  );

  if (action.type === "playSound") return <div className="pl-2">{textField("assetId", "Sound asset ID", "sound asset id")}</div>;
  if (action.type === "switchScene") return <div className="pl-2">{textField("sceneId", "Scene ID", "scene id")}</div>;
  if (action.type === "destroyEntity") return <div className="pl-2">{textField("entityId", "Entity ID", "optional entity id")}</div>;
  if (action.type === "transitionState") return <div className="pl-2">{textField("state", "Target state", "target state")}</div>;
  if (action.type === "setVariable") {
    return (
      <div className="grid grid-cols-2 gap-1 pl-2">
        {textField("key", "Variable key", "key")}
        {textField("value", "Variable value", "value")}
      </div>
    );
  }
  if (action.type === "applyImpulse") {
    const force = typeof action.force === "object" && action.force !== null
      ? action.force as { x?: number; y?: number }
      : { x: 0, y: 0 };
    return (
      <div className="grid grid-cols-2 gap-1 pl-2">
        <NumberField label="Force X" value={force.x ?? 0} onChange={(value) => onChange({ ...action, force: { ...force, x: value } })} />
        <NumberField label="Force Y" value={force.y ?? 0} onChange={(value) => onChange({ ...action, force: { ...force, y: value } })} />
      </div>
    );
  }
  return null;
}
