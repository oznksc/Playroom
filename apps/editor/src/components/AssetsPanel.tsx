import type { GameKitAsset } from "@gamekit/schema";
import { ImagePlus, Trash2, Search, Upload, FileImage } from "lucide-react";
import { useRef, useState } from "react";

type AssetsPanelProps = {
  assets: GameKitAsset[];
  selectedAssetId?: string;
  onSelectAsset: (id: string) => void;
  onDeleteAsset: (id: string) => void;
  onImport: (file: File) => void;
};

export function AssetsPanel({
  assets,
  selectedAssetId,
  onSelectAsset,
  onDeleteAsset,
  onImport
}: AssetsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAssets = assets.filter((asset) =>
    asset.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="assets-panel">
      <div className="assets-toolbar">
        <div className="assets-search-wrapper">
          <Search size={13} className="search-icon" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => fileInputRef.current?.click()}
          title="Import raw assets (PNG, JPG, SVG)"
        >
          <Upload size={13} />
          <span>Import Asset</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) {
              onImport(file);
            }
            event.currentTarget.value = "";
          }}
          style={{ display: "none" }}
        />
      </div>

      <div className="assets-grid-container">
        {filteredAssets.length === 0 ? (
          <div className="assets-empty">
            <ImagePlus size={32} />
            <p>{searchQuery ? "No assets match search query" : "Drag & drop files or click 'Import Asset' to load assets"}</p>
          </div>
        ) : (
          <div className="assets-grid">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className={`asset-card ${asset.id === selectedAssetId ? "active" : ""}`}
                onClick={() => onSelectAsset(asset.id)}
              >
                <div className="asset-preview-box">
                  <img src={`/gamekit/assets/${asset.file}`} alt="" onError={(e) => {
                    // Fallback to placeholder icon if image fails
                    e.currentTarget.style.display = "none";
                    const fallback = e.currentTarget.parentElement?.querySelector(".asset-fallback-icon");
                    if (fallback) (fallback as HTMLElement).style.display = "flex";
                  }} />
                  <div className="asset-fallback-icon" style={{ display: "none" }}>
                    <FileImage size={24} />
                  </div>
                  <span className="asset-badge">IMAGE</span>
                </div>
                <div className="asset-card-details">
                  <span className="asset-card-name" title={asset.id}>{asset.id}</span>
                  <button
                    type="button"
                    className="asset-card-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Are you sure you want to delete asset "${asset.id}"?`)) {
                        onDeleteAsset(asset.id);
                      }
                    }}
                    title="Delete asset from project"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
