import type {
  AabbColliderComponent,
  CameraFollowComponent,
  CircleColliderComponent,
  PolygonColliderComponent,
  GameKitAsset,
  GameKitEntity,
  PlayerControllerComponent,
  RigidBodyComponent,
  SpriteComponent,
  TransformComponent,
  TilemapComponent,
  ParticleSystemComponent,
  TextComponent,
  AudioSourceComponent,
  AudioListenerComponent,
  TweenComponent,
  FollowPathComponent,
  StateMachineComponent,
  ScriptComponent
} from "@gamekit/schema";
import {
  Box,
  Circle,
  ImagePlus,
  Trash2,
  Plus,
  Gamepad2,
  Video,
  FolderOpen,
  Focus,
  Type,
  Volume2,
  Headphones,
  Move,
  Route,
  GitBranch,
  Code2,
  Sparkles,
  Grid3x3,
} from "lucide-react";
import { useState } from "react";
import { findComponent } from "../lib/components.js";
import { getApiUrl } from "../lib/api.js";
import {
  NumberField,
  IconButton,
  Select,
  Button,
  EmptyState,
  AccordionSection,
  CheckboxField,
  ColorField,
  Input,
  Textarea,
} from "@/ui";

const MVP_SHOW_ADVANCED_PHYSICS = true;

type InspectorProps = {
  entity?: GameKitEntity;
  assets: GameKitAsset[];
  entityIds: string[];
  multiCount: number;
  onChange: (mutator: (entity: GameKitEntity) => void) => void;
  onDelete?: () => void;
};

