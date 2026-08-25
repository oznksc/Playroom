import { Columns2, Rows2, Square, X } from "lucide-react";
import type { ReactNode } from "react";
import {
  focusedSceneFile,
  paneFile,
  sceneTabLabel,
  type ScenePaneId,
  type SceneWorkspaceState,
  type SplitMode,
} from "../lib/scene-workspace.js";
import { cn } from "@/ui";

type SceneTabBarProps = {
  workspace: SceneWorkspaceState;
  dirtyFiles: Set<string>;
  scenes: string[];
  onSelectTab: (file: string) => void;
  onCloseTab: (file: string) => void;
  onSplitChange: (split: SplitMode) => void;
};

export function SceneTabBar({
  workspace,
  dirtyFiles,
  scenes,
  onSelectTab,
  onCloseTab,
  onSplitChange,
}: SceneTabBarProps) {
  const active = focusedSceneFile(workspace);
  const canSplit = scenes.length > 1 || workspace.openTabs.length > 1;

  return (
    <div className="scene-tab-bar" role="tablist" aria-label="Open scenes">
      <div className="scene-tab-bar-tabs">
        {workspace.openTabs.map((file) => {
          const selected = file === active;
          return (
            <button
              key={file}
              type="button"
              role="tab"
              aria-selected={selected}
              data-testid={`scene-tab-${file}`}
              className={cn("scene-tab", selected && "active")}
              onClick={() => onSelectTab(file)}
              title={file}
            >
              <span className="scene-tab-label">{sceneTabLabel(file)}</span>
              {dirtyFiles.has(file) && <span className="scene-tab-dirty" aria-label="Unsaved" />}
              {workspace.openTabs.length > 1 && (
                <span
                  className="scene-tab-close"
                  role="button"
                  tabIndex={0}
                  title="Close tab"
                  onClick={(event) => {
                    event.stopPropagation();
                    onCloseTab(file);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      onCloseTab(file);
                    }
                  }}
                >
                  <X size={10} strokeWidth={2} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="scene-tab-bar-split" role="group" aria-label="Split view">
        <SplitButton
          label="Single"
          active={workspace.split === "none"}
          disabled={!canSplit && workspace.split === "none"}
          onClick={() => onSplitChange("none")}
        >
          <Square size={12} strokeWidth={1.75} />
        </SplitButton>
        <SplitButton
          label="Split left/right"
          active={workspace.split === "horizontal"}
          disabled={!canSplit}
          onClick={() => onSplitChange("horizontal")}
        >
          <Columns2 size={12} strokeWidth={1.75} />
        </SplitButton>
        <SplitButton
          label="Split top/bottom"
          active={workspace.split === "vertical"}
          disabled={!canSplit}
          onClick={() => onSplitChange("vertical")}
        >
          <Rows2 size={12} strokeWidth={1.75} />
        </SplitButton>
      </div>
    </div>
  );
}

function SplitButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn("scene-split-btn", active && "active")}
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

type ScenePanesProps = {
  workspace: SceneWorkspaceState;
  onFocusPane: (pane: ScenePaneId) => void;
  renderPane: (pane: ScenePaneId, file: string, focused: boolean) => ReactNode;
};

export function ScenePanes({ workspace, onFocusPane, renderPane }: ScenePanesProps) {
  const panes: Array<{ id: ScenePaneId; file: string }> = [{ id: "a", file: workspace.paneA }];
  const b = paneFile(workspace, "b");
  if (workspace.split !== "none" && b) panes.push({ id: "b", file: b });

  return (
    <div
      className={cn(
        "scene-panes",
        workspace.split === "horizontal" && "split-h",
        workspace.split === "vertical" && "split-v",
      )}
    >
      {panes.map(({ id, file }) => {
        const focused = (workspace.focused === id || workspace.split === "none") && focusedSceneFile(workspace) === file
          ? true
          : workspace.split === "none"
            ? id === "a"
            : workspace.focused === id;
        return (
          <div
            key={id}
            className={cn("scene-pane", focused && "focused")}
            data-testid={`scene-pane-${id}`}
            onPointerDownCapture={() => {
              if (!focused) onFocusPane(id);
            }}
          >
            {workspace.split !== "none" && (
              <span className="scene-pane-caption type-label">{sceneTabLabel(file)}</span>
            )}
            {renderPane(id, file, focused)}
          </div>
        );
      })}
    </div>
  );
}
