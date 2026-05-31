import type { GameKitAsset, GameKitEntity } from "@gamekit/schema";
import { Box, ImagePlus, Layers } from "lucide-react";

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
  selectedEntityId?: string;
  onSelectAsset: (id: string) => void;
  onSelectEntity: (id: string) => void;
};

export function Sidebar({
  assets,
  entities,
  selectedAssetId,
  selectedEntityId,
  onSelectAsset,
  onSelectEntity
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
          <button
            key={asset.id}
            type="button"
            className={asset.id === selectedAssetId ? "asset selected" : "asset"}
            onClick={() => onSelectAsset(asset.id)}
            title={asset.id}
          >
            <img src={`/gamekit/assets/${asset.file}`} alt="" />
            <span>{asset.id}</span>
          </button>
        ))}
      </div>

      <PanelTitle icon={<Layers size={14} />} label="Entities" />
      <div className="entityList">
        {entities.map((entity) => (
          <button
            key={entity.id}
            type="button"
            className={entity.id === selectedEntityId ? "entity selected" : "entity"}
            onClick={() => onSelectEntity(entity.id)}
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
