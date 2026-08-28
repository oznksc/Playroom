import type { GameKitScene } from "@gamekit/schema";
import { Folder, Wand2, Clock3, Terminal, X } from "lucide-react";
import { IconButton, Tabs, TabsList, TabsTrigger, TabsContent, Badge, cn } from "@/ui";
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
      <Tabs
        value={activeBottomTab}
        onValueChange={(tab) => setActiveBottomTab(tab as BottomTab)}
        className="flex h-full min-h-0 flex-col"
      >
        <div className={sheetStyles["bottom-sheet-header"]}>
          {showTimeline || showConsole ? (
            <TabsList size="sm">
              <TabsTrigger
                value="assets"
                icon={<Folder size={13} strokeWidth={1.75} />}
                badge={snapshot.assets.length}
              >
                Content
              </TabsTrigger>
              <TabsTrigger
                value="studio"
                icon={<Wand2 size={13} strokeWidth={1.75} className="text-accent" />}
              >
                Studio
              </TabsTrigger>
              {showTimeline && (
                <TabsTrigger
                  value="timeline"
                  icon={<Clock3 size={13} strokeWidth={1.75} />}
                >
                  Timeline
                </TabsTrigger>
              )}
              {showConsole && (
                <TabsTrigger
                  value="console"
                  icon={<Terminal size={13} strokeWidth={1.75} />}
                  badge={logs.length > 0 ? logs.length : undefined}
                >
                  Console
                </TabsTrigger>
              )}
            </TabsList>
          ) : (
            <div className="flex items-center gap-2">
              <Folder size={14} className="text-accent" />
              <span className="text-xs font-semibold text-text-primary">Content</span>
              <Badge variant="muted" className="font-mono text-[9px]">
                {snapshot.assets.length}
              </Badge>
            </div>
          )}
          <IconButton
            size="sm"
            variant="ghost"
            title="Close content drawer"
            aria-label="Close content drawer"
            onClick={() => setBottomDrawerCollapsed(true)}
            className="ml-auto text-text-muted hover:text-text-primary"
          >
            <X size={14} strokeWidth={1.75} />
          </IconButton>
        </div>
        <div className={shellStyles["drawer-content-box"]}>
          <TabsContent value="assets" className={shellStyles["drawer-tab-pane"]}>
            <AssetsPanel
              assets={snapshot.assets}
              selectedAssetId={selectedAssetId}
              onSelectAsset={setSelectedAssetId}
              onDeleteAsset={(id) => deleteAsset(id).catch(setError)}
              onImport={(file) => importAsset(file).catch(setError)}
              onOpenAssetStudio={() => openContent("studio")}
            />
          </TabsContent>
          <TabsContent value="studio" className={shellStyles["drawer-tab-pane"]}>
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
          </TabsContent>
          {showTimeline && (
            <TabsContent value="timeline" className={shellStyles["drawer-tab-pane"]}>
              <TimelinePanel scene={scene} onChange={updateScene} />
            </TabsContent>
          )}
          {showConsole && (
            <TabsContent value="console" className={shellStyles["drawer-tab-pane"]}>
              <ConsolePanel
                logs={logs}
                onExecuteCommand={executeConsoleCommand}
                onClearLogs={() => setLogs([])}
              />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </section>
  );
}
