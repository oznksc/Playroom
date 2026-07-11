import type { GameKitLevel } from "@gamekit/schema";
import { Plus, Trash2, Lock, Unlock, GripVertical, FileCode } from "lucide-react";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelBody,
  IconButton,
  EmptyState,
  Select,
  Badge,
  cn,
} from "@/ui";

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
  onRemoveScene,
}: LevelPanelProps) {
  function handleCreate() {
    const name = prompt("Enter level name:");
    if (name) onCreateLevel(name);
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
    <Panel>
      <PanelHeader>
        <PanelTitle accent="gold">Levels</PanelTitle>
        <IconButton size="sm" onClick={handleCreate} title="Create level">
          <Plus size={13} />
        </IconButton>
      </PanelHeader>
      <PanelBody className="space-y-2 p-1.5">
        {sortedLevels.length === 0 ? (
          <EmptyState
            icon={<FileCode size={16} />}
            title="No levels"
            description="Create a level and attach scene configs."
          />
        ) : (
          sortedLevels.map((level) => {
            const active = level.id === currentLevelId;
            return (
              <div
                key={level.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectLevel(level.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectLevel(level.id);
                  }
                }}
                className={cn(
                  "rounded-[12px] border p-2 transition-colors",
                  active
                    ? "border-accent/40 bg-[rgba(0,240,255,0.1)]"
                    : "border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08]"
                )}
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  <GripVertical size={11} className="text-text-muted" />
                  <Badge variant="mono">{level.order}</Badge>
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-text-primary">
                    {level.name}
                  </span>
                  <IconButton size="sm" title="Move up" onClick={(e) => { e.stopPropagation(); handleMoveUp(level); }}>
                    <span className="text-[9px]">▲</span>
                  </IconButton>
                  <IconButton size="sm" title="Move down" onClick={(e) => { e.stopPropagation(); handleMoveDown(level); }}>
                    <span className="text-[9px]">▼</span>
                  </IconButton>
                  <IconButton
                    size="sm"
                    title={level.unlocked ? "Lock" : "Unlock"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleUnlock(level.id);
                    }}
                  >
                    {level.unlocked ? <Unlock size={11} /> : <Lock size={11} />}
                  </IconButton>
                  <IconButton
                    size="sm"
                    variant="danger"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete level "${level.name}"?`)) onDeleteLevel(level.id);
                    }}
                  >
                    <Trash2 size={11} />
                  </IconButton>
                </div>
                <div className="space-y-1 pl-4">
                  {level.sceneIds.length === 0 && (
                    <span className="text-[10px] text-text-muted">No scenes attached</span>
                  )}
                  {level.sceneIds.map((sceneId) => (
                    <div
                      key={sceneId}
                      className="flex items-center gap-1 rounded-[8px] bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-text-secondary"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {sceneId.replace(".scene.json", "")}
                      </span>
                      <button
                        type="button"
                        className="text-text-muted hover:text-error"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveScene(level.id, sceneId);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <Select
                    className="h-[24px] text-[10px]"
                    value=""
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      if (e.target.value) onAssignScene(level.id, e.target.value);
                    }}
                  >
                    <option value="">Attach scene…</option>
                    {scenes
                      .filter((s) => !level.sceneIds.includes(s))
                      .map((sceneId) => (
                        <option key={sceneId} value={sceneId}>
                          {sceneId.replace(".scene.json", "")}
                        </option>
                      ))}
                  </Select>
                </div>
              </div>
            );
          })
        )}
      </PanelBody>
    </Panel>
  );
}
