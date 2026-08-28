import { cn } from "@/ui";
import workspaceStyles from "./Workspace.module.css";

export type VirtualInputAction = "left" | "right" | "jump" | "fire" | "action";
export type VirtualTouchControl = "jump" | "fire" | "action";

interface VirtualGameControlsProps {
  controls: VirtualTouchControl[];
  onInput: (action: VirtualInputAction, pressed: boolean) => void;
}

function VirtualButton({
  action,
  children,
  className,
  onInput,
  title,
}: {
  action: VirtualInputAction;
  children: React.ReactNode;
  className?: string;
  onInput: VirtualGameControlsProps["onInput"];
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      className={cn(workspaceStyles["canvas-virtual-btn"], className)}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        onInput(action, true);
      }}
      onPointerUp={(event) => {
        try {
          event.currentTarget.releasePointerCapture(event.pointerId);
        } catch {
          // Pointer capture may already have been released by the browser.
        }
        onInput(action, false);
      }}
      onPointerCancel={() => onInput(action, false)}
    >
      {children}
    </button>
  );
}

export function VirtualGameControls({ controls, onInput }: VirtualGameControlsProps) {
  return (
    <div className={workspaceStyles["canvas-virtual-pad"]} aria-label="Virtual game controls">
      <div className={workspaceStyles["canvas-virtual-pad-move"]} aria-label="Movement">
        <VirtualButton action="left" onInput={onInput}>◀</VirtualButton>
        <VirtualButton action="right" onInput={onInput}>▶</VirtualButton>
      </div>
      <div className={workspaceStyles["canvas-virtual-pad-actions"]} aria-label="Actions">
        {(
          [
            ["jump", "A", "Jump"],
            ["fire", "B", "Fire"],
            ["action", "X", "Action"],
          ] as const
        )
          .filter(([control]) => controls.includes(control))
          .map(([action, label, title]) => (
            <VirtualButton
              key={action}
              action={action}
              title={title}
              onInput={onInput}
              className={cn(
                workspaceStyles["canvas-virtual-btn-action"],
                action === "jump" && workspaceStyles["canvas-virtual-btn-primary"],
              )}
            >
              <span className={workspaceStyles["canvas-virtual-btn-label"]}>{label}</span>
              <span className={workspaceStyles["canvas-virtual-btn-sub"]}>{title}</span>
            </VirtualButton>
          ))}
      </div>
    </div>
  );
}
