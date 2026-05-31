import type { GameKitScene } from "@gamekit/schema";
import { createEmptyScene } from "@gamekit/schema";
import { Plus, Trash2, File } from "lucide-react";

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
  onDeleteScene
}: ScenePanelProps) {
  function handleCreate() {
    const name = prompt("Scene name:");
    if (name) {
      onCreateScene(name);
    }
  }

  return (
    <div className="scene-panel">
      <div className="panel-header">
        <h3>Scenes</h3>
        <button type="button" className="icon-button" onClick={handleCreate} title="Create scene">
          <Plus size={14} />
        </button>
      </div>
      <div className="scene-list">
        {scenes.length === 0 && (
          <div className="empty-state">
            <File size={24} />
            <p>No scenes</p>
          </div>
        )}
        {scenes.map((sceneId) => (
          <div
            key={sceneId}
            className={`scene-item ${sceneId === currentSceneId ? "selected" : ""}`}
            onClick={() => onSelectScene(sceneId)}
          >
            <span className="scene-name">{sceneId.replace(".scene.json", "")}</span>
            <button
              type="button"
              className="icon-button danger"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete scene "${sceneId}"?`)) {
                  onDeleteScene(sceneId);
                }
              }}
              title="Delete scene"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
