import type { ScriptComponent } from "@gamekit/schema";
import { Code2, Trash2 } from "lucide-react";
import { AccordionSection, Input, Button, IconButton, Textarea } from "@/ui";
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
                <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Actions JSON</span>
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
