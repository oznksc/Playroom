import type { GameKitAsset, GameKitEntity } from "@gamekit/schema";
import { Box, ImagePlus, Layers, Trash2 } from "lucide-react";

function PanelTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <h2 className="panelTitle">
      {icon}
      {label}
    </h2>
  );
}

type SidebarProps = {
  assets: GameKitAsset[];
  entities: GameKitEntity[];
  selectedAssetId?: string;
  selectedEntityIds: Set<string>;
  onSelectAsset: (id: string) => void;
  onSelectEntity: (id: string, shift: boolean) => void;
  onDeleteAsset?: (id: string) => void;
};

export function Sidebar({
  assets,
  entities,
  selectedAssetId,
  selectedEntityIds,
  onSelectAsset,
  onSelectEntity,
  onDeleteAsset
}: SidebarProps) {
  return (
    <aside className="panel">
      <PanelTitle icon={<ImagePlus size={14} />} label="Assets" />
      <div className="assetGrid">
        {assets.length === 0 && (
          <div className="empty-state" style={{ gridColumn: "1 / -1" }}>
            <ImagePlus size={24} />
            <p>No assets yet</p>
          </div>
        )}
        {assets.map((asset) => (
          <div key={asset.id} className={asset.id === selectedAssetId ? "asset selected" : "asset"}>
            <button
              type="button"
              className="asset-thumb"
              onClick={() => onSelectAsset(asset.id)}
              title={asset.id}
            >
              <img src={`/gamekit/assets/${asset.file}`} alt="" />
            </button>
            <span className="asset-label">
              <span className="asset-name">{asset.id}</span>
              {onDeleteAsset && (
                <button
                  type="button"
                  className="icon-button danger asset-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete asset "${asset.id}"?`)) {
                      onDeleteAsset(asset.id);
                    }
                  }}
                  title="Delete asset"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </span>
          </div>
        ))}
      </div>

      <PanelTitle icon={<Layers size={14} />} label="Entities" />
      {selectedEntityIds.size > 1 && (
        <div className="multi-select-count">
          {selectedEntityIds.size} entities selected
        </div>
      )}
      <div className="entityList">
        {entities.map((entity) => (
          <button
            key={entity.id}
            type="button"
            className={selectedEntityIds.has(entity.id) ? "entity selected" : "entity"}
            onClick={(e) => onSelectEntity(entity.id, e.shiftKey)}
          >
            <span className="entity-icon">
              <Box size={12} />
            </span>
            {entity.name}
          </button>
        ))}
      </div>
    </aside>
  );
}