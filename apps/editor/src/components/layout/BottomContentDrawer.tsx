import type { GameKitScene } from "@gamekit/schema";
import { Folder, Wand2, Clock3, Terminal, X } from "lucide-react";
import { cn } from "@/ui";
import shellStyles from "../AppShell.module.css";
import sheetStyles from "../SheetChrome.module.css";
import { AssetsPanel } from "../AssetsPanel.js";
import { AssetStudioModal } from "../AssetStudioModal.js";
import { TimelinePanel } from "../TimelinePanel.js";
import { ConsolePanel, type ConsoleLog } from "../ConsolePanel.js";
import type { ProjectSnapshot } from "../../types.js";

export type BottomTab = "assets" | "studio" | "timeline" | "console";

export interface BottomContentDrawerProps {
  scene: GameKitScene | undefined;
  bottomDrawerCollapsed: boolean;
  setBottomDrawerCollapsed: (collapsed: boolean) => void;
  activeBottomTab: BottomTab;
  setActiveBottomTab: (tab: BottomTab) => void;
  snapshot: ProjectSnapshot;
  selectedAssetId: string | undefined;
  setSelectedAssetId: (id: string | undefined) => void;
  selectedEntityId: string | undefined;
  currentSceneFile: string;
  logs: ConsoleLog[];
  setLogs: React.Dispatch<React.SetStateAction<ConsoleLog[]>>;
  deleteAsset: (id: string) => Promise<void>;
  importAsset: (file: File) => Promise<void>;
  openContent: (tab?: BottomTab) => void;
  refresh: () => Promise<void>;
  setError: (err: unknown) => void;
  executeConsoleCommand: (cmdStr: string) => void;
  updateScene: (mutator: (draft: GameKitScene) => void) => void;
  handleSpawnEntityWithSprite: (assetId: string, width: number, height: number, category?: string) => void;
  handleSpawnEntityWithAnimation: (
    assetId: string,
    frameWidth: number,
    frameHeight: number,
    totalFrames: number,
    fps: number
  ) => void;
  handleAttachAudioToEntity: (assetId: string, isBgm?: boolean) => void;
  showTimeline?: boolean;
  showConsole?: boolean;
}

export function BottomContentDrawer({
  scene,
  bottomDrawerCollapsed,
  setBottomDrawerCollapsed,
  activeBottomTab,
  setActiveBottomTab,
  snapshot,
  selectedAssetId,
  setSelectedAssetId,
  selectedEntityId,
  currentSceneFile,
  logs,
  setLogs,
  deleteAsset,
  importAsset,
  openContent,
  refresh,
  setError,
  executeConsoleCommand,
  updateScene,
  handleSpawnEntityWithSprite,
  handleSpawnEntityWithAnimation,
  handleAttachAudioToEntity,
  showTimeline = true,
  showConsole = true,
}: BottomContentDrawerProps) {
  if (!scene) return null;

  return (
    <section
      className={cn(
        shellStyles["bottom-sheet"],
        !bottomDrawerCollapsed && shellStyles.open,
        activeBottomTab === "studio" && shellStyles["studio-view"],
      )}
      aria-hidden={bottomDrawerCollapsed}
      aria-label="Content browser"
    >
      <div className={sheetStyles["bottom-sheet-handle"]} aria-hidden />
      <div className={sheetStyles["bottom-sheet-header"]}>
        {showTimeline || showConsole ? (
          <div className={shellStyles["bottom-sheet-tabs"]}>
            {(
              [
                ["assets", "Content", <Folder key="i" size={13} strokeWidth={1.75} />] as const,
                ["studio", "Studio", <Wand2 key="i" size={13} strokeWidth={1.75} />] as const,
                ...(showTimeline
                  ? ([["timeline", "Timeline", <Clock3 key="i" size={13} strokeWidth={1.75} />]] as const)
                  : []),
                ...(showConsole
                  ? ([["console", "Console", <Terminal key="i" size={13} strokeWidth={1.75} />]] as const)
                  : []),
              ] as const
            ).map(([id, label, icon]) => (
              <button
                key={id}
                type="button"
                className={cn(shellStyles["bottom-sheet-tab"], activeBottomTab === id && shellStyles.active)}
                onClick={() => setActiveBottomTab(id as BottomTab)}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        ) : (
          <h2 className={sheetStyles["bottom-sheet-title"]}>
            <Folder size={14} strokeWidth={1.75} />
            Content
            <span>{snapshot.assets.length} assets</span>
          </h2>
        )}
        <button
          type="button"
          className={shellStyles["bottom-sheet-close"]}
          title="Close"
          aria-label="Close content drawer"
          onClick={() => setBottomDrawerCollapsed(true)}
        >
          <X size={16} strokeWidth={1.75} />
        </button>
      </div>
      <div className={shellStyles["drawer-content-box"]}>
        <div key={activeBottomTab} className={shellStyles["drawer-tab-pane"]}>
          {activeBottomTab === "assets" && (
            <AssetsPanel
              assets={snapshot.assets}
              selectedAssetId={selectedAssetId}
              onSelectAsset={setSelectedAssetId}
              onDeleteAsset={(id) => deleteAsset(id).catch(setError)}
              onImport={(file) => importAsset(file).catch(setError)}
              onOpenAssetStudio={() => openContent("studio")}
            />
          )}
          {activeBottomTab === "studio" && (
            <AssetStudioModal
              embedded
              isOpen
              onClose={() => setActiveBottomTab("assets")}
              onAssetCreated={async (asset) => {
                setSelectedAssetId(asset.id);
                await refresh();
              }}
              onSpawnEntityWithSprite={handleSpawnEntityWithSprite}
              onSpawnEntityWithAnimation={handleSpawnEntityWithAnimation}
              onAttachAudioToEntity={handleAttachAudioToEntity}
              selectedEntityId={selectedEntityId}
              activeSceneId={currentSceneFile}
            />
          )}
          {showTimeline && activeBottomTab === "timeline" && (
            <TimelinePanel scene={scene} onChange={updateScene} />
          )}
          {showConsole && activeBottomTab === "console" && (
            <ConsolePanel
              logs={logs}
              onExecuteCommand={executeConsoleCommand}
              onClearLogs={() => setLogs([])}
            />
          )}
        </div>
      </div>
    </section>
  );
}
