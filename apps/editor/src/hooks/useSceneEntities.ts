import { useState, useRef, useMemo, useCallback, type Dispatch, type SetStateAction } from "react";
import type { GameKitEntity, GameKitScene, TransformComponent } from "@gamekit/schema";
import { createEntity, GameKitEntitySchema, GameKitComponentSchema } from "@gamekit/schema";
import { findComponent } from "../lib/components.js";
import type { ProjectSnapshot } from "../types.js";
import type { ConsoleLog } from "../components/ConsolePanel.js";

export interface UseSceneEntitiesOptions {
  scene: GameKitScene | undefined;
  updateScene: (mutator: (draft: GameKitScene) => void) => void;
  selectedAssetId: string | undefined;
  snapshot: ProjectSnapshot;
  currentSceneFile: string;
  addConsoleLog: (type: ConsoleLog["type"], message: string) => void;
  setStatus: (status: string) => void;
  openPrefabs: () => void;
  clearGuiSelection: () => void;
}

export function useSceneEntities({
  scene,
  updateScene,
  selectedAssetId,
  snapshot,
  currentSceneFile,
  addConsoleLog,
  setStatus,
  openPrefabs,
  clearGuiSelection,
}: UseSceneEntitiesOptions) {
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set());
  const clipboardRef = useRef<GameKitEntity | null>(null);
  const selectedEntityIdsRef = useRef(selectedEntityIds);
  selectedEntityIdsRef.current = selectedEntityIds;

  const selectedEntityId = [...selectedEntityIds][0];
  const selectedEntity = useMemo(
    () => scene?.entities.find((candidate) => candidate.id === selectedEntityId),
    [scene?.entities, selectedEntityId]
  );

  const addEntity = useCallback(() => {
    updateScene((draft) => {
      const entity = createEntity("Entity", { x: 180, y: 240 });
      const assetId = selectedAssetId ?? snapshot.assets[0]?.id;
      if (assetId) {
        entity.components.push({
          type: "Sprite",
          assetId,
          width: 64,
          height: 64,
          anchor: { x: 0.5, y: 0.5 },
        });
      }
      entity.components.push({
        type: "AabbCollider",
        offset: { x: -32, y: -32 },
        size: { x: 64, y: 64 },
        isStatic: false,
      });
      draft.entities.push(entity);
      setSelectedEntityIds(new Set([entity.id]));
      clearGuiSelection();
      addConsoleLog("system", `Created standard entity ${entity.name}`);
    });
  }, [updateScene, selectedAssetId, snapshot.assets, clearGuiSelection, addConsoleLog]);

  const addTemplateEntity = useCallback(
    (templateType: "empty" | "sprite" | "collider" | "player" | "camera") => {
      updateScene((draft) => {
        const entity = createEntity(templateType.charAt(0).toUpperCase() + templateType.slice(1), {
          x: 180,
          y: 240,
        });
        if (templateType === "sprite" || templateType === "player") {
          const assetId = selectedAssetId ?? snapshot.assets[0]?.id;
          if (assetId) {
            entity.components.push(
              GameKitComponentSchema.parse({
                type: "Sprite",
                assetId,
                width: 64,
                height: 64,
                anchor: { x: 0.5, y: 0.5 },
              })
            );
          }
        }
        if (templateType === "collider" || templateType === "player") {
          entity.components.push(
            GameKitComponentSchema.parse({
              type: "AabbCollider",
              offset: { x: -32, y: -32 },
              size: { x: 64, y: 64 },
              isStatic: templateType === "collider",
            })
          );
        }
        if (templateType === "player") {
          entity.components.push(
            GameKitComponentSchema.parse({
              type: "PlayerController",
              speed: 320,
              jumpVelocity: 600,
              gravity: 1800,
            })
          );
        }
        if (templateType === "camera") {
          entity.components.push(
            GameKitComponentSchema.parse({
              type: "CameraFollow",
              targetId: entity.id,
              smoothing: 0.15,
            })
          );
        }
        draft.entities.push(entity);
        setSelectedEntityIds(new Set([entity.id]));
        clearGuiSelection();
        addConsoleLog(
          "system",
          `Added template entity: [${templateType.toUpperCase()}] ${entity.name}`
        );
      });
    },
    [updateScene, selectedAssetId, snapshot.assets, clearGuiSelection, addConsoleLog]
  );

  const handleSpawnEntityWithSprite = useCallback(
    (assetId: string, width: number, height: number, category?: string) => {
      updateScene((draft) => {
        const entity = createEntity(assetId, { x: 300, y: 200 });
        entity.components.push(
          GameKitComponentSchema.parse({
            type: "Sprite",
            assetId,
            width,
            height,
            anchor: { x: 0.5, y: 0.5 },
          })
        );
        if (
          category === "character" ||
          category === "enemy" ||
          category === "item" ||
          category === "tile"
        ) {
          entity.components.push(
            GameKitComponentSchema.parse({
              type: "AabbCollider",
              offset: { x: -width / 2, y: -height / 2 },
              size: { x: width, y: height },
              isStatic: category === "tile",
            })
          );
        }
        draft.entities.push(entity);
        setSelectedEntityIds(new Set([entity.id]));
        clearGuiSelection();
        addConsoleLog("system", `Spawned sprite entity "${entity.name}" in scene.`);
      });
    },
    [updateScene, clearGuiSelection, addConsoleLog]
  );

  const handleSpawnEntityWithAnimation = useCallback(
    (
      assetId: string,
      frameWidth: number,
      frameHeight: number,
      totalFrames: number,
      fps: number
    ) => {
      updateScene((draft) => {
        const entity = createEntity(assetId, { x: 300, y: 200 });
        entity.components.push(
          GameKitComponentSchema.parse({
            type: "Sprite",
            assetId,
            width: frameWidth,
            height: frameHeight,
            anchor: { x: 0.5, y: 0.5 },
          }),
          GameKitComponentSchema.parse({
            type: "Animation",
            assetId,
            frameWidth,
            frameHeight,
            totalFrames,
            framesPerSecond: fps,
            loop: true,
          }),
          GameKitComponentSchema.parse({
            type: "AabbCollider",
            offset: { x: -frameWidth / 2, y: -frameHeight / 2 },
            size: { x: frameWidth, y: frameHeight },
            isStatic: false,
          })
        );
        draft.entities.push(entity);
        setSelectedEntityIds(new Set([entity.id]));
        clearGuiSelection();
        addConsoleLog(
          "system",
          `Spawned animated character "${entity.name}" (${totalFrames} frames) in scene.`
        );
      });
    },
    [updateScene, clearGuiSelection, addConsoleLog]
  );

  const handleAttachAudioToEntity = useCallback(
    (assetId: string, isBgm?: boolean) => {
      updateScene((draft) => {
        if (isBgm) {
          let bgmEntity = draft.entities.find(
            (e) => e.id === "bgm-music" || e.name === "bgm-music"
          );
          if (!bgmEntity) {
            bgmEntity = createEntity("bgm-music", { x: 0, y: 0 });
            bgmEntity.components.push(
              GameKitComponentSchema.parse({
                type: "AudioSource",
                assetId,
                volume: 0.8,
                loop: true,
                playOnStart: true,
              })
            );
            draft.entities.push(bgmEntity);
          } else {
            bgmEntity.components = bgmEntity.components.filter((c) => c.type !== "AudioSource");
            bgmEntity.components.push(
              GameKitComponentSchema.parse({
                type: "AudioSource",
                assetId,
                volume: 0.8,
                loop: true,
                playOnStart: true,
              })
            );
          }
          addConsoleLog("system", `Set scene background music track to "${assetId}".`);
        } else if (selectedEntityId) {
          const entity = draft.entities.find((e) => e.id === selectedEntityId);
          if (entity) {
            entity.components = entity.components.filter((c) => c.type !== "AudioSource");
            entity.components.push(
              GameKitComponentSchema.parse({
                type: "AudioSource",
                assetId,
                volume: 1,
                loop: false,
                playOnStart: false,
              })
            );
            addConsoleLog("system", `Attached sound "${assetId}" to entity "${entity.name}".`);
          }
        }
      });
    },
    [updateScene, selectedEntityId, addConsoleLog]
  );

  const deleteEntity = useCallback(
    (id: string) => {
      updateScene((draft) => {
        const index = draft.entities.findIndex((e) => e.id === id);
        if (index === -1) return;
        const name = draft.entities[index].name;
        draft.entities.splice(index, 1);
        setSelectedEntityIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          if (next.size === 0) {
            const fallback = draft.entities[Math.min(index, draft.entities.length - 1)]?.id;
            if (fallback) next.add(fallback);
          }
          return next;
        });
        addConsoleLog("system", `Deleted entity ${name}`);
      });
    },
    [updateScene, addConsoleLog]
  );

  const pasteEntity = useCallback(
    (source: GameKitEntity) => {
      updateScene((draft) => {
        const clone = GameKitEntitySchema.parse(structuredClone(source));
        clone.id = crypto.randomUUID();
        clone.name = `${source.name} (copy)`;
        const transform = findComponent<TransformComponent>(clone, "Transform");
        if (transform) {
          transform.position.x += 32;
          transform.position.y += 32;
        }
        const sourceIndex = draft.entities.findIndex((e) => e.id === source.id);
        draft.entities.splice(sourceIndex + 1, 0, clone);
        clipboardRef.current = GameKitEntitySchema.parse(structuredClone(clone));
        setSelectedEntityIds(new Set([clone.id]));
        clearGuiSelection();
        addConsoleLog("system", `Duplicated entity to ${clone.name}`);
      });
    },
    [updateScene, clearGuiSelection, addConsoleLog]
  );

  const duplicateEntity = useCallback(
    (id: string) => {
      if (!scene) return;
      const source = scene.entities.find((e) => e.id === id);
      if (!source) return;
      pasteEntity(source);
    },
    [scene, pasteEntity]
  );

  const copyEntity = useCallback(
    (id: string) => {
      const entity = scene?.entities.find((e) => e.id === id);
      if (entity) clipboardRef.current = GameKitEntitySchema.parse(structuredClone(entity));
    },
    [scene?.entities]
  );

  const cutEntity = useCallback(
    (id: string) => {
      const entity = scene?.entities.find((e) => e.id === id);
      if (entity) {
        clipboardRef.current = GameKitEntitySchema.parse(structuredClone(entity));
        deleteEntity(id);
      }
    },
    [scene?.entities, deleteEntity]
  );

  const selectEntity = useCallback(
    (id: string, shift = false) => {
      clearGuiSelection();
      if (!id) {
        setSelectedEntityIds(new Set());
        return;
      }
      setSelectedEntityIds((prev) => {
        const next = new Set(shift ? prev : undefined);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [clearGuiSelection]
  );

  const selectAllEntities = useCallback(() => {
    if (!scene) return;
    clearGuiSelection();
    setSelectedEntityIds(new Set(scene.entities.map((e) => e.id)));
  }, [scene, clearGuiSelection]);

  const saveEntityAsPrefab = useCallback(
    async (entityId: string) => {
      try {
        const entity = scene?.entities.find((e) => e.id === entityId);
        const { createPrefabFromEntityApi } = await import("../components/PrefabPanel.js");
        const result = await createPrefabFromEntityApi({
          sceneFile: currentSceneFile,
          entityId,
          name: entity?.name,
        });
        setStatus(`Prefab saved: ${result.file}`);
        addConsoleLog("system", `Prefab saved: ${result.file}`);
        openPrefabs();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Create prefab failed";
        setStatus(msg);
        addConsoleLog("error", msg);
      }
    },
    [scene?.entities, currentSceneFile, setStatus, addConsoleLog, openPrefabs]
  );

  return {
    selectedEntityIds,
    setSelectedEntityIds,
    selectedEntityId,
    selectedEntity,
    clipboardRef,
    selectedEntityIdsRef,
    addEntity,
    addTemplateEntity,
    handleSpawnEntityWithSprite,
    handleSpawnEntityWithAnimation,
    handleAttachAudioToEntity,
    deleteEntity,
    duplicateEntity,
    pasteEntity,
    copyEntity,
    cutEntity,
    selectEntity,
    selectAllEntities,
    saveEntityAsPrefab,
  };
}
