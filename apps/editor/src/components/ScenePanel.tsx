import { Plus, Trash2, FileCode } from "lucide-react";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelBody,
  IconButton,
  EmptyState,
  Badge,
  cn,
} from "@/ui";

type ScenePanelProps = {
  scenes: string[];
  currentSceneId: string | null;
  onSelectScene: (sceneId: string) => void;
  onCreateScene: (name: string) => void;
  onDeleteScene: (sceneId: string) => void;
};

export function ScenePanel({
  scenes,
  currentSceneId,
  onSelectScene,
  onCreateScene,
  onDeleteScene,
}: ScenePanelProps) {
  function handleCreate() {
    const name = prompt("Enter scene configuration filename (e.g. gameplay):");
    if (name) onCreateScene(name);
  }

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Scenes</PanelTitle>
        <IconButton size="sm" onClick={handleCreate} title="Create scene">
          <Plus size={13} />
        </IconButton>
      </PanelHeader>
      <PanelBody className="space-y-0.5 p-1.5">
        {scenes.length === 0 ? (
          <EmptyState
            icon={<FileCode size={16} />}
            title="No scenes"
            description="Create a scene configuration to start editing."
          />
        ) : (
          scenes.map((sceneId) => {
            const active = sceneId === currentSceneId;
            return (
              <div
                key={sceneId}
                role="button"
                tabIndex={0}
                data-selected={active}
                className={cn("list-row cursor-pointer")}
                onClick={() => onSelectScene(sceneId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectScene(sceneId);
                  }
                }}
              >
                <FileCode size={12} className="shrink-0 text-accent" />
                <span className="min-w-0 flex-1 truncate text-[12px] text-text-primary">
                  {sceneId.replace(".scene.json", "")}
                </span>
                {active && <Badge variant="accent">active</Badge>}
                <IconButton
                  size="sm"
                  variant="danger"
                  title="Delete scene"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete scene "${sceneId}"?`)) onDeleteScene(sceneId);
                  }}
                >
                  <Trash2 size={11} />
                </IconButton>
              </div>
            );
          })
        )}
      </PanelBody>
    </Panel>
  );
}
