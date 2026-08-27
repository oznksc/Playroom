import type { GameKitEntity, GameKitLevel, GameKitScene, GuiNode, GameServicesDef } from "@gamekit/schema";
import { GameKitEntitySchema, findLevelForScene } from "@gamekit/schema";
import { cn } from "@/ui";
import shellStyles from "../AppShell.module.css";
import { Sidebar } from "../Sidebar.js";
import { ScenePanel } from "../ScenePanel.js";
import { PrefabPanel } from "../PrefabPanel.js";
import { AgentPanel } from "../AgentPanel.js";
import { SceneSettings } from "../SceneSettings.js";
import { LevelPanel } from "../LevelPanel.js";
import { GuiPanel } from "../GuiPanel.js";
import { GuiComponentPanel } from "../GuiComponentPanel.js";
import { RecipesPanel } from "../RecipesPanel.js";
import { GameServicesPanel } from "../GameServicesPanel.js";
import type { SidebarTabId } from "../SidebarRail.js";
import type { ProjectSnapshot } from "../../types.js";
import type { ConsoleLog } from "../ConsolePanel.js";

export interface LeftSidebarSheetProps {
  sidebarOpen: boolean;
  activeTab: SidebarTabId;
  agentExpanded: boolean;
  setAgentExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setInspectorOpen: (open: boolean) => void;
  setAgentSettingsOpen: (open: boolean) => void;
  // Project & scene
  snapshot: ProjectSnapshot;
  currentSceneFile: string;
  setCurrentSceneFile: (file: string) => void;
  scene: GameKitScene | undefined;
  updateScene: (mutator: (draft: GameKitScene) => void) => void;
  refresh: () => Promise<void>;
  setStatus: (status: string) => void;
  addConsoleLog: (type: ConsoleLog["type"], message: string) => void;
  activateScene: (file: string) => void;
  handleCreateScene: (name: string) => void;
  handleDeleteScene: (sceneId: string) => void;
  normalizeSceneFile: (id: string) => string;
  sceneFileMatches: (a: string, b: string) => boolean;
  // Entities
  selectedEntityIds: Set<string>;
  setSelectedEntityIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedEntityId: string | undefined;
  selectedEntity: GameKitEntity | undefined;
  clipboardRef: React.MutableRefObject<GameKitEntity | null>;
  deleteEntity: (id: string) => void;
  duplicateEntity: (id: string) => void;
  pasteEntity: (source: GameKitEntity) => void;
  saveEntityAsPrefab: (id: string) => Promise<void>;
  addEntity: () => void;
  addTemplateEntity: (templateType: "empty" | "sprite" | "collider" | "player" | "camera") => void;
  // Simulation
  isPlaying: boolean;
  // Levels
  showLevels?: boolean;
  handleCreateLevel: (name: string) => void;
  handleDeleteLevel: (levelId: string) => void;
  handleToggleUnlockLevel: (levelId: string) => void;
  handleReorderLevels: (levels: GameKitLevel[]) => void;
  handleAssignSceneToLevel: (levelId: string, sceneId: string) => void;
  handleRemoveSceneFromLevel: (levelId: string, sceneId: string) => void;
  handleUpdateLevel: (levelId: string, patch: Partial<GameKitLevel>) => void;
  // GUI
  showGuiTools?: boolean;
  selectedGuiNodeId: string | null;
  setSelectedGuiNodeId: (id: string | null) => void;
  setSelectedComponentInstanceId: (id: string | null) => void;
  addGuiNode: (type: GuiNode["type"]) => void;
  deleteGuiNode: (id: string) => void;
  editingComponentId: string | null;
  setEditingComponentId: (id: string | null) => void;
  addGuiComponent: (name: string) => void;
  deleteGuiComponent: (componentId: string) => void;
  addNodeToEditingComponent: (type: GuiNode["type"]) => void;
  deleteNodeFromEditingComponent: (nodeId: string) => void;
  addGuiComponentInstance: (componentId: string) => void;
  // Game Services
  gameServices?: GameServicesDef;
  onUpdateGameServices?: (def: GameServicesDef) => Promise<void>;
}

