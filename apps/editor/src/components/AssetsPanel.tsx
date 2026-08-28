import type { GameKitAsset } from "@gamekit/schema";
import { ImagePlus, Trash2, Search, Upload, FileImage, Sparkles, Volume2, Music, Type, Play, Pause } from "lucide-react";
import { useRef, useState } from "react";
import { getApiUrl } from "../lib/api.js";
import { Button, Input, EmptyState, IconButton, Badge, cn } from "@/ui";

type AssetsPanelProps = {
  assets: GameKitAsset[];
  selectedAssetId?: string;
  onSelectAsset: (id: string) => void;
  onDeleteAsset: (id: string) => void;
  onImport: (file: File) => void;
  onOpenAssetStudio?: () => void;
};

export function AssetsPanel({
  assets,
  selectedAssetId,
  onSelectAsset,
  onDeleteAsset,
  onImport,
  onOpenAssetStudio,
}: AssetsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const filteredAssets = assets.filter((asset) =>
    asset.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function handlePlayAudio(asset: GameKitAsset, e: React.MouseEvent) {
    e.stopPropagation();
    if (playingAudioId === asset.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const sound = new Audio(getApiUrl(`/gamekit/assets/${asset.file}`));
      audioPlayerRef.current = sound;
      sound.onended = () => setPlayingAudioId(null);
      sound.play().catch(() => setPlayingAudioId(null));
      setPlayingAudioId(asset.id);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.04] px-3 py-2">
        <div className="search-field min-w-0 flex-1">
          <Search size={12} />
          <Input
            type="search"
            placeholder="Search assets…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 text-xs"
          />
        </div>

        {onOpenAssetStudio && (
          <Button
            size="sm"
            variant="solid"
            leftIcon={<Sparkles size={13} className="text-accent" />}
            onClick={onOpenAssetStudio}
          >
            Studio
          </Button>
        )}

        <Button
          size="sm"
          variant="secondary"
          leftIcon={<Upload size={13} />}
          onClick={() => fileInputRef.current?.click()}
        >
          Import
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,audio/wav,audio/mp3,audio/ogg"
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
                : "Generate sprites, SFX, and music with Asset Studio or import files."
            }
          />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
            {filteredAssets.map((asset) => {
              const active = asset.id === selectedAssetId;
              const isAudio = asset.kind === "audio" || asset.file.endsWith(".wav") || asset.file.endsWith(".mp3") || asset.file.endsWith(".ogg");
              const isFont = asset.kind === "font" || asset.file.endsWith(".ttf") || asset.file.endsWith(".otf");
              const isPlaying = playingAudioId === asset.id;

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
                    {isAudio ? (
                      <div className="flex flex-col items-center justify-center gap-1.5 w-full h-full p-2">
                        <div
                          onClick={(e) => handlePlayAudio(asset, e)}
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer",
                            isPlaying
                              ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/30 scale-110"
                              : "bg-white/[0.08] text-yellow-400 hover:bg-yellow-500/20 hover:scale-105"
                          )}
                          title={isPlaying ? "Pause Sound" : "Play Sound"}
                        >
                          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                        </div>
                        <Badge variant="muted" className="absolute left-1 top-1 text-[8px] bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                          AUDIO
                        </Badge>
                      </div>
                    ) : isFont ? (
                      <div className="flex flex-col items-center justify-center text-text-muted">
                        <Type size={26} />
                        <Badge variant="muted" className="absolute left-1 top-1 text-[8px]">
                          FONT
                        </Badge>
                      </div>
                    ) : (
                      <>
                        <img
                          src={getApiUrl(`/gamekit/assets/${asset.file}`)}
                          alt=""
                          className="max-h-full max-w-full object-contain p-1 [image-rendering:pixelated]"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback = e.currentTarget.parentElement?.querySelector(
                              "[data-asset-fallback]"
                            );
                            if (fallback) (fallback as HTMLElement).style.display = "flex";
                          }}
                        />
                        <div data-asset-fallback className="absolute inset-0 hidden items-center justify-center text-text-muted">
                          <FileImage size={22} />
                        </div>
                        <Badge variant="muted" className="absolute left-1 top-1 text-[8px]">
                          IMAGE
                        </Badge>
                      </>
                    )}
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
