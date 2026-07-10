import { Plus, Trash2, FileCode } from "lucide-react";

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
    const name = prompt("Enter scene configuration filename (e.g. gameplay):");
    if (name) {
      onCreateScene(name);
    }
  }

  return (
    <div className="scene-panel">
      <div className="scene-panel-header">
        <h3>Scenes</h3>
        <button
          type="button"
          className="icon-button"
          onClick={handleCreate}
          title="Create new scene configuration"
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="scene-list-scroll">
        {scenes.length === 0 ? (
          <div className="hierarchy-empty">
            <FileCode size={20} style={{ opacity: 0.2 }} />
            <p>No scene configs found</p>
          </div>
        ) : (
          scenes.map((sceneId) => (
            <div
              key={sceneId}
              className={`scene-item ${sceneId === currentSceneId ? "selected" : ""}`}
              onClick={() => onSelectScene(sceneId)}
            >
              <span className="scene-name">
                {sceneId.replace(".scene.json", "")}
                {sceneId === currentSceneId ? (
                  <span className="scene-active-badge">active</span>
                ) : null}
              </span>
              <button
                type="button"
                className="scene-item-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Are you sure you want to delete scene "${sceneId}"?`)) {
                    onDeleteScene(sceneId);
                  }
                }}
                title="Delete scene config"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
