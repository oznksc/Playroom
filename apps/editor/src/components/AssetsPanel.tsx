import type { GameKitAsset } from "@gamekit/schema";
import { ImagePlus, Trash2, Search, Upload, FileImage } from "lucide-react";
import { useRef, useState } from "react";
import { getApiUrl } from "../lib/api.js";
import { Button, Input, EmptyState, IconButton, Badge, cn } from "@/ui";

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
  onImport,
}: AssetsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAssets = assets.filter((asset) =>
    asset.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      <div className="flex shrink-0 items-center gap-2 p-2">
        <div className="search-field min-w-0 flex-1">
          <Search size={12} />
          <Input
            type="search"
            placeholder="Search assets…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button size="md" variant="solid" onClick={() => fileInputRef.current?.click()}>
          <Upload size={13} /> Import
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) onImport(file);
            event.currentTarget.value = "";
          }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-2">
        {filteredAssets.length === 0 ? (
          <EmptyState
            icon={<ImagePlus size={18} />}
            title={searchQuery ? "No matches" : "No assets"}
            description={
              searchQuery
                ? "No assets match this search."
                : "Import PNG, JPG, WebP, or SVG assets."
            }
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
            {filteredAssets.map((asset) => {
              const active = asset.id === selectedAssetId;
              return (
                <div
                  key={asset.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectAsset(asset.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectAsset(asset.id);
                    }
                  }}
                  className={cn(
                    "group cursor-pointer overflow-hidden rounded-[12px] border transition-colors",
                    active
                      ? "border-accent bg-white/[0.08] shadow-[0_0_0_0.5px_rgba(0,240,255,0.35)]"
                      : "border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08]"
                  )}
                >
                  <div className="relative flex aspect-square items-center justify-center bg-black/25">
                    <img
                      src={getApiUrl(`/gamekit/assets/${asset.file}`)}
                      alt=""
                      className="max-h-full max-w-full object-contain p-1"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const fallback = e.currentTarget.parentElement?.querySelector(
                          ".asset-fallback-icon"
                        );
                        if (fallback) (fallback as HTMLElement).style.display = "flex";
                      }}
                    />
                    <div className="asset-fallback-icon absolute inset-0 hidden items-center justify-center text-text-muted">
                      <FileImage size={22} />
                    </div>
                    <Badge variant="muted" className="absolute left-1 top-1">
                      IMAGE
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-1">
                    <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-text-secondary">
                      {asset.id}
                    </span>
                    <IconButton
                      size="sm"
                      variant="danger"
                      className="opacity-0 group-hover:opacity-100"
                      title="Delete asset"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete asset "${asset.id}"?`)) onDeleteAsset(asset.id);
                      }}
                    >
                      <Trash2 size={11} />
                    </IconButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
