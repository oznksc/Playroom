import type {
  GameKitAsset,
  GameKitEntity,
  GameKitScene,
  GuiComponent,
  GuiComponentInstance,
  GuiNode,
} from "@gamekit/schema";
import { FloatingSheet } from "@/ui";
import { GuiInstanceInspector } from "../GuiInstanceInspector.js";
import { GuiInspector } from "../GuiInspector.js";
import { Inspector } from "../Inspector.js";

export interface RightInspectorSheetProps {
  inspectorOpen: boolean;
  selectedComponentInstanceId: string | null;
  selectedGuiNodeId: string | null;
  selectedEntityId: string | undefined;
  selectedEntity: GameKitEntity | undefined;
  selectedEntityIds: Set<string>;
  scene: GameKitScene | undefined;
  assets: GameKitAsset[];
  guiComponents: GuiComponent[];
  updateGuiComponentInstance: (mutator: (inst: GuiComponentInstance) => void) => void;
  deleteGuiComponentInstance: (id: string) => void;
  updateGuiNode: (mutator: (node: GuiNode) => void) => void;
  deleteGuiNode: (id: string) => void;
  updateScene: (mutator: (draft: GameKitScene) => void) => void;
  deleteEntity: (id: string) => void;
}

export function RightInspectorSheet({
  inspectorOpen,
  selectedComponentInstanceId,
  selectedGuiNodeId,
  selectedEntityId,
  selectedEntity,
  selectedEntityIds,
  scene,
  assets,
  guiComponents,
  updateGuiComponentInstance,
  deleteGuiComponentInstance,
  updateGuiNode,
  deleteGuiNode,
  updateScene,
  deleteEntity,
}: RightInspectorSheetProps) {
  return (
    <FloatingSheet side="right" open={inspectorOpen} role="dialog" aria-label="Inspector">
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <div
          key={
            selectedComponentInstanceId
              ? `comp-${selectedComponentInstanceId}`
              : selectedGuiNodeId
                ? `gui-${selectedGuiNodeId}`
                : `entity-${selectedEntityId ?? "none"}`
          }
          className="animate-sheet-panel relative flex h-full min-h-0 w-full flex-col"
        >
          {selectedComponentInstanceId && scene ? (
            <GuiInstanceInspector
              instance={scene.gui.componentInstances?.find(
                (i) => i.id === selectedComponentInstanceId
              )!}
              component={guiComponents.find(
                (c) =>
                  c.id ===
                  scene.gui.componentInstances?.find((i) => i.id === selectedComponentInstanceId)
                    ?.componentId
              )}
              assets={assets}
              onChange={updateGuiComponentInstance}
              onDelete={() => deleteGuiComponentInstance(selectedComponentInstanceId)}
            />
          ) : selectedGuiNodeId && scene ? (
            <GuiInspector
              node={scene.gui.nodes.find((n) => n.id === selectedGuiNodeId)}
              assets={assets}
              onChange={updateGuiNode}
              onDelete={() => deleteGuiNode(selectedGuiNodeId)}
            />
          ) : (
            <Inspector
              entity={selectedEntity}
              assets={assets}
              entityIds={scene?.entities.map((e) => e.id) ?? []}
              multiCount={selectedEntityIds.size}
              onChange={(mutator) =>
                updateScene((draft) => {
                  const entity = draft.entities.find(
                    (candidate) => candidate.id === selectedEntityId
                  );
                  if (entity) mutator(entity);
                })
              }
              onDelete={
                selectedEntityIds.size > 0
                  ? () => selectedEntityIds.forEach((id) => deleteEntity(id))
                  : undefined
              }
            />
          )}
        </div>
      </div>
    </FloatingSheet>
  );
}