export function LeftSidebarSheet({
  sidebarOpen,
  activeTab,
  agentExpanded,
  setAgentExpanded,
  setInspectorOpen,
  setAgentSettingsOpen,
  gameServices,
  onUpdateGameServices,
  snapshot,
  currentSceneFile,
  setCurrentSceneFile,
  scene,
  updateScene,
  refresh,
  setStatus,
  addConsoleLog,
  activateScene,
  handleCreateScene,
  handleDeleteScene,
  normalizeSceneFile,
  sceneFileMatches,
  selectedEntityIds,
  setSelectedEntityIds,
  selectedEntityId,
  selectedEntity,
  clipboardRef,
  deleteEntity,
  duplicateEntity,
  pasteEntity,
  saveEntityAsPrefab,
  addEntity,
  addTemplateEntity,
  isPlaying,
  showLevels = true,
  handleCreateLevel,
  handleDeleteLevel,
  handleToggleUnlockLevel,
  handleReorderLevels,
  handleAssignSceneToLevel,
  handleRemoveSceneFromLevel,
  handleUpdateLevel,
  showGuiTools = true,
  selectedGuiNodeId,
  setSelectedGuiNodeId,
  setSelectedComponentInstanceId,
  addGuiNode,
  deleteGuiNode,
  editingComponentId,
  setEditingComponentId,
  addGuiComponent,
  deleteGuiComponent,
  addNodeToEditingComponent,
  deleteNodeFromEditingComponent,
  addGuiComponentInstance,
}: LeftSidebarSheetProps) {
  return (
    <div
      className={cn(
        shellStyles["float-sheet-left"],
        sidebarOpen && shellStyles.open,
        sidebarOpen && activeTab === "agent" && agentExpanded && shellStyles.expanded,
      )}
      role="dialog"
      aria-label="Workspace panel"
    >
      <div className={shellStyles["sidebar-content"]}>
        <div key={activeTab} className={shellStyles["sheet-panel-pane"]}>
          {activeTab === "entities" && (
            <Sidebar
              entities={scene?.entities ?? []}
              selectedEntityIds={selectedEntityIds}
              onSelectEntity={(id, shift) => {
                setSelectedEntityIds((prev) => {
                  const next = new Set(shift ? prev : undefined);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                });
              }}
              onDeleteEntity={(id) => deleteEntity(id)}
              onCopyEntity={(id) => {
                const entity = scene?.entities.find((e) => e.id === id);
                if (entity) clipboardRef.current = GameKitEntitySchema.parse(structuredClone(entity));
              }}
              onCutEntity={(id) => {
                const entity = scene?.entities.find((e) => e.id === id);
                if (entity) {
                  clipboardRef.current = GameKitEntitySchema.parse(structuredClone(entity));
                  deleteEntity(id);
                }
              }}
              onPasteEntity={() => {
                const entity = clipboardRef.current;
                if (entity) pasteEntity(entity);
              }}
              onDuplicateEntity={(id) => duplicateEntity(id)}
              onSaveAsPrefab={(id) => void saveEntityAsPrefab(id)}
              onAddEntity={addEntity}
              onAddTemplate={addTemplateEntity}
            />
          )}
          {activeTab === "scenes" && (
            <ScenePanel
              scenes={snapshot.scenes}
              currentSceneId={currentSceneFile}
              onSelectScene={(file) => activateScene(file)}
              onCreateScene={handleCreateScene}
              onDeleteScene={handleDeleteScene}
            />
          )}
          {activeTab === "prefabs" && (
            <PrefabPanel
              sceneFile={currentSceneFile}
              selectedEntityId={selectedEntityId}
              selectedEntityName={selectedEntity?.name}
              onInstantiated={() => {
                refresh().catch((e) => setStatus(e instanceof Error ? e.message : "Refresh failed"));
              }}
              onStatus={(message) => {
                setStatus(message);
                addConsoleLog(
                  message.toLowerCase().includes("fail") || message.toLowerCase().includes("select")
                    ? message.toLowerCase().includes("fail")
                      ? "error"
                      : "warn"
                    : "system",
                  message
                );
              }}
            />
          )}
          {activeTab === "agent" && (
            <AgentPanel
              sceneId={currentSceneFile}
              isPlaying={isPlaying}
              expanded={agentExpanded}
              onToggleExpand={() => {
                setAgentExpanded((prev) => {
                  const next = !prev;
                  localStorage.setItem("gamekit:agent:expanded", next ? "1" : "0");
                  if (next) setInspectorOpen(false);
                  return next;
                });
              }}
              onSettings={() => setAgentSettingsOpen(true)}
              onSceneMutated={() => {
                if (!isPlaying) {
                  refresh().catch((e) => setStatus(e instanceof Error ? e.message : "Refresh failed"));
                }
              }}
            />
          )}
          {activeTab === "world" && scene && (
            <SceneSettings scene={scene} onChange={updateScene} />
          )}
          {activeTab === "world" && !scene && (
            <div className="flex h-full items-center justify-center p-4 text-center text-[12px] text-text-muted">
              Load a scene to edit world settings.
            </div>
          )}
          {showLevels && activeTab === "levels" && (
            <LevelPanel
              levels={snapshot.levels}
              scenes={snapshot.scenes}
              currentLevelId={findLevelForScene(snapshot.levels, currentSceneFile)?.id ?? null}
              onSelectLevel={(levelId) => {
                const level = snapshot.levels.find((l) => l.id === levelId);
                if (!level) return;
                const raw = level.sceneIds[0];
                if (!raw) {
                  addConsoleLog("warn", `Level "${level.name}" has no scenes attached.`);
                  return;
                }
                const file = normalizeSceneFile(raw);
                if (!snapshot.scenes.some((s) => sceneFileMatches(s, file))) {
                  addConsoleLog(
                    "error",
                    `Level scene "${file}" not found. Attach a valid scene file first.`
                  );
                  setStatus(`Scene not found: ${file}`);
                  return;
                }
                setCurrentSceneFile(file);
              }}
              onCreateLevel={handleCreateLevel}
              onDeleteLevel={handleDeleteLevel}
              onToggleUnlock={handleToggleUnlockLevel}
              onReorderLevels={handleReorderLevels}
              onAssignScene={handleAssignSceneToLevel}
              onRemoveScene={handleRemoveSceneFromLevel}
              onUpdateLevel={handleUpdateLevel}
            />
          )}
          {showGuiTools && activeTab === "guis" && (
            <GuiPanel
              nodes={scene?.gui?.nodes ?? []}
              selectedGuiNodeId={selectedGuiNodeId}
              onSelectNode={(id) => {
                setSelectedGuiNodeId(id);
                setSelectedEntityIds(new Set());
                setSelectedComponentInstanceId(null);
              }}
              onAddNode={addGuiNode}
              onDeleteNode={deleteGuiNode}
            />
          )}
          {showGuiTools && activeTab === "components" && (
            <GuiComponentPanel
              components={snapshot.guiComponents}
              editingComponentId={editingComponentId}
              onAddComponent={addGuiComponent}
              onDeleteComponent={deleteGuiComponent}
              onStartEdit={setEditingComponentId}
              onStopEdit={() => setEditingComponentId(null)}
              onAddNodeToComponent={addNodeToEditingComponent}
              onDeleteNodeFromComponent={deleteNodeFromEditingComponent}
              onPlaceInstance={addGuiComponentInstance}
            />
          )}
          {activeTab === "recipes" && (
            <RecipesPanel
              scenePath={currentSceneFile}
              selectedEntityId={selectedEntityId ?? null}
              selectedEntityName={selectedEntity?.name}
              onApplied={() => {
                refresh().catch((e) => setStatus(e instanceof Error ? e.message : "Refresh failed"));
              }}
              onStatus={(message) => {
                setStatus(message);
                addConsoleLog("system", message);
              }}
            />
          )}
          {activeTab === "services" && onUpdateGameServices && (
            <GameServicesPanel
              gameServices={gameServices ?? snapshot.project?.gameServices}
              onUpdateGameServices={onUpdateGameServices}
            />
          )}
        </div>
      </div>
    </div>
  );
}
