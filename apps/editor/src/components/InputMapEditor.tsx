import type { InputMapConfig, TouchControl } from "@gamekit/schema";
import { DEFAULT_INPUT_MAP } from "@gamekit/schema";
import { Gamepad2, Plus, Trash2, RotateCcw } from "lucide-react";
import {
  AccordionSection,
  Input,
  Select,
  IconButton,
  Button,
} from "@/ui";

type BindingDraft = {
  action: string;
  keys: string;
  touchControl: "" | TouchControl;
  gamepad: string;
};

type InputMapEditorProps = {
  inputMap?: InputMapConfig;
  open: boolean;
  onToggle: () => void;
  onChange: (next: InputMapConfig) => void;
};

const TOUCH_OPTIONS: Array<"" | TouchControl> = [
  "",
  "left",
  "right",
  "jump",
  "fire",
  "action",
];

function toDraft(map?: InputMapConfig): BindingDraft[] {
  const source = map?.bindings?.length ? map : DEFAULT_INPUT_MAP;
  return source.bindings.map((b) => ({
    action: b.action,
    keys: b.keys.join(", "),
    touchControl: (b.touchControl ?? "") as "" | TouchControl,
    gamepad: b.gamepad ?? "",
  }));
}

function fromDraft(drafts: BindingDraft[]): InputMapConfig {
  return {
    bindings: drafts
      .filter((d) => d.action.trim().length > 0)
      .map((d) => ({
        action: d.action.trim(),
        keys: d.keys
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        ...(d.touchControl ? { touchControl: d.touchControl } : {}),
        ...(d.gamepad.trim() ? { gamepad: d.gamepad.trim() } : {}),
      })),
  };
}

/**
 * Edit scene.inputMap bindings: keyboard keys, on-screen touch controls, gamepad.
 */
export function InputMapEditor({ inputMap, open, onToggle, onChange }: InputMapEditorProps) {
  const drafts = toDraft(inputMap);

  function commit(next: BindingDraft[]) {
    onChange(fromDraft(next));
  }

  function updateRow(index: number, patch: Partial<BindingDraft>) {
    const next = drafts.map((row, i) => (i === index ? { ...row, ...patch } : row));
    commit(next);
  }

  function removeRow(index: number) {
    commit(drafts.filter((_, i) => i !== index));
  }

  function addRow() {
    commit([
      ...drafts,
      { action: "custom", keys: "", touchControl: "", gamepad: "" },
    ]);
  }

  return (
    <AccordionSection
      icon={<Gamepad2 size={12} />}
      label="Input & controls"
      open={open}
      onToggle={onToggle}
    >
      <p className="text-[10px] leading-snug text-text-muted">
        Map actions to keys, on-screen buttons (jump/fire/action), and gamepad.
        Play mode and mobile export both read this map.
      </p>

      <div className="space-y-2">
        {drafts.map((row, index) => (
          <div
            key={`${row.action}-${index}`}
            className="rounded-md border border-border-default/70 bg-bg-elevated/40 p-1.5 space-y-1.5"
          >
            <div className="flex items-center gap-1">
              <Input
                className="flex-1 font-mono text-[11px]"
                value={row.action}
                placeholder="action"
                onChange={(e) => updateRow(index, { action: e.target.value })}
              />
              <IconButton
                size="sm"
                variant="danger"
                title="Remove binding"
                onClick={() => removeRow(index)}
              >
                <Trash2 size={12} />
              </IconButton>
            </div>
            <label className="flex flex-col gap-0.5">
              <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                Keys (comma-separated)
              </span>
              <Input
                className="font-mono text-[11px]"
                value={row.keys}
                placeholder="ArrowLeft, a, A"
                onChange={(e) => updateRow(index, { keys: e.target.value })}
              />
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <label className="flex flex-col gap-0.5">
                <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                  Touch
                </span>
                <Select
                  value={row.touchControl}
                  onChange={(e) =>
                    updateRow(index, {
                      touchControl: e.target.value as "" | TouchControl,
                    })
                  }
                >
                  {TOUCH_OPTIONS.map((opt) => (
                    <option key={opt || "none"} value={opt}>
                      {opt || "— none —"}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                  Gamepad
                </span>
                <Input
                  className="font-mono text-[11px]"
                  value={row.gamepad}
                  placeholder="A / LEFT_STICK_X_NEG"
                  onChange={(e) => updateRow(index, { gamepad: e.target.value })}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        <Button type="button" size="sm" variant="secondary" onClick={addRow}>
          <Plus size={12} />
          Add binding
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onChange(structuredClone(DEFAULT_INPUT_MAP))}
        >
          <RotateCcw size={12} />
          Reset defaults
        </Button>
      </div>
    </AccordionSection>
  );
}