export function Inspector({
  entity,
  assets,
  entityIds,
  multiCount,
  onChange,
  onDelete
}: InspectorProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    Transform: false,
    Sprite: false,
    Collider: false,
    CircleCollider: true,
    Player: false,
    RigidBody: true,
    Camera: false,
    Tilemap: false,
    Text: false,
    AudioSource: true,
    AudioListener: true,
    Tween: true,
    FollowPath: true,
    StateMachine: true,
    Script: true,
    ParticleSystem: true,
  });

  const [selectedCompToAdd, setSelectedCompToAdd] = useState("");

  const transform = entity ? findComponent<TransformComponent>(entity, "Transform") : undefined;
  const sprite = entity ? findComponent<SpriteComponent>(entity, "Sprite") : undefined;
  const collider = entity ? findComponent<AabbColliderComponent>(entity, "AabbCollider") : undefined;
  const circleCollider = entity ? findComponent<CircleColliderComponent>(entity, "CircleCollider") : undefined;
  const polygonCollider = entity ? findComponent<PolygonColliderComponent>(entity, "PolygonCollider") : undefined;
  const player = entity ? findComponent<PlayerControllerComponent>(entity, "PlayerController") : undefined;
  const rigidBody = entity ? findComponent<RigidBodyComponent>(entity, "RigidBody") : undefined;
  const camera = entity ? findComponent<CameraFollowComponent>(entity, "CameraFollow") : undefined;
  const tilemap = entity ? findComponent<TilemapComponent>(entity, "Tilemap") : undefined;
  const textComp = entity ? findComponent<TextComponent>(entity, "Text") : undefined;
  const audioSource = entity ? findComponent<AudioSourceComponent>(entity, "AudioSource") : undefined;
  const audioListener = entity ? findComponent<AudioListenerComponent>(entity, "AudioListener") : undefined;
  const tween = entity ? findComponent<TweenComponent>(entity, "Tween") : undefined;
  const followPath = entity ? findComponent<FollowPathComponent>(entity, "FollowPath") : undefined;
  const stateMachine = entity ? findComponent<StateMachineComponent>(entity, "StateMachine") : undefined;
  const script = entity ? findComponent<ScriptComponent>(entity, "Script") : undefined;
  const particleSystem = entity ? findComponent<ParticleSystemComponent>(entity, "ParticleSystem") : undefined;

  function toggleCollapse(comp: string) {
    setCollapsed((prev) => ({ ...prev, [comp]: !prev[comp] }));
  }

  function handleAddComponent(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (!val) return;

    onChange((draft) => {
      if (val === "Sprite") {
        const assetId = assets[0]?.id ?? "";
        draft.components.push({
          type: "Sprite",
          assetId,
          width: 64,
          height: 64,
          anchor: { x: 0.5, y: 0.5 }
        });
      } else       if (val === "AabbCollider") {
        draft.components.push({
          type: "AabbCollider",
          offset: { x: -32, y: -32 },
          size: { x: 64, y: 64 },
          isStatic: false
        });
      } else if (val === "CircleCollider") {
          draft.components.push({
            type: "CircleCollider",
            offset: { x: 0, y: 0 },
            radius: 24,
            isStatic: false,
            isTrigger: false,
            layer: 1,
            mask: 1,
          });
      } else if (val === "PolygonCollider") {
          draft.components.push({
            type: "PolygonCollider",
            offset: { x: 0, y: 0 },
            points: [
              { x: -16, y: -16 },
              { x: 16, y: -16 },
              { x: 16, y: 16 },
              { x: -16, y: 16 },
            ],
            isStatic: false,
            layer: 1,
            mask: 1,
          });
      } else if (val === "PlayerController") {
        draft.components.push({
          type: "PlayerController",
          speed: 300,
          jumpVelocity: 600,
          gravity: 1800
        });
      } else if (val === "RigidBody") {
        draft.components.push({
          type: "RigidBody",
          velocity: { x: 0, y: 0 },
          angularVelocity: 0,
          mass: 1,
          drag: 0,
          isKinematic: false,
          gravityScale: 1,
          useGravity: true
        });
      } else if (val === "CameraFollow") {
        draft.components.push({
          type: "CameraFollow",
          targetId: draft.id,
          smoothing: 0.18
        });
      } else if (val === "Tilemap") {
        const tilesetId = assets.find((a) => a.kind === "image")?.id ?? "";
        draft.components.push({
          type: "Tilemap",
          tilesetId,
          tileWidth: 32,
          tileHeight: 32,
          columns: 8,
          gridWidth: 10,
          gridHeight: 10,
          tiles: new Array(100).fill(0)
        });
      } else if (val === "Text") {
        const fontAssetId = assets.find((a) => a.kind === "font")?.id ?? "default";
        draft.components.push({
          type: "Text",
          text: "Hello World",
          fontAssetId,
          size: 24,
          color: "#ffffff",
          align: "left"
        });
      } else if (val === "AudioSource") {
        const assetId = assets.find((a) => a.kind === "audio")?.id ?? "";
        draft.components.push({
          type: "AudioSource",
          assetId,
          volume: 1.0,
          loop: false,
          playOnStart: true
        });
      } else if (val === "AudioListener") {
        draft.components.push({
          type: "AudioListener",
          enabled: true
        });
      } else if (val === "Tween") {
        draft.components.push({
          type: "Tween",
          property: "position.x",
          startValue: 0,
          endValue: 100,
          duration: 1.0,
          easing: "linear",
          loop: true,
          pingPong: true
        });
      } else if (val === "FollowPath") {
        draft.components.push({
          type: "FollowPath",
          points: [],
          speed: 100,
          loop: true
        });
      } else if (val === "StateMachine") {
        draft.components.push({
          type: "StateMachine",
          initialState: "idle",
          states: [{ name: "idle" }]
        });
      } else if (val === "Script") {
        draft.components.push({
          type: "Script",
          handlers: []
        });
      } else if (val === "ParticleSystem") {
        draft.components.push({
          type: "ParticleSystem",
          maxParticles: 40,
          emissionRate: 18,
          lifetime: 0.9,
          speed: 70,
          gravityScale: 0.35,
          colorStart: "#00f0ff",
          colorEnd: "#8b5cf6",
          sizeStart: 5,
          sizeEnd: 0,
          shape: "point",
          width: 0,
          height: 0,
          active: true,
        });
      }
    });

    setSelectedCompToAdd("");
    setCollapsed((prev) => {
      const keyMap: Record<string, string> = {
        AabbCollider: "Collider",
        CircleCollider: "CircleCollider",
        PolygonCollider: "PolygonCollider",
        PlayerController: "Player",
        RigidBody: "RigidBody",
        CameraFollow: "Camera",
        ParticleSystem: "ParticleSystem",
      };
      return { ...prev, [keyMap[val] ?? val]: false };
    });
  }

  // Determine what components can still be added
  const missingComponents = [];
  if (entity) {
    if (!sprite) missingComponents.push({ val: "Sprite", label: "Sprite Renderer" });
    if (!tilemap) missingComponents.push({ val: "Tilemap", label: "Tilemap Renderer" });
    if (!textComp) missingComponents.push({ val: "Text", label: "Text Label" });
    if (!collider) missingComponents.push({ val: "AabbCollider", label: "Box Collider 2D" });
    if (MVP_SHOW_ADVANCED_PHYSICS && !circleCollider) missingComponents.push({ val: "CircleCollider", label: "Circle Collider 2D" });
    if (MVP_SHOW_ADVANCED_PHYSICS && !polygonCollider) missingComponents.push({ val: "PolygonCollider", label: "Polygon Collider 2D" });
    if (!player) missingComponents.push({ val: "PlayerController", label: "Player Controller" });
    if (MVP_SHOW_ADVANCED_PHYSICS && !rigidBody) missingComponents.push({ val: "RigidBody", label: "RigidBody 2D" });
    if (!camera) missingComponents.push({ val: "CameraFollow", label: "Camera Follow" });
    if (!audioSource) missingComponents.push({ val: "AudioSource", label: "Audio Source" });
    if (!audioListener) missingComponents.push({ val: "AudioListener", label: "Audio Listener" });
    if (!tween) missingComponents.push({ val: "Tween", label: "Tween Animation" });
    if (!followPath) missingComponents.push({ val: "FollowPath", label: "Path Follower" });
    if (!stateMachine) missingComponents.push({ val: "StateMachine", label: "FSM State Machine" });
    if (!script) missingComponents.push({ val: "Script", label: "Behavior Script" });
    if (!particleSystem) missingComponents.push({ val: "ParticleSystem", label: "Particle System" });
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      {entity && transform ? (
        <>
          {/* Inspector Header: Entity name & actions */}
          <div className="flex h-[42px] shrink-0 items-center justify-between gap-2 px-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <input
                type="text"
                className="w-full rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-[13px] font-bold text-text-primary outline-none hover:border-border-strong hover:bg-bg-elevated focus:border-accent focus:bg-bg-elevated"
                value={entity.name}
                onChange={(e) => onChange((draft) => {
                  draft.name = e.target.value;
                })}
                placeholder="Entity Name"
                title="Double click to rename entity"
              />
              <span className="font-mono text-[9px] tracking-wide text-text-muted">{entity.id.slice(0, 8)}</span>
            </div>
            {onDelete && (
              <IconButton size="sm" variant="danger" onClick={onDelete} title="Delete entity">
                <Trash2 size={13} />
              </IconButton>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-1.5 overflow-auto p-2">
            {/* Transform — Always Present */}
                        <AccordionSection
              icon={<Circle size={12} />}
              label="Transform"
              open={!collapsed.Transform}
              onToggle={() => toggleCollapse("Transform")}
              accent="purple"
            >
              <div className="grid grid-cols-2 gap-1.5">
                                    <NumberField
                                      label="X"
                                      value={transform.position.x}
                                      onChange={(value) => onChange((draft) => {
                                        findComponent<TransformComponent>(draft, "Transform")!.position.x = value;
                                      })}
                                    />
                                    <NumberField
                                      label="Y"
                                      value={transform.position.y}
                                      onChange={(value) => onChange((draft) => {
                                        findComponent<TransformComponent>(draft, "Transform")!.position.y = value;
                                      })}
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <NumberField
                                      label="Scale X"
                                      value={transform.scale.x}
                                      onChange={(value) => onChange((draft) => {
                                        findComponent<TransformComponent>(draft, "Transform")!.scale.x = value;
                                      })}
                                    />
                                    <NumberField
                                      label="Scale Y"
                                      value={transform.scale.y}
                                      onChange={(value) => onChange((draft) => {
                                        findComponent<TransformComponent>(draft, "Transform")!.scale.y = value;
                                      })}
                                    />
                                  </div>
                                  <div className="grid grid-cols-1 gap-1.5">
                                    <NumberField
                                      label="Rotation"
                                      value={transform.rotation}
                                      onChange={(value) => onChange((draft) => {
                                        findComponent<TransformComponent>(draft, "Transform")!.rotation = value;
                                      })}
                                    />
                                  </div>
            </AccordionSection>

            {/* Sprite Component */}
                        <AccordionSection
              icon={<ImagePlus size={12} />}
              label="Sprite Renderer"
              open={!collapsed.Sprite}
              onToggle={() => toggleCollapse("Sprite")}
              removable={!!sprite}
              onRemove={() => onChange((draft) => {
                draft.components = draft.components.filter((c) => c.type !== "Sprite");
              })}
              accent="cyan"
            >
              {sprite ? (
                <>
                  {/* Dynamic Visual Preview! */}
                                    <div className="mb-2 flex items-center gap-2">
                                      {assets.find(a => a.id === sprite.assetId) ? (
                                        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border-default bg-bg-base">
                                          <img src={getApiUrl(`/gamekit/assets/${assets.find(a => a.id === sprite.assetId)?.file}`)} alt="" />
                                        </div>
                                      ) : (
                                        <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border-default bg-bg-base text-text-muted">
                                          <FolderOpen size={16} />
                                        </div>
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-text-muted">Asset Ref</label>
                                        <select className="h-[26px] w-full rounded-md border border-border-default bg-bg-base px-2 text-[12px] outline-none focus:border-accent"
                                          value={sprite.assetId}
                                          onChange={(event) => onChange((draft) => {
                                            findComponent<SpriteComponent>(draft, "Sprite")!.assetId = event.target.value;
                                          })}
                                        >
                                          {assets.map((asset) => (
                                            <option key={asset.id} value={asset.id}>{asset.id}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5" style={{ marginTop: 10 }}>
                                      <div className="grid grid-cols-2 gap-1.5">
                                        <NumberField
                                          label="Width"
                                          value={sprite.width}
                                          onChange={(value) => onChange((draft) => {
                                            findComponent<SpriteComponent>(draft, "Sprite")!.width = value;
                                          })}
                                        />
                                        <NumberField
                                          label="Height"
                                          value={sprite.height}
                                          onChange={(value) => onChange((draft) => {
                                            findComponent<SpriteComponent>(draft, "Sprite")!.height = value;
                                          })}
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-1.5">
                                        <NumberField
                                          label="Anchor X"
                                          value={sprite.anchor.x}
                                          onChange={(value) => onChange((draft) => {
                                            findComponent<SpriteComponent>(draft, "Sprite")!.anchor.x = value;
                                          })}
                                        />
                                        <NumberField
                                          label="Anchor Y"
                                          value={sprite.anchor.y}
                                          onChange={(value) => onChange((draft) => {
                                            findComponent<SpriteComponent>(draft, "Sprite")!.anchor.y = value;
                                          })}
                                        />
                                      </div>
                                    </div>
                </>
              ) : (
                <p className="text-center text-[10px] text-text-muted">Sprite Renderer missing on this entity</p>
              )}
            </AccordionSection>

            {/* Collider Component */}
                        <AccordionSection
              icon={<Box size={12} />}
              label="Box Collider 2D"
              open={!collapsed.Collider}
              onToggle={() => toggleCollapse("Collider")}
              removable={!!collider}
              onRemove={() => onChange((draft) => {
                draft.components = draft.components.filter((c) => c.type !== "AabbCollider");
              })}
              accent="green"
            >
              {collider ? (
                <>
                  <div className="grid grid-cols-2 gap-1.5">
                                        <NumberField
                                          label="Width"
                                          value={collider.size.x}
                                          onChange={(value) => onChange((draft) => {
                                            findComponent<AabbColliderComponent>(draft, "AabbCollider")!.size.x = value;
                                          })}
                                        />
                                        <NumberField
                                          label="Height"
                                          value={collider.size.y}
                                          onChange={(value) => onChange((draft) => {
                                            findComponent<AabbColliderComponent>(draft, "AabbCollider")!.size.y = value;
                                          })}
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-1.5">
                                        <NumberField
                                          label="Offset X"
                                          value={collider.offset.x}
                                          onChange={(value) => onChange((draft) => {
                                            findComponent<AabbColliderComponent>(draft, "AabbCollider")!.offset.x = value;
                                          })}
                                        />
                                        <NumberField
                                          label="Offset Y"
                                          value={collider.offset.y}
                                          onChange={(value) => onChange((draft) => {
                                            findComponent<AabbColliderComponent>(draft, "AabbCollider")!.offset.y = value;
                                          })}
                                        />
                                      </div>
                                      {MVP_SHOW_ADVANCED_PHYSICS && (
                                        <div className="grid grid-cols-2 gap-1.5">
                                          <NumberField
                                            label="Layer"
                                            value={collider.layer ?? 1}
                                            onChange={(value) => onChange((draft) => {
                                              findComponent<AabbColliderComponent>(draft, "AabbCollider")!.layer = value;
                                            })}
                                          />
                                          <NumberField
                                            label="Mask"
                                            value={collider.mask ?? 1}
                                            onChange={(value) => onChange((draft) => {
                                              findComponent<AabbColliderComponent>(draft, "AabbCollider")!.mask = value;
                                            })}
                                          />
                                        </div>
                                      )}
                                      <div className="flex items-center gap-2 py-0.5 text-[11px] text-text-secondary">
                                        <input
                                          id="collider-static-check"
                                          type="checkbox" className="size-3.5 accent-accent"
                                          checked={collider.isStatic}
                                          onChange={(event) => onChange((draft) => {
                                            findComponent<AabbColliderComponent>(draft, "AabbCollider")!.isStatic = event.target.checked;
                                          })}
                                        />
                                         <label htmlFor="collider-static-check">Static collider</label>
                                       </div>
                                       <div className="flex items-center gap-2 py-0.5 text-[11px] text-text-secondary">
                                         <input
                                           id="collider-trigger-check"
                                           type="checkbox" className="size-3.5 accent-accent"
                                           checked={collider.isTrigger ?? false}
                                           onChange={(event) => onChange((draft) => {
                                             findComponent<AabbColliderComponent>(draft, "AabbCollider")!.isTrigger = event.target.checked;
                                           })}
                                         />
                                         <label htmlFor="collider-trigger-check">Is Trigger (Overlap only)</label>
                                       </div>
                </>
              ) : (
                <p className="text-center text-[10px] text-text-muted">No Box Collider attached</p>
              )}
            </AccordionSection>

            {MVP_SHOW_ADVANCED_PHYSICS && (
                          <AccordionSection
              icon={<Circle size={12} />}
              label="Circle Collider 2D"
              open={!collapsed.CircleCollider}
              onToggle={() => toggleCollapse("CircleCollider")}
              removable={!!circleCollider}
              onRemove={() => onChange((draft) => {
                draft.components = draft.components.filter((c) => c.type !== "CircleCollider");
              })}
              accent="green"
            >
              {circleCollider ? (
                <>
                  <div className="grid grid-cols-1 gap-1.5">
                                          <NumberField
                                            label="Radius"
                                            value={circleCollider.radius}
                                            onChange={(value) => onChange((draft) => {
                                              findComponent<CircleColliderComponent>(draft, "CircleCollider")!.radius = value;
                                            })}
                                          />
                                        </div>
                                        <div className="grid grid-cols-2 gap-1.5">
                                          <NumberField
                                            label="Offset X"
                                            value={circleCollider.offset.x}
                                            onChange={(value) => onChange((draft) => {
                                              findComponent<CircleColliderComponent>(draft, "CircleCollider")!.offset.x = value;
                                            })}
                                          />
                                          <NumberField
                                            label="Offset Y"
                                            value={circleCollider.offset.y}
                                            onChange={(value) => onChange((draft) => {
                                              findComponent<CircleColliderComponent>(draft, "CircleCollider")!.offset.y = value;
                                            })}
                                          />
                                        </div>
                                        <div className="grid grid-cols-2 gap-1.5">
                                          <NumberField
                                            label="Layer"
                                            value={circleCollider.layer ?? 1}
                                            onChange={(value) => onChange((draft) => {
                                              findComponent<CircleColliderComponent>(draft, "CircleCollider")!.layer = value;
                                            })}
                                          />
                                          <NumberField
                                            label="Mask"
                                            value={circleCollider.mask ?? 1}
                                            onChange={(value) => onChange((draft) => {
                                              findComponent<CircleColliderComponent>(draft, "CircleCollider")!.mask = value;
                                            })}
                                          />
                                        </div>
                                        <div className="flex items-center gap-2 py-0.5 text-[11px] text-text-secondary">
                                          <input
                                            id="circle-collider-static-check"
                                            type="checkbox" className="size-3.5 accent-accent"
                                            checked={circleCollider.isStatic}
                                            onChange={(event) => onChange((draft) => {
                                              findComponent<CircleColliderComponent>(draft, "CircleCollider")!.isStatic = event.target.checked;
                                            })}
                                          />
                                          <label htmlFor="circle-collider-static-check">Is Static (Rigid obstacle)</label>
                                        </div>
                                        <div className="flex items-center gap-2 py-0.5 text-[11px] text-text-secondary">
                                          <input
                                            id="circle-collider-trigger-check"
                                            type="checkbox" className="size-3.5 accent-accent"
                                            checked={circleCollider.isTrigger}
                                            onChange={(event) => onChange((draft) => {
                                              findComponent<CircleColliderComponent>(draft, "CircleCollider")!.isTrigger = event.target.checked;
                                            })}
                                          />
                                          <label htmlFor="circle-collider-trigger-check">Is Trigger (Overlap only)</label>
                                        </div>
                </>
              ) : (
                <p className="text-center text-[10px] text-text-muted">No Circle Collider attached</p>
              )}
            </AccordionSection>
            )}

            {/* PolygonCollider Component */}
            {MVP_SHOW_ADVANCED_PHYSICS && (
                          <AccordionSection
              icon={<Route size={12} />}
              label="Polygon Collider 2D"
              open={!collapsed.PolygonCollider}
              onToggle={() => toggleCollapse("PolygonCollider")}
              removable={!!polygonCollider}
              onRemove={() => onChange((draft) => {
                draft.components = draft.components.filter((c) => c.type !== "PolygonCollider");
              })}
              accent="green"
            >
              {polygonCollider ? (
                <>
                  <div className="grid grid-cols-2 gap-1.5">
                                          <NumberField
                                            label="Offset X"
                                            value={polygonCollider.offset.x}
                                            onChange={(value) => onChange((draft) => {
                                              findComponent<PolygonColliderComponent>(draft, "PolygonCollider")!.offset.x = value;
                                            })}
                                          />
                                          <NumberField
                                            label="Offset Y"
                                            value={polygonCollider.offset.y}
                                            onChange={(value) => onChange((draft) => {
                                              findComponent<PolygonColliderComponent>(draft, "PolygonCollider")!.offset.y = value;
                                            })}
                                          />
                                        </div>
                                        <div className="grid grid-cols-2 gap-1.5">
                                          <NumberField
                                            label="Layer"
                                            value={polygonCollider.layer ?? 1}
                                            onChange={(value) => onChange((draft) => {
                                              findComponent<PolygonColliderComponent>(draft, "PolygonCollider")!.layer = value;
                                            })}
                                          />
                                          <NumberField
                                            label="Mask"
                                            value={polygonCollider.mask ?? 1}
                                            onChange={(value) => onChange((draft) => {
                                              findComponent<PolygonColliderComponent>(draft, "PolygonCollider")!.mask = value;
                                            })}
                                          />
                                        </div>
                                        <div className="flex items-center gap-2 py-0.5 text-[11px] text-text-secondary">
                                          <input
                                            id="polygon-collider-static-check"
                                            type="checkbox" className="size-3.5 accent-accent"
                                            checked={polygonCollider.isStatic}
                                            onChange={(event) => onChange((draft) => {
                                              findComponent<PolygonColliderComponent>(draft, "PolygonCollider")!.isStatic = event.target.checked;
                                            })}
                                          />
                                          <label htmlFor="polygon-collider-static-check">Is Static (Rigid obstacle)</label>
                                        </div>
                                        <div className="flex items-center gap-2 py-0.5 text-[11px] text-text-secondary">
                                          <input
                                            id="polygon-collider-trigger-check"
                                            type="checkbox" className="size-3.5 accent-accent"
                                            checked={polygonCollider.isTrigger ?? false}
                                            onChange={(event) => onChange((draft) => {
                                              findComponent<PolygonColliderComponent>(draft, "PolygonCollider")!.isTrigger = event.target.checked;
                                            })}
                                          />
                                          <label htmlFor="polygon-collider-trigger-check">Is Trigger (Overlap only)</label>
                                        </div>
                                        <div className="text-[10px] text-text-muted">
                                          {polygonCollider.points.length} point{polygonCollider.points.length !== 1 ? "s" : ""} — draw on canvas to edit
                                        </div>
                </>
              ) : (
                <p className="text-center text-[10px] text-text-muted">No Polygon Collider attached</p>
              )}
            </AccordionSection>
            )}

            {/* RigidBody Component */}
            {MVP_SHOW_ADVANCED_PHYSICS && (
                          <AccordionSection
              icon={<Box size={12} />}
              label="RigidBody 2D"
              open={!collapsed.RigidBody}
              onToggle={() => toggleCollapse("RigidBody")}
              removable={!!rigidBody}
              onRemove={() => onChange((draft) => {
                draft.components = draft.components.filter((c) => c.type !== "RigidBody");
              })}
              accent="gold"
            >
              {rigidBody ? (
                <>
                  <div className="grid grid-cols-2 gap-1.5">
                                          <NumberField
                                            label="Vel X"
                                            value={rigidBody.velocity.x}
                                            onChange={(value) => onChange((draft) => {
                                              findComponent<RigidBodyComponent>(draft, "RigidBody")!.velocity.x = value;
                                            })}
                                          />
                                          <NumberField
                                            label="Vel Y"
                                            value={rigidBody.velocity.y}
                                            onChange={(value) => onChange((draft) => {
                                              findComponent<RigidBodyComponent>(draft, "RigidBody")!.velocity.y = value;
                                            })}
                                          />
                                        </div>
                                        <div className="grid grid-cols-2 gap-1.5">
                                          <NumberField
                                            label="Mass"
                                            value={rigidBody.mass}
                                            onChange={(value) => onChange((draft) => {
                                              findComponent<RigidBodyComponent>(draft, "RigidBody")!.mass = value;
                                            })}
                                          />
                                          <NumberField
                                            label="Ang Vel"
                                            value={rigidBody.angularVelocity}
                                            onChange={(value) => onChange((draft) => {
                                              findComponent<RigidBodyComponent>(draft, "RigidBody")!.angularVelocity = value;
                                            })}
                                          />
                                        </div>
                                        <div className="grid grid-cols-2 gap-1.5">
                                          <NumberField
                                            label="Drag"
                                            value={rigidBody.drag}
                                            onChange={(value) => onChange((draft) => {
                                              findComponent<RigidBodyComponent>(draft, "RigidBody")!.drag = value;
                                            })}
                                          />
                                          <NumberField
                                            label="Gravity Scale"
                                            value={rigidBody.gravityScale}
                                            onChange={(value) => onChange((draft) => {
                                              findComponent<RigidBodyComponent>(draft, "RigidBody")!.gravityScale = value;
                                            })}
                                          />
                                        </div>
                                        <div className="flex items-center gap-2 py-0.5 text-[11px] text-text-secondary">
                                          <input
                                            id="rigid-body-kinematic-check"
                                            type="checkbox" className="size-3.5 accent-accent"
                                            checked={rigidBody.isKinematic}
                                            onChange={(event) => onChange((draft) => {
                                              findComponent<RigidBodyComponent>(draft, "RigidBody")!.isKinematic = event.target.checked;
                                            })}
                                          />
                                          <label htmlFor="rigid-body-kinematic-check">Is Kinematic</label>
                                        </div>
                                        <div className="flex items-center gap-2 py-0.5 text-[11px] text-text-secondary">
                                          <input
                                            id="rigid-body-gravity-check"
                                            type="checkbox" className="size-3.5 accent-accent"
                                            checked={rigidBody.useGravity}
                                            onChange={(event) => onChange((draft) => {
                                              findComponent<RigidBodyComponent>(draft, "RigidBody")!.useGravity = event.target.checked;
                                            })}
                                          />
                                          <label htmlFor="rigid-body-gravity-check">Use Gravity</label>
                                        </div>
                </>
              ) : (
                <p className="text-center text-[10px] text-text-muted">No RigidBody attached</p>
              )}
            </AccordionSection>
            )}

            {/* Player Controller Component */}
                        <AccordionSection
              icon={<Gamepad2 size={12} />}
              label="Player Controller"
              open={!collapsed.Player}
              onToggle={() => toggleCollapse("Player")}
              removable={!!player}
              onRemove={() => onChange((draft) => {
                draft.components = draft.components.filter((c) => c.type !== "PlayerController");
              })}
              accent="gold"
            >
              {player ? (
                <>
                  <div className="grid grid-cols-2 gap-1.5">
                                        <NumberField
                                          label="Speed"
                                          value={player.speed}
                                          onChange={(value) => onChange((draft) => {
                                            findComponent<PlayerControllerComponent>(draft, "PlayerController")!.speed = value;
                                          })}
                                        />
                                        <NumberField
                                          label="Jump Vel"
                                          value={player.jumpVelocity}
                                          onChange={(value) => onChange((draft) => {
                                            findComponent<PlayerControllerComponent>(draft, "PlayerController")!.jumpVelocity = value;
                                          })}
                                        />
                                      </div>
                                      <div className="grid grid-cols-1 gap-1.5">
                                        <NumberField
                                          label="Gravity"
                                          value={player.gravity}
                                          onChange={(value) => onChange((draft) => {
                                            findComponent<PlayerControllerComponent>(draft, "PlayerController")!.gravity = value;
                                          })}
                                        />
                                      </div>
                </>
              ) : (
                <p className="text-center text-[10px] text-text-muted">Standard physics controller unassigned</p>
              )}
            </AccordionSection>

            <AccordionSection
              icon={<Video size={12} />}
              label="Camera Follow"
              open={!collapsed.Camera}
              onToggle={() => toggleCollapse("Camera")}
              removable={!!camera}
              onRemove={() =>
                onChange((draft) => {
                  draft.components = draft.components.filter((c) => c.type !== "CameraFollow");
                })
              }
              accent="cyan"
            >
              {camera ? (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                      Follow target
                    </span>
                    <Select
                      value={camera.targetId}
                      onChange={(event) =>
                        onChange((draft) => {
                          findComponent<CameraFollowComponent>(draft, "CameraFollow")!.targetId =
                            event.target.value;
                        })
                      }
                    >
                      <option value="">— Viewport center —</option>
                      {entityIds
                        .filter((id) => id !== entity?.id)
                        .map((id) => (
                          <option key={id} value={id}>
                            {id}
                          </option>
                        ))}
                    </Select>
                  </label>
                  <NumberField
                    label="Smoothing"
                    value={camera.smoothing}
                    onChange={(value) =>
                      onChange((draft) => {
                        findComponent<CameraFollowComponent>(draft, "CameraFollow")!.smoothing =
                          value;
                      })
                    }
                  />
                </>
              ) : (
                <p className="text-center text-[10px] text-text-muted">Camera targeting missing</p>
              )}
            </AccordionSection>

            <AccordionSection
              icon={<Grid3x3 size={12} />}
              label="Tilemap Renderer"
              open={!collapsed.Tilemap}
              onToggle={() => toggleCollapse("Tilemap")}
              removable={!!tilemap}
              onRemove={() =>
                onChange((draft) => {
                  draft.components = draft.components.filter((c) => c.type !== "Tilemap");
                })
              }
              accent="green"
            >
              {tilemap ? (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                      Tileset
                    </span>
                    <Select
                      value={tilemap.tilesetId}
                      onChange={(e) =>
                        onChange((draft) => {
                          findComponent<TilemapComponent>(draft, "Tilemap")!.tilesetId =
                            e.target.value;
                        })
                      }
                    >
                      <option value="">— Select asset —</option>
                      {assets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.id}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <NumberField
                      label="Tile W"
                      value={tilemap.tileWidth}
                      onChange={(v) =>
                        onChange((d) => {
                          findComponent<TilemapComponent>(d, "Tilemap")!.tileWidth = v;
                        })
                      }
                    />
                    <NumberField
                      label="Tile H"
                      value={tilemap.tileHeight}
                      onChange={(v) =>
                        onChange((d) => {
                          findComponent<TilemapComponent>(d, "Tilemap")!.tileHeight = v;
                        })
                      }
                    />
                    <NumberField
                      label="Columns"
                      value={tilemap.columns}
                      onChange={(v) =>
                        onChange((d) => {
                          findComponent<TilemapComponent>(d, "Tilemap")!.columns = Math.max(1, Math.floor(v));
                        })
                      }
                    />
                    <NumberField
                      label="Grid W"
                      value={tilemap.gridWidth}
                      onChange={(v) =>
                        onChange((d) => {
                          const tm = findComponent<TilemapComponent>(d, "Tilemap")!;
                          const w = Math.max(1, Math.floor(v));
                          const h = tm.gridHeight;
                          const next = new Array(w * h).fill(0);
                          for (let y = 0; y < h; y++) {
                            for (let x = 0; x < Math.min(w, tm.gridWidth); x++) {
                              const src = y * tm.gridWidth + x;
                              if (src < tm.tiles.length) next[y * w + x] = tm.tiles[src];
                            }
                          }
                          tm.gridWidth = w;
                          tm.tiles = next;
                        })
                      }
                    />
                    <NumberField
                      label="Grid H"
                      value={tilemap.gridHeight}
                      onChange={(v) =>
                        onChange((d) => {
                          const tm = findComponent<TilemapComponent>(d, "Tilemap")!;
                          const h = Math.max(1, Math.floor(v));
                          const w = tm.gridWidth;
                          const next = new Array(w * h).fill(0);
                          for (let y = 0; y < Math.min(h, tm.gridHeight); y++) {
                            for (let x = 0; x < w; x++) {
                              const src = y * tm.gridWidth + x;
                              if (src < tm.tiles.length) next[y * w + x] = tm.tiles[src];
                            }
                          }
                          tm.gridHeight = h;
                          tm.tiles = next;
                        })
                      }
                    />
                  </div>
                  <p className="m-0 font-mono text-[10px] text-text-muted">
                    {tilemap.tiles.length} cells · paint on canvas with brush tools
                  </p>
                </>
              ) : (
                <p className="text-center text-[10px] text-text-muted">No tilemap on this entity</p>
              )}
            </AccordionSection>

            <AccordionSection
              icon={<Type size={12} />}
              label="Text Label"
              open={!collapsed.Text}
              onToggle={() => toggleCollapse("Text")}
              removable={!!textComp}
              onRemove={() =>
                onChange((draft) => {
                  draft.components = draft.components.filter((c) => c.type !== "Text");
                })
              }
              accent="purple"
            >
              {textComp ? (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                      Text
                    </span>
                    <Input
                      value={textComp.text}
                      onChange={(e) =>
                        onChange((d) => {
                          findComponent<TextComponent>(d, "Text")!.text = e.target.value;
                        })
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                      Font asset
                    </span>
                    <Select
                      value={textComp.fontAssetId}
                      onChange={(e) =>
                        onChange((d) => {
                          findComponent<TextComponent>(d, "Text")!.fontAssetId = e.target.value;
                        })
                      }
                    >
                      <option value="default">default</option>
                      {assets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.id}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <NumberField
                    label="Size"
                    value={textComp.size}
                    onChange={(v) =>
                      onChange((d) => {
                        findComponent<TextComponent>(d, "Text")!.size = v;
                      })
                    }
                  />
                  <ColorField
                    label="Color"
                    value={textComp.color}
                    onChange={(v) =>
                      onChange((d) => {
                        findComponent<TextComponent>(d, "Text")!.color = v;
                      })
                    }
                  />
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                      Align
                    </span>
                    <Select
                      value={textComp.align}
                      onChange={(e) =>
                        onChange((d) => {
                          findComponent<TextComponent>(d, "Text")!.align = e.target
                            .value as TextComponent["align"];
                        })
                      }
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </Select>
                  </label>
                </>
              ) : (
                <p className="text-center text-[10px] text-text-muted">No text component</p>
              )}
            </AccordionSection>

            <AccordionSection
              icon={<Volume2 size={12} />}
              label="Audio Source"
              open={!collapsed.AudioSource}
              onToggle={() => toggleCollapse("AudioSource")}
              removable={!!audioSource}
              onRemove={() =>
                onChange((draft) => {
                  draft.components = draft.components.filter((c) => c.type !== "AudioSource");
                })
              }
              accent="gold"
            >
              {audioSource ? (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                      Asset
                    </span>
                    <Select
                      value={audioSource.assetId}
                      onChange={(e) =>
                        onChange((d) => {
                          findComponent<AudioSourceComponent>(d, "AudioSource")!.assetId =
                            e.target.value;
                        })
                      }
                    >
                      <option value="">— Select —</option>
                      {assets.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.id}
                        </option>
                      ))}
                    </Select>
                  </label>
                  <NumberField
                    label="Volume"
                    value={audioSource.volume}
                    onChange={(v) =>
                      onChange((d) => {
                        findComponent<AudioSourceComponent>(d, "AudioSource")!.volume = v;
                      })
                    }
                  />
                  <CheckboxField
                    label="Loop"
                    checked={audioSource.loop}
                    onChange={(checked) =>
                      onChange((d) => {
                        findComponent<AudioSourceComponent>(d, "AudioSource")!.loop = checked;
                      })
                    }
                  />
                  <CheckboxField
                    label="Play on start"
                    checked={audioSource.playOnStart}
                    onChange={(checked) =>
                      onChange((d) => {
                        findComponent<AudioSourceComponent>(d, "AudioSource")!.playOnStart =
                          checked;
                      })
                    }
                  />
                </>
              ) : (
                <p className="text-center text-[10px] text-text-muted">No audio source</p>
              )}
            </AccordionSection>

            <AccordionSection
              icon={<Headphones size={12} />}
              label="Audio Listener"
              open={!collapsed.AudioListener}
              onToggle={() => toggleCollapse("AudioListener")}
              removable={!!audioListener}
              onRemove={() =>
                onChange((draft) => {
                  draft.components = draft.components.filter((c) => c.type !== "AudioListener");
                })
              }
              accent="muted"
            >
              {audioListener ? (
                <CheckboxField
                  label="Enabled"
                  checked={audioListener.enabled}
                  onChange={(checked) =>
                    onChange((d) => {
                      findComponent<AudioListenerComponent>(d, "AudioListener")!.enabled = checked;
                    })
                  }
                />
              ) : (
                <p className="text-center text-[10px] text-text-muted">No audio listener</p>
              )}
            </AccordionSection>

            <AccordionSection
              icon={<Move size={12} />}
              label="Tween Animation"
              open={!collapsed.Tween}
              onToggle={() => toggleCollapse("Tween")}
              removable={!!tween}
              onRemove={() =>
                onChange((draft) => {
                  draft.components = draft.components.filter((c) => c.type !== "Tween");
                })
              }
              accent="cyan"
            >
              {tween ? (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                      Property
                    </span>
                    <Select
                      value={tween.property}
                      onChange={(e) =>
                        onChange((d) => {
                          findComponent<TweenComponent>(d, "Tween")!.property = e.target
                            .value as TweenComponent["property"];
                        })
                      }
                    >
                      <option value="position.x">position.x</option>
                      <option value="position.y">position.y</option>
                      <option value="rotation">rotation</option>
                      <option value="scale.x">scale.x</option>
                      <option value="scale.y">scale.y</option>
                    </Select>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <NumberField
                      label="Start"
                      value={tween.startValue}
                      onChange={(v) =>
                        onChange((d) => {
                          findComponent<TweenComponent>(d, "Tween")!.startValue = v;
                        })
                      }
                    />
                    <NumberField
                      label="End"
                      value={tween.endValue}
                      onChange={(v) =>
                        onChange((d) => {
                          findComponent<TweenComponent>(d, "Tween")!.endValue = v;
                        })
                      }
                    />
                    <NumberField
                      label="Duration"
                      value={tween.duration}
                      onChange={(v) =>
                        onChange((d) => {
                          findComponent<TweenComponent>(d, "Tween")!.duration = v;
                        })
                      }
                    />
                  </div>
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                      Easing
                    </span>
                    <Select
                      value={tween.easing}
                      onChange={(e) =>
                        onChange((d) => {
                          findComponent<TweenComponent>(d, "Tween")!.easing = e.target
                            .value as TweenComponent["easing"];
                        })
                      }
                    >
                      <option value="linear">Linear</option>
                      <option value="easeIn">Ease In</option>
                      <option value="easeOut">Ease Out</option>
                      <option value="easeInOut">Ease In Out</option>
                    </Select>
                  </label>
                  <CheckboxField
                    label="Loop"
                    checked={tween.loop}
                    onChange={(checked) =>
                      onChange((d) => {
                        findComponent<TweenComponent>(d, "Tween")!.loop = checked;
                      })
                    }
                  />
                  <CheckboxField
                    label="Ping pong"
                    checked={tween.pingPong}
                    onChange={(checked) =>
                      onChange((d) => {
                        findComponent<TweenComponent>(d, "Tween")!.pingPong = checked;
                      })
                    }
                  />
                </>
              ) : (
                <p className="text-center text-[10px] text-text-muted">No tween</p>
              )}
            </AccordionSection>

            <AccordionSection
              icon={<Route size={12} />}
              label="Path Follower"
              open={!collapsed.FollowPath}
              onToggle={() => toggleCollapse("FollowPath")}
              removable={!!followPath}
              onRemove={() =>
                onChange((draft) => {
                  draft.components = draft.components.filter((c) => c.type !== "FollowPath");
                })
              }
              accent="green"
            >
              {followPath ? (
                <>
                  <NumberField
                    label="Speed"
                    value={followPath.speed}
                    onChange={(v) =>
                      onChange((d) => {
                        findComponent<FollowPathComponent>(d, "FollowPath")!.speed = v;
                      })
                    }
                  />
                  <CheckboxField
                    label="Loop"
                    checked={followPath.loop}
                    onChange={(checked) =>
                      onChange((d) => {
                        findComponent<FollowPathComponent>(d, "FollowPath")!.loop = checked;
                      })
                    }
                  />
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                      Points JSON
                    </span>
                    <Textarea
                      className="min-h-[64px] font-mono text-[10px]"
                      value={JSON.stringify(followPath.points)}
                      onChange={(e) => {
                        try {
                          const points = JSON.parse(e.target.value) as { x: number; y: number }[];
                          if (!Array.isArray(points)) return;
                          onChange((d) => {
                            findComponent<FollowPathComponent>(d, "FollowPath")!.points = points;
                          });
                        } catch {
                          /* ignore partial JSON */
                        }
                      }}
                    />
                  </label>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      onChange((d) => {
                        findComponent<FollowPathComponent>(d, "FollowPath")!.points.push({
                          x: 0,
                          y: 0,
                        });
                      })
                    }
                  >
                    Add point
                  </Button>
                </>
              ) : (
                <p className="text-center text-[10px] text-text-muted">No path follower</p>
              )}
            </AccordionSection>

            <AccordionSection
              icon={<GitBranch size={12} />}
              label="FSM State Machine"
              open={!collapsed.StateMachine}
              onToggle={() => toggleCollapse("StateMachine")}
              removable={!!stateMachine}
              onRemove={() =>
                onChange((draft) => {
                  draft.components = draft.components.filter((c) => c.type !== "StateMachine");
                })
              }
              accent="purple"
            >
              {stateMachine ? (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                      Initial state
                    </span>
                    <Input
                      value={stateMachine.initialState}
                      onChange={(e) =>
                        onChange((d) => {
                          findComponent<StateMachineComponent>(d, "StateMachine")!.initialState =
                            e.target.value;
                        })
                      }
                    />
                  </label>
                  <div className="space-y-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                      States
                    </span>
                    {stateMachine.states.map((st, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <Input
                          value={st.name}
                          onChange={(e) =>
                            onChange((d) => {
                              const sm = findComponent<StateMachineComponent>(d, "StateMachine")!;
                              sm.states[i].name = e.target.value;
                            })
                          }
                        />
                        <IconButton
                          size="sm"
                          variant="danger"
                          title="Remove state"
                          onClick={() =>
                            onChange((d) => {
                              findComponent<StateMachineComponent>(d, "StateMachine")!.states.splice(
                                i,
                                1
                              );
                            })
                          }
                        >
                          <Trash2 size={11} />
                        </IconButton>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        onChange((d) => {
                          findComponent<StateMachineComponent>(d, "StateMachine")!.states.push({
                            name: `state_${stateMachine.states.length}`,
                          });
                        })
                      }
                    >
                      Add state
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-center text-[10px] text-text-muted">No state machine</p>
              )}
            </AccordionSection>

            <AccordionSection
              icon={<Code2 size={12} />}
              label="Behavior Script"
              open={!collapsed.Script}
              onToggle={() => toggleCollapse("Script")}
              removable={!!script}
              onRemove={() =>
                onChange((draft) => {
                  draft.components = draft.components.filter((c) => c.type !== "Script");
                })
              }
              accent="muted"
            >
              {script ? (
                <>
                  <p className="m-0 text-[10px] text-text-muted">
                    {script.handlers.length} handler(s). Events fire at runtime.
                  </p>
                  {script.handlers.map((h, i) => (
                    <div
                      key={i}
                      className="rounded-md border border-border-default bg-bg-base p-2 space-y-1.5"
                    >
                      <label className="flex flex-col gap-1">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                          Event
                        </span>
                        <Input
                          value={h.event}
                          onChange={(e) =>
                            onChange((d) => {
                              findComponent<ScriptComponent>(d, "Script")!.handlers[i].event =
                                e.target.value;
                            })
                          }
                          placeholder="onStart | onUpdate | onCollision…"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                          Actions JSON
                        </span>
                        <Textarea
                          className="min-h-[56px] font-mono text-[10px]"
                          value={JSON.stringify(h.actions, null, 0)}
                          onChange={(e) => {
                            try {
                              const actions = JSON.parse(e.target.value);
                              if (!Array.isArray(actions)) return;
                              onChange((d) => {
                                findComponent<ScriptComponent>(d, "Script")!.handlers[i].actions =
                                  actions;
                              });
                            } catch {
                              /* ignore */
                            }
                          }}
                        />
                      </label>
                      <IconButton
                        size="sm"
                        variant="danger"
                        title="Remove handler"
                        onClick={() =>
                          onChange((d) => {
                            findComponent<ScriptComponent>(d, "Script")!.handlers.splice(i, 1);
                          })
                        }
                      >
                        <Trash2 size={11} />
                      </IconButton>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      onChange((d) => {
                        findComponent<ScriptComponent>(d, "Script")!.handlers.push({
                          event: "onStart",
                          actions: [],
                        });
                      })
                    }
                  >
                    Add handler
                  </Button>
                </>
              ) : (
                <p className="text-center text-[10px] text-text-muted">No script</p>
              )}
            </AccordionSection>

            <AccordionSection
              icon={<Sparkles size={12} />}
              label="Particle System"
              open={!collapsed.ParticleSystem}
              onToggle={() => toggleCollapse("ParticleSystem")}
              removable={!!particleSystem}
              onRemove={() =>
                onChange((draft) => {
                  draft.components = draft.components.filter((c) => c.type !== "ParticleSystem");
                })
              }
              accent="gold"
            >
              {particleSystem ? (
                <>
                  <div className="grid grid-cols-2 gap-1.5">
                    <NumberField
                      label="Max"
                      value={particleSystem.maxParticles}
                      onChange={(v) =>
                        onChange((d) => {
                          findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.maxParticles =
                            v;
                        })
                      }
                    />
                    <NumberField
                      label="Rate"
                      value={particleSystem.emissionRate}
                      onChange={(v) =>
                        onChange((d) => {
                          findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.emissionRate =
                            v;
                        })
                      }
                    />
                    <NumberField
                      label="Life"
                      value={particleSystem.lifetime}
                      onChange={(v) =>
                        onChange((d) => {
                          findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.lifetime = v;
                        })
                      }
                    />
                    <NumberField
                      label="Speed"
                      value={particleSystem.speed}
                      onChange={(v) =>
                        onChange((d) => {
                          findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.speed = v;
                        })
                      }
                    />
                    <NumberField
                      label="Gravity"
                      value={particleSystem.gravityScale}
                      onChange={(v) =>
                        onChange((d) => {
                          findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.gravityScale =
                            v;
                        })
                      }
                    />
                    <NumberField
                      label="Size 0"
                      value={particleSystem.sizeStart}
                      onChange={(v) =>
                        onChange((d) => {
                          findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.sizeStart = v;
                        })
                      }
                    />
                    <NumberField
                      label="Size 1"
                      value={particleSystem.sizeEnd}
                      onChange={(v) =>
                        onChange((d) => {
                          findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.sizeEnd = v;
                        })
                      }
                    />
                    <NumberField
                      label="Box W"
                      value={particleSystem.width}
                      onChange={(v) =>
                        onChange((d) => {
                          findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.width = v;
                        })
                      }
                    />
                    <NumberField
                      label="Box H"
                      value={particleSystem.height}
                      onChange={(v) =>
                        onChange((d) => {
                          findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.height = v;
                        })
                      }
                    />
                  </div>
                  <ColorField
                    label="Start"
                    value={particleSystem.colorStart}
                    onChange={(v) =>
                      onChange((d) => {
                        findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.colorStart = v;
                      })
                    }
                  />
                  <ColorField
                    label="End"
                    value={particleSystem.colorEnd}
                    onChange={(v) =>
                      onChange((d) => {
                        findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.colorEnd = v;
                      })
                    }
                  />
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                      Shape
                    </span>
                    <Select
                      value={particleSystem.shape}
                      onChange={(e) =>
                        onChange((d) => {
                          findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.shape = e
                            .target.value as ParticleSystemComponent["shape"];
                        })
                      }
                    >
                      <option value="point">Point</option>
                      <option value="box">Box</option>
                    </Select>
                  </label>
                  <CheckboxField
                    label="Active"
                    checked={particleSystem.active}
                    onChange={(checked) =>
                      onChange((d) => {
                        findComponent<ParticleSystemComponent>(d, "ParticleSystem")!.active =
                          checked;
                      })
                    }
                  />
                </>
              ) : (
                <p className="text-center text-[10px] text-text-muted">No particle system</p>
              )}
            </AccordionSection>
          </div>

          {/* Component Adder Section */}
          {missingComponents.length > 0 && (
            <div className="shrink-0 p-2">
              <div className="flex items-center gap-2">
                <Plus size={13} className="shrink-0 text-accent" />
                <Select
                  value={selectedCompToAdd}
                  onChange={handleAddComponent}
                  title="Add new script or body component to entity"
                  className="min-w-0 flex-1"
                >
                  <option value="">Add Component...</option>
                  {missingComponents.map((comp) => (
                    <option key={comp.val} value={comp.val}>{comp.label}</option>
                  ))}
                </Select>
              </div>
            </div>
          )}
        </>
      ) : multiCount > 1 ? (
        <EmptyState
          icon={<Box size={16} />}
          title={`${multiCount} nodes selected`}
          description="Multi-edit is limited. Delete selection or pick a single entity."
          action={
            onDelete ? (
              <Button size="sm" variant="danger" onClick={onDelete}>
                Delete selection
              </Button>
            ) : undefined
          }
        />
      ) : (
        <EmptyState
          icon={<Focus size={16} />}
          title="No entity selected"
          description="Click an entity in the viewport or hierarchy to inspect properties."
        />
      )}
    </aside>
  );
}
