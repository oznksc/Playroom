import type { GameKitLevel } from "@gamekit/schema";
import { createLevel } from "@gamekit/schema";
import { Plus, Trash2, Lock, Unlock, GripVertical } from "lucide-react";

type LevelPanelProps = {
  levels: GameKitLevel[];
  scenes: string[];
  currentLevelId: string | null;
  onSelectLevel: (levelId: string) => void;
  onCreateLevel: (name: string) => void;
  onDeleteLevel: (levelId: string) => void;
  onToggleUnlock: (levelId: string) => void;
  onReorderLevels: (levels: GameKitLevel[]) => void;
  onAssignScene: (levelId: string, sceneId: string) => void;
  onRemoveScene: (levelId: string, sceneId: string) => void;
};

export function LevelPanel({
  levels,
  scenes,
  currentLevelId,
  onSelectLevel,
  onCreateLevel,
  onDeleteLevel,
  onToggleUnlock,
  onReorderLevels,
  onAssignScene,
  onRemoveScene
}: LevelPanelProps) {
  function handleCreate() {
    const name = prompt("Level name:");
    if (name) {
      onCreateLevel(name);
    }
  }

  function handleMoveUp(level: GameKitLevel) {
    const sorted = [...levels].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((l) => l.id === level.id);
    if (index > 0) {
      const prev = sorted[index - 1];
      sorted[index - 1] = { ...level, order: prev.order };
      sorted[index] = { ...prev, order: level.order };
      onReorderLevels(sorted);
    }
  }

  function handleMoveDown(level: GameKitLevel) {
    const sorted = [...levels].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((l) => l.id === level.id);
    if (index < sorted.length - 1) {
      const next = sorted[index + 1];
      sorted[index + 1] = { ...level, order: next.order };
      sorted[index] = { ...next, order: level.order };
      onReorderLevels(sorted);
    }
  }

  const sortedLevels = [...levels].sort((a, b) => a.order - b.order);

  return (
    <div className="level-panel">
      <div className="panel-header">
        <h3>Levels</h3>
        <button type="button" className="icon-button" onClick={handleCreate} title="Create level">
          <Plus size={14} />
        </button>
      </div>
      <div className="level-list">
        {sortedLevels.length === 0 && (
          <div className="empty-state">
            <p>No levels defined</p>
          </div>
        )}
        {sortedLevels.map((level) => (
          <div
            key={level.id}
            className={`level-item ${level.id === currentLevelId ? "selected" : ""}`}
            onClick={() => onSelectLevel(level.id)}
          >
            <div className="level-header">
              <GripVertical size={12} className="drag-handle" />
              <span className="level-order">{level.order}</span>
              <span className="level-name">{level.name}</span>
              <div className="level-actions">
                <button
                  type="button"
                  className="icon-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveUp(level);
                  }}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveDown(level);
                  }}
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleUnlock(level.id);
                  }}
                  title={level.unlocked ? "Lock level" : "Unlock level"}
                >
                  {level.unlocked ? <Unlock size={12} /> : <Lock size={12} />}
                </button>
                <button
                  type="button"
                  className="icon-button danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete level "${level.name}"?`)) {
                      onDeleteLevel(level.id);
                    }
                  }}
                  title="Delete level"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
            <div className="level-scenes">
              {level.sceneIds.length === 0 && (
                <span className="empty-scenes">No scenes assigned</span>
              )}
              {level.sceneIds.map((sceneId) => (
                <div key={sceneId} className="level-scene-item">
                  <span>{sceneId.replace(".scene.json", "")}</span>
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveScene(level.id, sceneId);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <select
                className="scene-assign-select"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    onAssignScene(level.id, e.target.value);
                  }
                }}
              >
                <option value="">Add scene...</option>
                {scenes
                  .filter((s) => !level.sceneIds.includes(s))
                  .map((sceneId) => (
                    <option key={sceneId} value={sceneId}>
                      {sceneId.replace(".scene.json", "")}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
