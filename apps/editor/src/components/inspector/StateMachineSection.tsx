import type { StateMachineComponent } from "@gamekit/schema";
import { GitBranch, Trash2 } from "lucide-react";
import { AccordionSection, Select, Input, IconButton, Button } from "@/ui";
import { findComponent } from "../../lib/components.js";
import { useState } from "react";
import type { OnChange } from "./types.js";

type Props = {
  stateMachine: StateMachineComponent | undefined;
  onChange: OnChange;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
};

type AddTransitionFormProps = {
  stateIndex: number;
  states: { name: string }[];
  onChange: OnChange;
};

function AddTransitionForm({ stateIndex, states, onChange }: AddTransitionFormProps) {
  const [eventInput, setEventInput] = useState("");
  const [targetState, setTargetState] = useState("");

  const handleAdd = () => {
    const trimmedEvent = eventInput.trim();
    const resolvedTarget = targetState || (states[0]?.name ?? "");
    if (!trimmedEvent || !resolvedTarget) return;
    onChange((d) => {
      const sm = findComponent<StateMachineComponent>(d, "StateMachine");
      if (sm) {
        const state = sm.states[stateIndex];
        if (!state.on) state.on = {};
        state.on[trimmedEvent] = resolvedTarget;
      }
    });
    setEventInput("");
  };

  return (
    <div className="flex gap-1 mt-1.5 items-center">
      <Input
        placeholder="event (e.g. collisionEnter)"
        className="h-7 text-[11px] px-2 w-[140px] shrink-0"
        value={eventInput}
        onChange={(e) => setEventInput(e.target.value)}
      />
      <Select
        value={targetState || (states[0]?.name ?? "")}
        className="h-7 py-0 text-[11px] px-1.5"
        onChange={(e) => setTargetState(e.target.value)}
      >
        {states.map((s) => (
          <option key={s.name} value={s.name}>{s.name}</option>
        ))}
      </Select>
      <Button
        size="sm"
        className="h-7 text-[10px] px-2.5 shrink-0"
        disabled={!eventInput.trim() || (!targetState && !states[0]?.name)}
        onClick={handleAdd}
      >
        Add
      </Button>
    </div>
  );
}

export function StateMachineSection({ stateMachine, onChange, open, onToggle, onRemove }: Props) {
  return (
    <AccordionSection
      icon={<GitBranch size={12} />}
      label="FSM State Machine"
      open={open}
      onToggle={onToggle}
      removable={!!stateMachine}
      onRemove={onRemove}
      accent="purple"
    >
      {stateMachine ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">Initial state</span>
            <Input
              value={stateMachine.initialState}
              onChange={(e) => onChange((d) => {
                findComponent<StateMachineComponent>(d, "StateMachine")!.initialState = e.target.value;
              })}
            />
          </label>
          <div className="space-y-2.5">
            <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">States</span>
            {stateMachine.states.map((st, i) => (
              <div key={i} className="border border-white/[0.06] rounded-[6px] p-2 space-y-2 bg-black/10">
                <div className="flex items-center gap-1">
                  <Input
                    value={st.name}
                    onChange={(e) => onChange((d) => {
                      const sm = findComponent<StateMachineComponent>(d, "StateMachine")!;
                      const oldName = sm.states[i].name;
                      const newName = e.target.value;
                      if (sm.initialState === oldName) sm.initialState = newName;
                      for (const s of sm.states) {
                        if (s.on) {
                          for (const [evt, target] of Object.entries(s.on)) {
                            if (target === oldName) s.on[evt] = newName;
                          }
                        }
                      }
                      sm.states[i].name = newName;
                    })}
                  />
                  <IconButton size="sm" variant="danger" title="Remove state"
                    onClick={() => onChange((d) => {
                      const sm = findComponent<StateMachineComponent>(d, "StateMachine")!;
                      const stateToRemove = sm.states[i].name;
                      sm.states.splice(i, 1);
                      if (sm.initialState === stateToRemove) sm.initialState = sm.states[0]?.name ?? "";
                      for (const s of sm.states) {
                        if (s.on) {
                          for (const [evt, target] of Object.entries(s.on)) {
                            if (target === stateToRemove) delete s.on[evt];
                          }
                        }
                      }
                    })}
                  >
                    <Trash2 size={11} />
                  </IconButton>
                </div>
                <div className="space-y-1.5 pl-2 border-l-2 border-purple-500/20">
                  <span className="text-[8px] font-semibold uppercase tracking-wide text-text-muted">Transitions</span>
                  {Object.entries(st.on || {}).map(([evt, target]) => (
                    <div key={evt} className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-text-muted font-mono truncate max-w-[80px]" title={evt}>{evt}:</span>
                      <Select
                        value={target}
                        className="h-6 py-0 text-[11px] px-1.5"
                        onChange={(e) => onChange((d) => {
                          const sm = findComponent<StateMachineComponent>(d, "StateMachine")!;
                          const s = sm.states[i];
                          if (s.on) s.on[evt] = e.target.value;
                        })}
                      >
                        {stateMachine.states.map((s) => (
                          <option key={s.name} value={s.name}>{s.name}</option>
                        ))}
                      </Select>
                      <IconButton size="sm" variant="ghost" title="Remove transition"
                        onClick={() => onChange((d) => {
                          const sm = findComponent<StateMachineComponent>(d, "StateMachine")!;
                          const s = sm.states[i];
                          if (s.on) delete s.on[evt];
                        })}
                      >
                        <Trash2 size={10} />
                      </IconButton>
                    </div>
                  ))}
                  <AddTransitionForm stateIndex={i} states={stateMachine.states} onChange={onChange} />
                </div>
              </div>
            ))}
            <Button size="sm" variant="secondary"
              onClick={() => onChange((d) => {
                findComponent<StateMachineComponent>(d, "StateMachine")!.states.push({
                  name: `state_${stateMachine.states.length}`,
                });
              })}
            >
              Add state
            </Button>
          </div>
        </>
      ) : (
        <p className="text-center text-[10px] text-text-muted">No state machine</p>
      )}
    </AccordionSection>
  );
}
